import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { notificationApi } from '../services/endpoints';
import { initials } from '../utils/format';
import { BrandMark } from './PublicLayout';

/** Sidebar menu for each role. Hiding links is only for convenience — the backend enforces access. */
const MENUS = {
  customer: [
    { section: 'Shopping' },
    { to: '/customer', label: 'Dashboard', icon: '🏠', end: true },
    { to: '/products', label: 'Browse products', icon: '🛍️' },
    { to: '/cart', label: 'Cart', icon: '🛒' },
    { to: '/customer/orders', label: 'My orders', icon: '📦' },
    { section: 'Account' },
    { to: '/notifications', label: 'Notifications', icon: '🔔' },
    { to: '/profile', label: 'Profile', icon: '👤' },
  ],
  admin: [
    { section: 'Overview' },
    { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
    { to: '/admin/reports', label: 'Reports', icon: '📈' },
    { section: 'Catalogue' },
    { to: '/admin/products', label: 'Products', icon: '🏷️' },
    { to: '/admin/categories', label: 'Categories', icon: '🗂️' },
    { section: 'Operations' },
    { to: '/admin/orders', label: 'Orders', icon: '📦' },
    { to: '/admin/assignments', label: 'Assign deliveries', icon: '🧭' },
    { to: '/admin/deliveries', label: 'Delivery status', icon: '🚚' },
    { to: '/admin/personnel', label: 'Delivery personnel', icon: '🧑‍✈️' },
    { section: 'Account' },
    { to: '/profile', label: 'Profile', icon: '👤' },
  ],
  delivery: [
    { section: 'Deliveries' },
    { to: '/delivery', label: 'Dashboard', icon: '📊', end: true },
    { to: '/delivery/deliveries', label: 'My deliveries', icon: '🚚' },
    { section: 'Account' },
    { to: '/notifications', label: 'Notifications', icon: '🔔' },
    { to: '/profile', label: 'Profile', icon: '👤' },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { clear } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // Unread badge: refreshed on every page change and every 30 seconds.
  useEffect(() => {
    let active = true;
    const load = () =>
      notificationApi
        .list({ limit: 1 })
        .then((d) => active && setUnread(d.unreadCount))
        .catch(() => {});
    load();
    const timer = setInterval(load, 30000);
    setOpen(false);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    clear();
    navigate('/login');
  }

  const menu = MENUS[user.role] || [];

  return (
    <div className="shell">
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Sidebar">
        <Link to="/" className="brand">
          <BrandMark />
          <span>
            ODTS
            <small>{user.role === 'delivery' ? 'Delivery partner' : user.role === 'admin' ? 'Admin console' : 'Customer'}</small>
          </span>
        </Link>
        <nav>
          {menu.map((item) =>
            item.section ? (
              <div key={item.section} className="sidebar-section">
                {item.section}
              </div>
            ) : (
              <NavLink key={item.to} to={item.to} end={item.end} data-testid={`side-${item.to.replace(/\//g, '-').slice(1)}`}>
                <span className="icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            )
          )}
        </nav>
        <div className="sidebar-footer">Status-based tracking prototype</div>
      </aside>
      <div className={`backdrop${open ? ' show' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            ☰
          </button>
          <div className="grow" />
          {user.role !== 'admin' && (
            <Link to="/notifications" className="icon-btn" aria-label={`Notifications, ${unread} unread`} data-testid="bell">
              🔔
              {unread > 0 && <span className="count-dot">{unread > 99 ? '99+' : unread}</span>}
            </Link>
          )}
          <div className="user-chip">
            <span className="avatar">{initials(user.name)}</span>
            <span className="meta">
              <div className="name" data-testid="current-user">
                {user.name}
              </div>
              <div className="role">{user.role === 'delivery' ? 'Delivery personnel' : user.role}</div>
            </span>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout} data-testid="logout">
            Log out
          </button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
