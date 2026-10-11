import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { Loader, ErrorMessage, StatusBadge, PageHeader, ConfirmDialog } from '../../components/ui';
import { OrderItemsTable, OrderTotals, StatusHistory, AddressBlock } from '../../components/orders/OrderParts';
import { formatDate, formatDateTime } from '../../utils/format';

export default function OrderDetails() {
  const { orderId } = useParams();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const { data, loading, error, reload } = useAsync(() => orderApi.get(orderId), [orderId]);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;
  const { order } = data;
  const canCancel = order.allowedNextStatuses.includes('Cancelled');

  async function cancel(reason) {
    try {
      await orderApi.cancel(order.orderId, { reason });
      toast.success('Order cancelled');
      setConfirming(false);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="stack">
      <Link to="/customer/orders" className="small">
        ← My orders
      </Link>
      <PageHeader
        title={<span className="mono">{order.orderId}</span>}
        subtitle={`Placed on ${formatDateTime(order.createdAt)}`}
        actions={
          <>
            <StatusBadge status={order.status} customerLabel />
            <Link to={`/customer/orders/${order.orderId}/track`} className="btn btn-primary" data-testid="details-track">
              Track delivery
            </Link>
            {canCancel && (
              <button type="button" className="btn btn-outline" onClick={() => setConfirming(true)} data-testid="cancel-order">
                Cancel order
              </button>
            )}
          </>
        }
      />
      <div className="grid grid-main-side">
        <div className="stack">
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
          <div className="card">
            <h3>Delivery address</h3>
            <AddressBlock address={order.shippingAddress} />
          </div>
          <div className="card">
            <h3>Delivery partner</h3>
            {order.delivery?.assignedTo ? (
              <dl className="kv">
                <dt>Name</dt>
                <dd>{order.delivery.assignedTo.name}</dd>
                <dt>Phone</dt>
                <dd>{order.delivery.assignedTo.mobile}</dd>
                <dt>Expected by</dt>
                <dd>{formatDate(order.delivery.estimatedDeliveryDate)}</dd>
              </dl>
            ) : (
              <p className="muted">Not assigned yet. You will be notified when a delivery partner is assigned and the order ships.</p>
            )}
          </div>
          {order.status === 'Cancelled' && (
            <div className="alert alert-error">
              This order was cancelled{order.cancelReason ? `: ${order.cancelReason}` : '.'}
            </div>
          )}
        </div>
      </div>
      {confirming && (
        <ConfirmDialog
          title="Cancel this order?"
          message="The order will be cancelled and you will not be charged. This cannot be undone."
          confirmLabel="Yes, cancel order"
          danger
          withNote
          notePlaceholder="Why are you cancelling? (optional)"
          onCancel={() => setConfirming(false)}
          onConfirm={cancel}
        />
      )}
    </div>
  );
}
