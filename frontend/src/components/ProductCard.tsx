import type { Product } from '../services/api';
import { StockBadge } from './StockBadge';

interface ProductCardProps {
  product: Product;
  onClick: (productId: string) => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <div
      className="glass-panel product-card"
      onClick={() => onClick(product.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(product.id)}
    >
      {product.badge && <div className="product-badge">{product.badge}</div>}
      <div className="product-image-placeholder">
        <div className="product-image-fallback">📦</div>
      </div>
      <h3 className="product-card-title">{product.title}</h3>
      <div className="product-card-footer">
        <span className="product-price">${product.price}</span>
        <StockBadge stock={product.stock} />
      </div>
    </div>
  );
}
