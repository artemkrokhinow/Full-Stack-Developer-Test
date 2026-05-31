import { CountdownTimer } from './CountdownTimer';

type BannerState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'active'; expiresAt: string; onExpire: () => void; onCheckout: () => void }
  | { phase: 'checking-out' }
  | { phase: 'expired' }
  | { phase: 'done' }
  | { phase: 'error'; message: string };

interface ReservationBannerProps {
  state: BannerState;
}

export function ReservationBanner({ state }: ReservationBannerProps) {
  switch (state.phase) {
    case 'idle':
      return null;
    case 'loading':
      return (
        <div className="reservation-banner reservation-banner--loading">
          <div className="spinner" /> Reserving...
        </div>
      );
    case 'active':
      return (
        <div className="reservation-banner reservation-banner--active">
          <div className="reservation-banner-content">
            <span>Reserved! Complete checkout within:</span>
            <CountdownTimer expiresAt={state.expiresAt} onExpire={state.onExpire} />
          </div>
          <button className="btn btn-primary" onClick={state.onCheckout}>Checkout Now</button>
        </div>
      );
    case 'checking-out':
      return (
        <div className="reservation-banner reservation-banner--loading">
          <div className="spinner" /> Processing payment...
        </div>
      );
    case 'expired':
      return (
        <div className="reservation-banner reservation-banner--expired">
          ⚠️ Reservation expired. Stock has been released.
        </div>
      );
    case 'done':
      return (
        <div className="reservation-banner reservation-banner--done">
          ✅ Order placed successfully!
        </div>
      );
    case 'error':
      return (
        <div className="reservation-banner reservation-banner--error">
          ❌ {state.message}
        </div>
      );
  }
}
