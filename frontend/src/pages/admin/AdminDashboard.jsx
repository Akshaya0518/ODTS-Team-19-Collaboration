import { Link } from 'react-router-dom';
import { dashboardApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { Loader, ErrorMessage, StatCard, StatusBadge, PageHeader, Alert } from '../../components/ui';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { ORDER_STATUSES, statusMeta } from '../../utils/status';

const BAR_COLORS = { slate: '#94a3b8', blue: '#2563eb', violet: '#7c3aed', amber: '#d97706', teal: '#14b8a6', green: '#16a34a', red: '#dc2626' };

/** All numbers come from GET /api/dashboard, which counts documents in MongoDB. */
export default function AdminDashboard() {
  const { data, loading, error, reload } = useAsync(() => dashboardApi.get(), []);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;
  const s = data.stats;
  const max = Math.max(1, ...Object.values(s.ordersByStatus));

  return (
    <div className="stack" style={{ gap: 22 }}>
      <PageHeader
        title="Admin dashboard"
        subtitle="Live figures calculated from the database."
        actions={
          <button type="button" className="btn btn-outline" onClick={() => reload()}>
            ↻ Refresh
          </button>
        }
      />
      {s.awaitingAssignment > 0 && (
        <Alert type="warning">
          {s.awaitingAssignment} confirmed order(s) still need a delivery person.{' '}
          <Link to="/admin/assignments">Assign now →</Link>
        </Alert>
      )}
      <div className="grid grid-4">
        <StatCard label="Total orders" value={s.totalOrders} icon="📦" tone="blue" testId="stat-total-orders" />
        <StatCard label="Pending orders" value={s.pendingOrders} icon="🧾" tone="slate" sub="Waiting for confirmation" testId="stat-pending" />
        <StatCard label="In transit" value={s.inTransitOrders} icon="🚚" tone="amber" sub="Shipped + out for delivery" testId="stat-in-transit" />
        <StatCard label="Delivered" value={s.deliveredOrders} icon="🏠" tone="green" testId="stat-delivered" />
        <StatCard label="Cancelled" value={s.cancelledOrders} icon="✖" tone="red" testId="stat-cancelled" />
        <StatCard label="Products" value={s.totalProducts} icon="🏷️" tone="violet" sub={`${s.activeProducts} active · ${s.lowStockProducts} low stock`} testId="stat-products" />
        <StatCard label="Customers" value={s.totalCustomers} icon="👥" tone="teal" testId="stat-customers" />
        <StatCard label="Delivered revenue" value={formatCurrency(s.deliveredRevenue)} icon="₹" tone="green" sub="Sum of delivered orders" />
      </div>

      <div className="grid grid-main-side">
        <div className="card flush">
          <div className="card-header">
            <h2>Recent orders</h2>
            <Link to="/admin/orders" className="small">
              All orders
            </Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {s.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      No orders yet.
                    </td>
                  </tr>
                )}
                {s.recentOrders.map((o) => (
                  <tr key={o.orderId}>
                    <td className="mono">
                      <Link to={`/admin/orders/${o.orderId}`}>{o.orderId}</Link>
                    </td>
                    <td>{o.customer?.name}</td>
                    <td className="nowrap">{formatDateTime(o.createdAt)}</td>
                    <td>{formatCurrency(o.total)}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h2>Orders by status</h2>
          <div className="bars">
            {ORDER_STATUSES.map((status) => (
              <div key={status} className="bar-row">
                <span>{status}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(s.ordersByStatus[status] / max) * 100}%`, background: BAR_COLORS[statusMeta(status).tone] }}
                  />
                </div>
                <strong className="text-right">{s.ordersByStatus[status]}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
