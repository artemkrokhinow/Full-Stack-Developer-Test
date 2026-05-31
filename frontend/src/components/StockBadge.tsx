interface StockBadgeProps {
  stock: number;
}

export function StockBadge({ stock }: StockBadgeProps) {
  const getStockInfo = () => {
    if (stock <= 0) return { label: 'Sold Out', className: 'stock-badge stock-badge--sold-out' };
    if (stock <= 5) return { label: `Only ${stock} left!`, className: 'stock-badge stock-badge--low' };
    return { label: `${stock} in stock`, className: 'stock-badge stock-badge--available' };
  };

  const { label, className } = getStockInfo();
  return <span className={className}>{label}</span>;
}
