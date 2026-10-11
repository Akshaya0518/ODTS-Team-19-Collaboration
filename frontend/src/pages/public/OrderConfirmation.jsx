import { Link, useParams } from 'react-router-dom';
import { orderApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { Loader, ErrorMessage, StatusBadge } from '../../components/ui';
import { OrderItemsTable, OrderTotals, AddressBlock } from '../../components/orders/OrderParts';
import { formatDateTime } from '../../utils/format';

/** Shown right after checkout. All data is re-read from the backend, so it proves the order was saved. */
export default function OrderConfirmation() {
  const { orderId } = useParams();
  const { data, loading, error, reload } = useAsync(() => orderApi.get(orderId), [orderId]);

  if (loading) return <Loader label="Loading your order…" />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;
  const { order } = data;

  return (
    <div className="stack" style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="card stack" style={{ textAlign: 'center', alignItems: 'center' }}>
        <div style={{ fontSize: '2.6rem' }} aria-hidden="true">
          🎉
        </div>
        <h1>Thank you! Your order is placed.</h1>
        <p className="muted">Save your order ID to track the delivery.</p>
        <div className="order-id-big" data-testid="confirmation-order-id">
          {order.orderId}
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <StatusBadge status={order.status} customerLabel />
          <span className="small muted">Placed {formatDateTime(order.createdAt)}</span>
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link to={`/customer/orders/${order.orderId}/track`} className="btn btn-primary" data-testid="track-order-link">
            Track this order
          </Link>
          <Link to="/products" className="btn btn-outline">
            Continue shopping
          </Link>
        </div>
      </div>
      <div className="grid grid-main-side">
        <div className="card flush">
          <div className="card-header">
            <h3>Items</h3>
          </div>
          <OrderItemsTable items={order.items} />
        </div>
        <div className="card stack">
          <OrderTotals order={order} />
          <div>
            <h3>Delivering to</h3>
            <AddressBlock address={order.shippingAddress} />
          </div>
        </div>
      </div>
    </div>
  );
}
