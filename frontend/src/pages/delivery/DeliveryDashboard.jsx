import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { Loader, ErrorMessage, StatCard, StatusBadge, EmptyState, PageHeader } from '../../components/ui';
import { formatDate, formatAddress } from '../../utils/format';

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => dashboardApi.get(), []);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;
  const s = data.stats;

  return (
    <div className="stack" style={{ gap: 22 }}>
      <PageHeader title={`Hi, ${user.name.split(' ')[0]}`} subtitle="Your deliveries at a glance." />
      <div className="grid grid-4">
        <StatCard label="Assigned (all time)" value={s.assignedDeliveries} icon="📋" tone="blue" testId="stat-assigned" />
        <StatCard label="Pending" value={s.pendingDeliveries} icon="⏳" tone="amber" sub="Not yet delivered" testId="stat-pending-deliveries" />
        <StatCard label="Out for delivery" value={s.outForDelivery} icon="🛵" tone="teal" />
        <StatCard label="Completed" value={s.completedDeliveries} icon="✅" tone="green" testId="stat-completed" />
      </div>
      <div className="card flush">
        <div className="card-header">
          <h2>Active deliveries</h2>
          <Link to="/delivery/deliveries" className="small">
            View all
          </Link>
        </div>
        {s.activeDeliveries.length === 0 ? (
          <EmptyState icon="🎉" title="No active deliveries">
            New assignments from the admin will appear here.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Deliver to</th>
                  <th>Expected</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {s.activeDeliveries.map((d) => (
                  <tr key={d._id}>
                    <td className="mono">{d.order.orderId}</td>
                    <td>{formatAddress(d.order.shippingAddress)}</td>
                    <td className="nowrap">{formatDate(d.estimatedDeliveryDate)}</td>
                    <td>
                      <StatusBadge status={d.order.status} />
                    </td>
                    <td className="text-right">
                      <Link to={`/delivery/deliveries/${d._id}`} className="btn btn-sm btn-primary">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
