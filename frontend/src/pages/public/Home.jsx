import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { productApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { ProductCard } from '../../components/products/ProductParts';
import { Loader, ErrorMessage } from '../../components/ui';
import { ROLE_HOME } from '../../utils/status';

const STEPS = ['Browse & add to cart', 'Place order, get an Order ID', 'Admin confirms & assigns a rider', 'Track every status until delivered'];

export default function Home() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => productApi.list({ limit: 8, sort: 'newest' }), []);

  const handleAdd = (product) => {
    addItem(product);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="stack" style={{ gap: 32 }}>
      <section className="hero">
        <div>
          <h1>Order it. Track it. Get it.</h1>
          <p>
            ODTS lets customers place orders and follow every delivery step, while admins and delivery staff keep
            each order moving — all from one place.
          </p>
          <div className="row" style={{ marginTop: 20 }}>
            <Link to="/products" className="btn btn-primary btn-lg">
              Browse products
            </Link>
            {user ? (
              <Link to={ROLE_HOME[user.role]} className="btn btn-outline btn-lg">
                Go to dashboard
              </Link>
            ) : (
              <Link to="/register" className="btn btn-outline btn-lg">
                Create account
              </Link>
            )}
          </div>
        </div>
        <div className="hero-steps">
          {STEPS.map((step, i) => (
            <div key={step} className="hero-step">
              <span className="num">{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="row between" style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>New arrivals</h2>
          <Link to="/products">View all →</Link>
        </div>
        {loading && <Loader />}
        <ErrorMessage error={error} onRetry={reload} />
        {data && (
          <div className="product-grid">
            {data.items.map((p) => (
              <ProductCard key={p._id} product={p} onAdd={handleAdd} canAdd={!user || user.role === 'customer'} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
