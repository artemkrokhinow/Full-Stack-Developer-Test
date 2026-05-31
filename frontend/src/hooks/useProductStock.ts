import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

type StockState = 
  | { status: 'idle' | 'loading'; stock: number }
  | { status: 'success'; stock: number }
  | { status: 'error'; stock: number; errorMessage: string };

export function useProductStock(
  productId: string | null,
  initialStock: number,
  intervalMs = 5000,
  paused = false
) {
  const [state, setState] = useState<StockState>({ status: 'idle', stock: initialStock });

  const fetchStock = useCallback(async () => {
    if (!productId) return;
    
    setState(prev => ({ ...prev, status: 'loading' }));
    try {
      const product = await api.getProduct(productId);
      setState({ status: 'success', stock: product.stock });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch';
      setState(prev => ({ ...prev, status: 'error', errorMessage }));
    }
  }, [productId]);

  useEffect(() => {
    if (paused || !productId) return;

    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      await fetchStock();
      if (!isMounted || paused) return;
      // Гарантированная защита от DDOS: следующий цикл только после завершения
      timeoutId = setTimeout(poll, intervalMs);
    };

    poll();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [productId, paused, intervalMs, fetchStock]);

  return { ...state, refresh: fetchStock };
}
