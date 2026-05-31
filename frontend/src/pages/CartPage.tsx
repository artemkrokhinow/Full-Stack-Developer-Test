import React from 'react';
import type { Product } from '../services/api';

export interface CartItem {
  productId: string;
  quantity: number;
}

interface CartPageProps {
  cartItems: CartItem[];
  products: Product[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
  onGoToCatalog: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  cartItems,
  products,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onGoToCatalog
}) => {
  // Map cart items to actual products to read names, prices, etc.
  const itemsWithDetails = cartItems
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        ...item,
        product
      };
    })
    .filter((item) => item.product !== undefined);

  // Computations
  const subtotal = itemsWithDetails.reduce((sum, item) => {
    return sum + (item.product?.price || 0) * item.quantity;
  }, 0);

  const shipping = subtotal > 0 ? 15.0 : 0.0;
  const tax = subtotal * 0.08; // 8% sales tax
  const total = subtotal + shipping + tax;

  if (itemsWithDetails.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>
        <h3 style={{ marginBottom: '10px' }}>Your Shopping Cart is Empty</h3>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '20px' }}>
          Explore our cyberpunk collection and add items to your cart.
        </p>
        <button className="btn btn-primary" onClick={onGoToCatalog}>
          Go Shopping
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2>Shopping Cart</h2>

      <div className="cart-layout">
        
        {/* Left Side: Cart Items List */}
        <div className="cart-items-list">
          {itemsWithDetails.map((item) => (
            <div key={item.productId} className="cart-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="cart-item-preview">
                  {item.product!.title.split(' ')[0]}
                </div>
                <div>
                  <h4 style={{ fontSize: '16px' }}>{item.product!.title}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--accent)', marginTop: '2px' }}>
                    ${item.product!.price.toFixed(2)} each
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                
                {/* Quantity adjustments */}
                <div className="quantity-picker">
                  <button
                    className="qty-btn"
                    onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button
                    className="qty-btn"
                    onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                    disabled={item.quantity >= item.product!.stock}
                  >
                    +
                  </button>
                </div>

                <div
                  style={{
                    fontFamily: 'Outfit',
                    fontWeight: 700,
                    fontSize: '16px',
                    minWidth: '80px',
                    textAlign: 'right'
                  }}
                >
                  ${(item.product!.price * item.quantity).toFixed(2)}
                </div>

                {/* Remove button */}
                <button
                  onClick={() => onRemoveItem(item.productId)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    padding: '4px',
                    transition: 'color 0.2s'
                  }}
                  title="Remove item"
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--error)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                >
                  {/* Trash Icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Side: Order Summary Panel */}
        <div className="glass-panel" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-solid)', paddingBottom: '10px' }}>
            Order Summary
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span>
              <span style={{ color: '#fff' }}>${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Estimated Shipping</span>
              <span style={{ color: '#fff' }}>${shipping.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Sales Tax (8%)</span>
              <span style={{ color: '#fff' }}>${tax.toFixed(2)}</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'Outfit',
              fontSize: '20px',
              fontWeight: 700,
              borderTop: '1px solid var(--border-solid)',
              paddingTop: '16px',
              marginTop: '4px'
            }}
          >
            <span>Total</span>
            <span style={{ color: 'var(--accent)' }}>${total.toFixed(2)}</span>
          </div>

          <button
            className="btn btn-primary"
            onClick={onCheckout}
            style={{ width: '100%', marginTop: '10px', padding: '12px' }}
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
