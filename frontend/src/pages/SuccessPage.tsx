import React, { useState } from 'react';

interface SuccessPageProps {
  onGoToCatalog: () => void;
  userEmail: string;
}

export const SuccessPage: React.FC<SuccessPageProps> = ({ onGoToCatalog, userEmail }) => {
  // Generate a random simulated order ID — stable across re-renders
  const [orderId] = useState(() => `ORD-${Math.floor(100000 + Math.random() * 900000)}`);

  return (
    <div className="glass-panel receipt-card">
      <div className="success-check-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h2 style={{ fontSize: '28px', color: 'var(--success)' }}>Order Placed!</h2>
      <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', maxWidth: '340px' }}>
        Thank you for shopping at Cyber Mall. Your payment was approved, and your order has been received.
      </p>

      <div
        style={{
          width: '100%',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--border-solid)',
          borderRadius: '12px',
          padding: '16px',
          margin: '10px 0',
          textAlign: 'left',
          fontSize: '13px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Order Number</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{orderId}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Account</span>
          <span>{userEmail}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Delivery Estimate</span>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>2-3 Business Days</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Shipping Carrier</span>
          <span>HyperLoop Logistics</span>
        </div>
      </div>

      <button className="btn btn-primary" onClick={onGoToCatalog} style={{ width: '100%', marginTop: '8px' }}>
        Continue Shopping
      </button>
    </div>
  );
};

export default SuccessPage;
