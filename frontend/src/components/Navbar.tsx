import React from 'react';

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  cartCount: number;
  user: { email: string } | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  setCurrentPage,
  cartCount,
  user,
  onLogout
}) => {
  return (
    <nav className="glass-panel navbar">
      <div className="brand" onClick={() => setCurrentPage('catalog')}>
        CYBER MALL
      </div>
      <div className="nav-links">
        <span
          className={`nav-link ${currentPage === 'catalog' ? 'active' : ''}`}
          onClick={() => setCurrentPage('catalog')}
        >
          Catalog
        </span>
        <span
          className={`nav-link ${currentPage === 'cart' ? 'active' : ''}`}
          onClick={() => setCurrentPage('cart')}
          style={{ position: 'relative' }}
        >
          {/* Cart Icon SVG */}
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
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
          Cart
          {cartCount > 0 && (
            <span
              style={{
                background: 'var(--primary)',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '2px',
                boxShadow: '0 0 8px var(--primary-glow)'
              }}
            >
              {cartCount}
            </span>
          )}
        </span>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '10px' }}>
            <span
              style={{
                fontSize: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-solid)',
                padding: '6px 12px',
                borderRadius: '999px',
                color: 'rgba(255,255,255,0.8)'
              }}
            >
              {user.email}
            </span>
            <button
              className="btn btn-secondary"
              onClick={onLogout}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            className="btn btn-accent"
            onClick={() => setCurrentPage('auth')}
            style={{ padding: '6px 16px', fontSize: '12px', marginLeft: '10px' }}
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
