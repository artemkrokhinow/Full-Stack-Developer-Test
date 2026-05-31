import React, { useState } from 'react';
import type { Reservation, Product } from '../services/api';
import { api } from '../services/api';
import { useCountdown } from '../hooks/useCountdown';

interface CartPageProps {
  reservations: (Reservation & { product: Product })[];
  onBack: () => void;
  onCheckoutSuccess: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({ reservations, onBack, onCheckoutSuccess }) => {
  if (reservations.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>
        <h3 style={{ marginBottom: '16px' }}>Your Cart is Empty</h3>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>You have no active reservations.</p>
        <button className="btn btn-primary" onClick={onBack}>Browse Catalog</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <h2 style={{ margin: 0 }}>Your Reservations</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {reservations.map((res) => (
          <CartItem 
            key={res.id} 
            reservation={res} 
            onCheckoutSuccess={onCheckoutSuccess} 
          />
        ))}
      </div>
    </div>
  );
};

const CartItem: React.FC<{
  reservation: Reservation & { product: Product };
  onCheckoutSuccess: () => void;
}> = ({ reservation, onCheckoutSuccess }) => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { formatted, isExpired } = useCountdown(reservation.expiresAt, () => {
    // When timer expires, the page should ideally refresh or show expired state
  });

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    setError(null);
    try {
      await api.confirmCheckout(reservation.id);
      onCheckoutSuccess();
    } catch (err: any) {
      setError(err.message || 'Checkout failed');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (isExpired) {
    return (
      <div className="glass-panel" style={{ padding: '24px', opacity: 0.6, border: '1px solid var(--error)' }}>
        <h3 style={{ color: 'var(--error)' }}>Reservation Expired</h3>
        <p>{reservation.product.title} (x{reservation.quantity})</p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h3 style={{ margin: '0 0 8px 0' }}>{reservation.product.title}</h3>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
          Quantity: {reservation.quantity} | Total: ${(reservation.product.price * reservation.quantity).toFixed(2)}
        </p>
        {error && <p style={{ color: 'var(--error)', fontSize: '13px', marginTop: '8px' }}>{error}</p>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '18px', color: 'var(--accent)', fontWeight: 'bold' }}>
          ⏱ {formatted}
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleCheckout} 
          disabled={isCheckingOut || isExpired}
          style={{ width: '160px' }}
        >
          {isCheckingOut ? 'Processing...' : 'Checkout Now'}
        </button>
      </div>
    </div>
  );
};

export default CartPage;
