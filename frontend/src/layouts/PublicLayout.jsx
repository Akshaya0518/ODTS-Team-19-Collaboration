import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ROLE_HOME } from '../utils/status';

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 32 32">
        <path d="M5 10h13v11H5zM18 14h5l4 4v3h-9z" fill="#2dd4bf" />
        <circle cx="10" cy="23" r="2.6" fill="#fff" />
        <circle cx="22.5" cy="23" r="2.6" fill="#fff" />
      </svg>
    </span>
  );
}

/** Layout for the shop: top navigation + page + footer. */
export default function PublicLayout() {
  const { user, logout } = useAuth();
  const { count, clear } = useCart();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    clear();
    navigate('/login');
  }

  return (
    <>
      <header className="topnav">
        <div className="container topnav-inner">
          <Link to="/" className="brand">
            <BrandMark />
            <span>
              ODTS
              <small>Order &amp; Delivery Tracking</small>
            </span>
          </Link>
          <nav className="topnav-links" aria-label="Main">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/products" data-testid="nav-products">
              Products
            </NavLink>
            {user && (
              <NavLink to={ROLE_HOME[user.role]} data-testid="nav-dashboard">
                {user.role === 'customer' ? 'My account' : 'Dashboard'}
              </NavLink>
            )}
          </nav>
          <div className="topnav-actions">
            {(!user || user.role === 'customer') && (
              <Link to="/cart" className="icon-btn cart-link" aria-label={`Cart, ${count} items`} data-testid="nav-cart">
                🛒
                {count > 0 && <span className="count-dot">{count}</span>}
              </Link>
            )}
            {user ? (
              <>
                <Link to={ROLE_HOME[user.role]} className="btn btn-outline btn-sm">
                  {user.name.split(' ')[0]}
                </Link>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout} data-testid="logout">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm" data-testid="nav-login">
                  Log in
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="public-main">
        <div className="container">
          <Outlet />
        </div>
      </main>
      <footer className="footer">
        <div className="container row between">
          <span>ODTS · Team 19 college project prototype</span>
          <span>Status-based delivery tracking · No live GPS</span>
        </div>
      </footer>
    </>
  );
}
