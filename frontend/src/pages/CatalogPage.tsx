import React, { useState } from 'react';
import type { Product } from '../services/api';

interface CatalogPageProps {
  products: Product[];
  onSelectProduct: (productId: string) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({ products, onSelectProduct }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Categories list
  const categories = ['All', 'Footwear', 'Accessories', 'Apparel', 'Bags'];

  // Filtering products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name?.toLowerCase().includes(search.toLowerCase()) || 
                          (product.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Filtering and search controls */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map((category) => (
            <button
              key={category}
              className={`btn ${selectedCategory === category ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory(category)}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              {category}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: '240px', maxWidth: '360px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
          No products matched your filters.
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <div key={product.id} className="glass-panel product-card">
              <div className="product-card-visual">
                <span className="product-card-badge">{product.badge}</span>
                {product.name.split(' ')[0]}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h3 style={{ fontSize: '18px' }}>{product.name}</h3>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.5)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    height: '36px'
                  }}
                >
                  {product.description}
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <div className="product-card-price">${product.price.toFixed(2)}</div>
                <div style={{ fontSize: '11px', color: product.stock > 0 ? 'var(--success)' : 'var(--error)' }}>
                  {product.stock > 0 ? `${product.stock} left` : 'Sold Out'}
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => onSelectProduct(product.id)}
                style={{ width: '100%' }}
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CatalogPage;
