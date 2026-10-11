import { useState } from 'react';
import { Link } from 'react-router-dom';
import { deliveryApi, userApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { Loader, ErrorMessage, EmptyState, PageHeader, Pagination, StatusBadge } from '../../components/ui';
import StatusActions from '../../components/orders/StatusActions';
import { formatDate, formatDateTime } from '../../utils/format';

/**
 * Delivery status management (admin): every assigned delivery with its current
 * status and the next moves the admin is allowed to make.
 */
export default function AdminDeliveries() {
  const toast = useToast();
  const [scope, setScope] = useState('active');
  const [personId, setPersonId] = useState('');
  const [page, setPage] = useState(1);
  const people = useAsync(() => userApi.deliveryPersonnel(), []);
  const { data, loading, error, reload } = useAsync(
    () => deliveryApi.list({ scope, deliveryPersonId: personId, page, limit: 15 }),
    [scope, personId, page]
  );

  async function changeStatus(delivery, status, note) {
    try {
      await deliveryApi.updateStatus(delivery._id, { status, note });
      toast.success(`${delivery.order.orderId} → ${status}`);
      reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader title="Delivery status management" subtitle="Current assignments, completed deliveries and status updates." />
      <div className="card flush">
        <div className="toolbar" style={{ padding: '16px 16px 0' }}>
          <div className="tabs" role="tablist">
            {['active', 'completed', 'all'].map((s) => (
              <button key={s} type="button" className={`tab${scope === s ? ' active' : ''}`} onClick={() => { setScope(s); setPage(1); }}>
                {s === 'active' ? 'In progress' : s === 'completed' ? 'Completed / cancelled' : 'All'}
              </button>
            ))}
          </div>
          <select className="select" value={personId} onChange={(e) => { setPersonId(e.target.value); setPage(1); }} aria-label="Delivery person">
            <option value="">All delivery personnel</option>
            {(people.data?.personnel || []).map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {loading && <Loader />}
        <div style={{ padding: '0 16px' }}>
          <ErrorMessage error={error} onRetry={reload} />
        </div>
        {data && !loading && data.items.length === 0 && <EmptyState icon="🚚" title="No deliveries in this view" />}
        {data && !loading && data.items.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table" data-testid="admin-deliveries-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Delivery person</th>
                    <th>Expected</th>
                    <th>Status</th>
                    <th>Next step</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((d) => (
                    <tr key={d._id}>
                      <td className="mono">
                        <Link to={`/admin/orders/${d.order.orderId}`}>{d.order.orderId}</Link>
                        <div className="small muted">updated {formatDateTime(d.order.updatedAt)}</div>
                      </td>
                      <td>{d.order.customer?.name}</td>
                      <td>{d.assignedTo?.name}</td>
                      <td className="nowrap">{formatDate(d.estimatedDeliveryDate)}</td>
                      <td>
                        <StatusBadge status={d.order.status} />
                      </td>
                      <td>
                        <StatusActions size="btn-sm" allowed={d.allowedNextStatuses} onChange={(status, note) => changeStatus(d, status, note)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
