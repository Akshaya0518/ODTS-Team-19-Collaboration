import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { Loader, ErrorMessage, StatCard, StatusBadge, EmptyState, PageHeader } from '../../components/ui';
import { formatCurrency, formatDate, timeAgo } from '../../utils/format';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => dashboardApi.get(), []);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;
  const s = data.stats;

  return (
    <div className="stack" style={{ gap: 22 }}>
      <PageHeader
        title={`Hello, ${user.name.split(' ')[0]} 👋`}
        subtitle="Here is what's happening with your orders."
        actions={
          <Link to="/products" className="btn btn-primary">
            Shop now
          </Link>
        }
      />
      <div className="grid grid-3">
        <StatCard label="Total orders" value={s.totalOrders} icon="📦" tone="blue" testId="stat-total-orders" />
        <StatCard label="Active deliveries" value={s.activeOrders} icon="🚚" tone="amber" />
        <StatCard label="Delivered" value={s.deliveredOrders} icon="🏠" tone="green" />
      </div>

      <div className="grid grid-main-side">
        <div className="stack">
          <div className="card">
            <div className="card-header">
              <h2>Current deliveries</h2>
            </div>
            {s.currentDeliveries.length === 0 ? (
              <EmptyState icon="✨" title="Nothing on the way">
                Orders you place will appear here until they are delivered.
              </EmptyState>
            ) : (
              <div className="stack">
                {s.currentDeliveries.map((o) => (
                  <div key={o.orderId} className="row between" style={{ borderBottom: '1px solid var(--slate-100)', paddingBottom: 12 }}>
                    <div>
                      <div className="mono">{o.orderId}</div>
                      <div className="small muted">
                        {formatCurrency(o.total)} · placed {formatDate(o.createdAt)}
                      </div>
                    </div>
                    <div className="row">
                      <StatusBadge status={o.status} customerLabel />
                      <Link to={`/customer/orders/${o.orderId}/track`} className="btn btn-sm btn-outline">
                        Track
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card flush">
            <div className="card-header">
              <h2>Recent orders</h2>
              <Link to="/customer/orders" className="small">
                View all
              </Link>
            </div>
            {s.recentOrders.length === 0 ? (
              <EmptyState title="No orders yet" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <tbody>
                    {s.recentOrders.map((o) => (
                      <tr key={o.orderId}>
                        <td>
                          <Link to={`/customer/orders/${o.orderId}`} className="mono">
                            {o.orderId}
                          </Link>
                        </td>
                        <td>{formatDate(o.createdAt)}</td>
                        <td>{formatCurrency(o.total)}</td>
                        <td>
                          <StatusBadge status={o.status} customerLabel />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card flush">
          <div className="card-header">
            <h2>Notifications</h2>
            <Link to="/notifications" className="small">
              {s.unreadNotifications} unread
            </Link>
          </div>
          {s.recentNotifications.length === 0 ? (
            <EmptyState icon="🔕" title="No notifications" />
          ) : (
            s.recentNotifications.map((n) => (
              <div key={n._id} className={`notif${n.isRead ? '' : ' unread'}`}>
                <span className="dot" />
                <div className="body">
                  <strong>{n.title}</strong>
                  <div className="small">{n.message}</div>
                  <div className="small muted">{timeAgo(n.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
