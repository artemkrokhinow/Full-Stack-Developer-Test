import React, { useState } from 'react';
import type { Product } from '../services/api';
import { useProductStock } from '../hooks/useProductStock';
import { useCountdown } from '../hooks/useCountdown';
import { useReservationAction } from '../hooks/useReservationAction';

interface ProductPageProps {
  productId: string;
  products: Product[];
  onBack: () => void;
  onCheckoutSuccess: () => void;
  onReserveSuccess: () => void;
  isAuthenticated: boolean;
  onRedirectToLogin: () => void;
  userId: string | null;
}

export const ProductPage: React.FC<ProductPageProps> = ({
  productId,
  products,
  onBack,
  onCheckoutSuccess,
  onReserveSuccess,
  isAuthenticated,
  onRedirectToLogin,
  userId,
}) => {
  const product = products.find((p) => p.id === productId);

  const { state, reserve, checkout, reset } = useReservationAction(onCheckoutSuccess, onReserveSuccess);

  const isReservationActive = state.phase === 'active' || state.phase === 'checking-out';
  const reservation = 'reservation' in state ? state.reservation : null;

  const { stock } = useProductStock(
    product?.id ?? null,
    product?.stock ?? 0,
    5000,
    isReservationActive // pause polling while a reservation is active
  );

  const { formatted: timerFormatted, isExpired } = useCountdown(
    reservation?.expiresAt ?? null,
    () => {
      // Timer expired — reset back to idle so the user can try again
      reset();
    }
  );

  const [quantity, setQuantity] = useState(1);

  // Derive urgency colour for the countdown ring
  const timerPercentage = reservation
    ? Math.max(0, (new Date(reservation.expiresAt).getTime() - Date.now()) / (5 * 60 * 1000)) * 100
    : 100;
  const timerColour =
    timerPercentage > 40 ? 'var(--success)' : timerPercentage > 15 ? 'var(--warning)' : 'var(--error)';

  const handleReserve = () => {
    if (!isAuthenticated) {
      onRedirectToLogin();
      return;
    }
    if (!product || !userId) return;
    reserve(userId, product.id, quantity);
  };

  if (!product) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>
        <h3>Product not found</h3>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: '16px' }}>
          Back to Catalog
        </button>
      </div>
    );
  }

  const isBusy = state.phase === 'reserving' || state.phase === 'polling' || state.phase === 'checking-out';
  const stockIsLow = stock > 0 && stock <= 5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Back button */}
      <div>
        <button className="btn btn-secondary" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Catalog
        </button>
      </div>

      {/* ── Error / Race condition banner ────────────────────────────── */}
      {state.phase === 'error' && state.errorMessage && (
        <div className={`reservation-banner reservation-banner--error ${state.isRaceCondition ? 'reservation-banner--race' : ''}`}>
          <div className="reservation-banner__icon">
            {state.isRaceCondition ? '⚡' : '✕'}
          </div>
          <div>
            <div className="reservation-banner__title">
              {state.isRaceCondition ? 'Race Condition — Sold Out' : 'Reservation Failed'}
            </div>
            <div className="reservation-banner__sub">{state.errorMessage}</div>
          </div>
          <button className="reservation-banner__close" onClick={reset}>✕</button>
        </div>
      )}

      {/* ── Active Reservation Banner ─────────────────────────────────── */}
      {isReservationActive && !isExpired && (
        <div className="reservation-banner reservation-banner--active">
          <div className="reservation-timer-ring" style={{ '--timer-color': timerColour } as React.CSSProperties}>
            <span className="reservation-timer-ring__text">{timerFormatted}</span>
          </div>
          <div>
            <div className="reservation-banner__title">Item Reserved!</div>
            <div className="reservation-banner__sub">
              Complete payment before the timer expires — your slot is locked.
            </div>
          </div>
        </div>
      )}

      {/* ── Main product detail card ──────────────────────────────────── */}
      <div className="glass-panel product-detail-layout">

        {/* Visual */}
        <div className="product-detail-visual" style={isReservationActive ? { boxShadow: `0 0 40px ${timerColour}55` } : {}}>
          {isReservationActive && (
            <div className="reservation-lock-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 11H7V7a5 5 0 0 1 10 0v4zm2 0V7A7 7 0 0 0 5 7v4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"/>
              </svg>
              Reserved
            </div>
          )}
          {product.name.split(' ')[0]}
        </div>

        {/* Info panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <span className="product-category-badge">{product.category}</span>
            <h2 style={{ fontSize: '32px', marginTop: '12px' }}>{product.name}</h2>
            <div className="product-card-price" style={{ fontSize: '28px', marginTop: '8px', color: 'var(--accent)' }}>
              ${product.price.toFixed(2)}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-solid)', paddingTop: '16px' }}>
            <h4 style={{ marginBottom: '8px' }}>Description</h4>
            <p style={{ color: 'rgba(0,0,0,0.55)', fontSize: '14px', lineHeight: '1.6' }}>
              {product.description}
            </p>
          </div>

          <div>
            <h4 style={{ marginBottom: '8px' }}>Technical Specs</h4>
            <ul style={{
              listStyle: 'none', padding: 0,
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px',
              fontSize: '13px', color: 'rgba(0,0,0,0.45)'
            }}>
              {(product.specs || []).map((spec, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--accent)' }}>•</span> {spec}
                </li>
              ))}
            </ul>
          </div>

          {/* ── Stock + Action area ─────────────────────────────────────── */}
          <div style={{
            borderTop: '1px solid var(--border-solid)', paddingTop: '20px',
            display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            {/* Stock indicator */}
            <div className="stock-indicator">
              <div className={`stock-dot ${stock === 0 ? 'stock-dot--out' : stockIsLow ? 'stock-dot--low' : 'stock-dot--ok'}`} />
              <span className="stock-label" style={{ color: stock === 0 ? 'var(--error)' : stockIsLow ? 'var(--warning)' : 'var(--success)' }}>
                {stock === 0 ? 'Out of Stock' : stockIsLow ? `Only ${stock} left — hurry!` : `${stock} in stock`}
              </span>
              {stockIsLow && stock > 0 && (
                <span className="stock-fire">🔥</span>
              )}
            </div>

            {/* ── IDLE / ERROR: show Reserve button ──────────────────── */}
            {(state.phase === 'idle' || state.phase === 'error') && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {stock > 0 && (
                  <div style={{ width: '80px', flexShrink: 0 }}>
                    <select
                      className="form-control"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value))}
                      disabled={isBusy}
                    >
                      {Array.from({ length: Math.min(5, stock) }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  id="reserve-btn"
                  className="btn btn-reserve"
                  onClick={handleReserve}
                  disabled={stock === 0 || isBusy}
                  style={{ flex: 1 }}
                >
                  {stock === 0 ? 'Out of Stock' : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      Забронировать (Reserve for 5 min)
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ── RESERVING / POLLING: spinner ────────────────────────── */}
            {(state.phase === 'reserving' || state.phase === 'polling') && (
              <div className="reservation-loading-state">
                <div className="reservation-spinner" />
                <span>{state.phase === 'reserving' ? 'Sending reservation…' : 'Confirming with server…'}</span>
              </div>
            )}

            {/* ── ACTIVE: countdown + checkout button ─────────────────── */}
            {state.phase === 'active' && !isExpired && (
              <div className="reservation-controls">
                <div className="countdown-display" style={{ color: timerColour }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {timerFormatted}
                </div>
                <button
                  id="checkout-btn"
                  className="btn btn-checkout"
                  onClick={checkout}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Оформить заказ (Pay Now)
                </button>
                <button className="btn btn-secondary btn-sm" onClick={reset} style={{ marginTop: '4px', fontSize: '12px' }}>
                  Cancel Reservation
                </button>
              </div>
            )}

            {/* ── CHECKING-OUT: spinner ───────────────────────────────── */}
            {state.phase === 'checking-out' && (
              <div className="reservation-loading-state">
                <div className="reservation-spinner reservation-spinner--green" />
                <span>Processing payment…</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
