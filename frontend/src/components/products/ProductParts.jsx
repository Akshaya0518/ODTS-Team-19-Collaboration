import { Link } from 'react-router-dom';
import { formatCurrency, initials } from '../../utils/format';

const GRADIENTS = [
  ['#0f2742', '#0d9488'],
  ['#1e3a8a', '#2563eb'],
  ['#7c2d12', '#d97706'],
  ['#4c1d95', '#7c3aed'],
  ['#14532d', '#16a34a'],
  ['#831843', '#db2777'],
];

/** Shows the product image, or a coloured tile with initials when there is no image URL. */
export function ProductThumb({ name = '', imageUrl, category = '' }) {
  const seed = [...(category || name)].reduce((n, ch) => n + ch.charCodeAt(0), 0);
  const [from, to] = GRADIENTS[seed % GRADIENTS.length];
  return (
    <div className="product-thumb" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <span className="initials">{initials(name)}</span>
      {imageUrl && <img src={imageUrl} alt={name} loading="lazy" onError={(e) => e.currentTarget.remove()} />}
    </div>
  );
}

export function StockLabel({ stock }) {
  if (stock <= 0) return <span className="stock-out small">Out of stock</span>;
  if (stock <= 5) return <span className="stock-low small">Only {stock} left</span>;
  return <span className="small muted">In stock</span>;
}

export function ProductCard({ product, onAdd, canAdd = true }) {
  return (
    <article className="card product-card" data-testid="product-card" data-product-id={product._id}>
      <Link to={`/products/${product._id}`} aria-label={product.name}>
        <ProductThumb name={product.name} imageUrl={product.imageUrl} category={product.category?.name} />
      </Link>
      <div className="body">
        <span className="small muted">{product.category?.name}</span>
        <Link to={`/products/${product._id}`} className="title" data-testid="product-link">
          {product.name}
        </Link>
        <StockLabel stock={product.stock} />
        <div className="footer-row">
          <span className="price">{formatCurrency(product.price)}</span>
          {canAdd && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={product.stock <= 0}
              onClick={() => onAdd(product)}
              data-testid="add-to-cart"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
