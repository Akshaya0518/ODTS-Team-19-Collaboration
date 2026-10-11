import { useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { Loader, ErrorMessage, EmptyState, PageHeader, StatusBadge, Modal } from '../../components/ui';
import AssignDeliveryForm from '../../components/orders/AssignDeliveryForm';
import { formatCurrency, formatDateTime } from '../../utils/format';

/** Confirmed and Processing orders — the ones that can be (re)assigned before shipping. */
async function loadAssignable() {
  const [confirmed, processing] = await Promise.all([
    orderApi.all({ status: 'Confirmed', limit: 100 }),
    orderApi.all({ status: 'Processing', limit: 100 }),
  ]);
  return [...confirmed.items, ...processing.items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export default function AdminAssignments() {
  const [selected, setSelected] = useState(null);
  const [showAssigned, setShowAssigned] = useState(false);
  const { data, loading, error, reload } = useAsync(loadAssignable, []);

  const rows = (data || []).filter((o) => showAssigned || !o.assignedTo);

  return (
    <div>
      <PageHeader
        title="Assign deliveries"
        subtitle="Confirmed and processing orders. Assign each one to a delivery person before it ships."
      />
      <div className="card flush">
        <div className="toolbar" style={{ padding: '16px 16px 0' }}>
          <label className="checkbox">
            <input type="checkbox" checked={showAssigned} onChange={(e) => setShowAssigned(e.target.checked)} />
            Also show orders that already have a delivery person
          </label>
        </div>
        {loading && <Loader />}
        <div style={{ padding: '0 16px' }}>
          <ErrorMessage error={error} onRetry={reload} />
        </div>
        {data && !loading && rows.length === 0 && (
          <EmptyState icon="✅" title="Nothing waiting for assignment">
            Confirm pending orders on the <Link to="/admin/orders">orders page</Link> to see them here.
          </EmptyState>
        )}
        {data && !loading && rows.length > 0 && (
          <div className="table-wrap">
            <table className="table" data-testid="assignments-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th className="text-right">Total</th>
                  <th>Status</th>
                  <th>Delivery person</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.orderId} className={o.assignedTo ? '' : 'highlight'}>
                    <td className="mono">
                      <Link to={`/admin/orders/${o.orderId}`}>{o.orderId}</Link>
                    </td>
                    <td>{o.customer?.name}</td>
                    <td className="nowrap">{formatDateTime(o.createdAt)}</td>
                    <td className="text-right">{formatCurrency(o.total)}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td>{o.assignedTo?.name || <span className="stock-low small">Unassigned</span>}</td>
                    <td className="text-right">
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => setSelected(o)} data-testid="open-assign">
                        {o.assignedTo ? 'Reassign' : 'Assign'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && (
        <Modal title={`Assign ${selected.orderId}`} onClose={() => setSelected(null)}>
          <AssignDeliveryForm
            orderId={selected.orderId}
            currentAssigneeId={selected.assignedTo?._id}
            onAssigned={() => {
              setSelected(null);
              reload({ silent: true });
            }}
          />
        </Modal>
      )}
    </div>
  );
}
