import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart, MAX_QTY } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { productApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { ProductThumb, StockLabel } from '../../components/products/ProductParts';
import { Loader, ErrorMessage } from '../../components/ui';
import { formatCurrency, formatDate } from '../../utils/format';

export default function ProductDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addItem } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const { data, loading, error, reload } = useAsync(() => productApi.get(id), [id]);

  if (loading) return <Loader label="Loading product…" />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  const { product } = data;
  const max = Math.min(MAX_QTY, product.stock);
  const canBuy = (!user || user.role === 'customer') && product.stock > 0;

  function add(goToCart) {
    addItem(product, qty);
    toast.success(`${qty} × ${product.name} added to cart`);
    if (goToCart) navigate('/cart');
  }

  return (
    <div className="stack">
      <Link to="/products" className="small">
        ← Back to products
      </Link>
      <div className="card grid grid-2" style={{ gap: 28 }}>
        <div style={{ borderRadius: 12, overflow: 'hidden' }}>
          <ProductThumb name={product.name} imageUrl={product.imageUrl} category={product.category?.name} />
        </div>
        <div className="stack">
          <span className="muted small">{product.category?.name}</span>
          <h1 data-testid="product-name">{product.name}</h1>
          <div className="price" style={{ fontSize: '1.6rem' }} data-testid="product-price">
            {formatCurrency(product.price)}
          </div>
          <StockLabel stock={product.stock} />
          <p>{product.description || 'No description provided.'}</p>
          {canBuy && (
            <>
              <div className="row">
                <span className="muted small">Quantity</span>
                <div className="qty">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease">
                    −
                  </button>
                  <input aria-label="Quantity" value={qty} readOnly data-testid="detail-qty" />
                  <button type="button" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max} aria-label="Increase">
                    +
                  </button>
                </div>
              </div>
              <div className="row">
                <button type="button" className="btn btn-primary btn-lg" onClick={() => add(false)} data-testid="detail-add-to-cart">
                  Add to cart
                </button>
                <button type="button" className="btn btn-dark btn-lg" onClick={() => add(true)} data-testid="detail-buy-now">
                  Buy now
                </button>
              </div>
            </>
          )}
          {user && user.role !== 'customer' && <p className="muted small">Only customer accounts can place orders.</p>}
          <p className="small muted">
            Product ID: <span className="mono">{product._id}</span> · Added {formatDate(product.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
