import { Link, useParams } from 'react-router-dom';
import { orderApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { Loader, ErrorMessage, StatusBadge, PageHeader } from '../../components/ui';
import { OrderItemsTable, OrderTotals, StatusHistory, AddressBlock } from '../../components/orders/OrderParts';
import StatusActions from '../../components/orders/StatusActions';
import AssignDeliveryForm from '../../components/orders/AssignDeliveryForm';
import { formatDate, formatDateTime } from '../../utils/format';
import { ASSIGNABLE_STATUSES } from '../../utils/status';

export default function AdminOrderDetails() {
  const { orderId } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => orderApi.get(orderId), [orderId]);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;
  const { order } = data;
  const delivery = order.delivery;

  async function changeStatus(status, note) {
    try {
      if (status === 'Cancelled') await orderApi.cancel(order.orderId, { reason: note });
      else await orderApi.updateStatus(order.orderId, { status, note });
      toast.success(`Order moved to ${status}`);
      reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="stack">
      <Link to="/admin/orders" className="small">
        ← All orders
      </Link>
      <PageHeader
        title={<span className="mono">{order.orderId}</span>}
        subtitle={`Placed ${formatDateTime(order.createdAt)} by ${order.customer?.name}`}
        actions={<StatusBadge status={order.status} />}
      />

      <div className="grid grid-main-side">
        <div className="stack">
          <div className="card">
            <div className="card-header">
              <h3>Update status</h3>
              <span className="small muted">Only moves allowed by the order workflow are shown</span>
            </div>
            <StatusActions allowed={order.allowedNextStatuses} onChange={changeStatus} />
            {order.status === 'Processing' && !delivery && (
              <p className="small stock-low" style={{ marginTop: 10 }}>
                Assign a delivery person before marking this order as shipped.
              </p>
            )}
          </div>
          <div className="card flush">
            <div className="card-header">
              <h3>Items</h3>
            </div>
            <OrderItemsTable items={order.items} />
            <div style={{ padding: '6px 20px 16px' }}>
              <OrderTotals order={order} />
            </div>
          </div>
          <div className="card">
            <h3>Status history</h3>
            <StatusHistory history={order.statusHistory} />
          </div>
        </div>

        <div className="stack">
          <div className="card stack" data-testid="assignment-panel">
            <h3 style={{ margin: 0 }}>Delivery assignment</h3>
            {delivery?.assignedTo && (
              <dl className="kv">
                <dt>Assigned to</dt>
                <dd data-testid="assigned-to">{delivery.assignedTo.name}</dd>
                <dt>Phone</dt>
                <dd>{delivery.assignedTo.mobile}</dd>
                <dt>Expected by</dt>
                <dd>{formatDate(delivery.estimatedDeliveryDate)}</dd>
                {delivery.deliveredAt && (
                  <>
                    <dt>Delivered</dt>
                    <dd>{formatDateTime(delivery.deliveredAt)}</dd>
                  </>
                )}
              </dl>
            )}
            {ASSIGNABLE_STATUSES.includes(order.status) ? (
              <AssignDeliveryForm
                key={delivery?.assignedTo?._id || 'new'}
                orderId={order.orderId}
                currentAssigneeId={delivery?.assignedTo?._id}
                onAssigned={() => reload({ silent: true })}
              />
            ) : (
              <p className="small muted">
                {order.status === 'Pending'
                  ? 'Confirm the order first, then assign a delivery person.'
                  : 'Assignment can no longer be changed for this order.'}
              </p>
            )}
          </div>
          <div className="card">
            <h3>Customer</h3>
            <dl className="kv">
              <dt>Name</dt>
              <dd>{order.customer?.name}</dd>
              <dt>Email</dt>
              <dd>{order.customer?.email}</dd>
              <dt>Mobile</dt>
              <dd>{order.customer?.mobile}</dd>
            </dl>
          </div>
          <div className="card">
            <h3>Ship to</h3>
            <AddressBlock address={order.shippingAddress} />
          </div>
          {delivery?.notes?.length > 0 && (
            <div className="card">
              <h3>Delivery notes</h3>
              <ul className="history">
                {delivery.notes.map((n, i) => (
                  <li key={i}>
                    <span className="bullet" />
                    <div>
                      <div>{n.text}</div>
                      <div className="small muted">
                        {n.by?.name} · {formatDateTime(n.at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
