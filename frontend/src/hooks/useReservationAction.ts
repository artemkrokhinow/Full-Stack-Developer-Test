import { useState, useCallback } from 'react';
import { api } from '../services/api';

export type ReservationState =
  | { phase: 'idle' }
  | { phase: 'reserving' }
  | { phase: 'polling' }
  | { phase: 'active'; reservation: { id: string; expiresAt: string } }
  | { phase: 'checking-out'; reservation: { id: string; expiresAt: string } }
  | { phase: 'done'; reservation: { id: string; expiresAt: string } }
  | { phase: 'error'; errorMessage: string; isRaceCondition: boolean };

export interface UseReservationActionReturn {
  state: ReservationState;
  reserve: (userId: string, productId: string, quantity: number) => Promise<void>;
  checkout: () => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE: ReservationState = { phase: 'idle' };

export function useReservationAction(
  onSuccess: () => void,
  onReserveSuccess?: () => void
): UseReservationActionReturn {
  const [state, setState] = useState<ReservationState>(INITIAL_STATE);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const reserve = useCallback(
    async (userId: string, productId: string, quantity: number) => {
      setState({ phase: 'reserving' });
      
      try {
        const resRecord = await api.reserve(userId, productId, quantity);

        setState({ phase: 'polling' });

        const startTime = Date.now();
        const TIMEOUT_MS = 15_000;

        while (true) {
          if (Date.now() - startTime > TIMEOUT_MS) {
            throw new Error('Reservation confirmation timed out. Please try again.');
          }

          const status = await api.pollReservationStatus(resRecord.id);

          if (status.status === 'failed') {
            throw new Error(status.error || 'Reservation failed due to stock or database error.');
          }

          if (status.status !== 'processing') {
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        setState({
          phase: 'active',
          reservation: { id: resRecord.id, expiresAt: resRecord.expiresAt },
        });
        
        if (onReserveSuccess) onReserveSuccess();
        
      } catch (err: unknown) {
        let message = 'Reservation failed. Please try again.';
        if (err instanceof Error) {
          message = err.message;
        } else if (typeof err === 'string') {
          message = err;
        }

        const isRaceCondition =
          message.toLowerCase().includes('out of stock') ||
          message.toLowerCase().includes('409') ||
          message.toLowerCase().includes('stock') ||
          message.toLowerCase().includes('race condition');

        setState({
          phase: 'error',
          errorMessage: message,
          isRaceCondition,
        });
      }
    },
    [onReserveSuccess]
  );

  const checkout = useCallback(async () => {
    if (state.phase !== 'active' && state.phase !== 'checking-out') return;
    
    // capture reservation before changing state to avoid TS losing track
    const res = state.reservation;

    setState({ phase: 'checking-out', reservation: res });

    try {
      await api.confirmCheckout(res.id);
      setState({ phase: 'done', reservation: res });
      onSuccess();
    } catch (err: unknown) {
      let message = 'Checkout failed. Please try again.';
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'string') {
        message = err;
      }

      setState({
        phase: 'error',
        errorMessage: message,
        isRaceCondition: false,
      });
    }
  }, [state, onSuccess]);

  return { state, reserve, checkout, reset };
}

