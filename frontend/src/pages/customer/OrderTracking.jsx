import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { Loader, ErrorMessage, StatusBadge, PageHeader, Alert } from '../../components/ui';
import DeliveryTimeline from '../../components/tracking/DeliveryTimeline';
import { StatusHistory, AddressBlock } from '../../components/orders/OrderParts';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';

const REFRESH_MS = 20000;

/**
 * STATUS-BASED delivery tracking (not live GPS).
 * Everything shown comes from GET /api/orders/:orderId/tracking and refreshes every 20 seconds.
 */
export default function OrderTracking() {
  const { orderId } = useParams();
  const { data, loading, error, reload } = useAsync(() => orderApi.tracking(orderId), [orderId]);

  useEffect(() => {
    const timer = setInterval(() => reload({ silent: true }), REFRESH_MS);
    return () => clearInterval(timer);
  }, [reload]);

  if (loading && !data) return <Loader label="Loading tracking…" />;
  if (error && !data) return <ErrorMessage error={error} onRetry={reload} />;
  const t = data.tracking;

  return (
    <div className="stack">
      <Link to={`/customer/orders/${t.orderId}`} className="small">
        ← Order details
      </Link>
      <PageHeader
        title="Track your delivery"
        subtitle={
          <>
            Order <span className="mono" data-testid="tracking-order-id">{t.orderId}</span> · placed {formatDateTime(t.placedAt)}
          </>
        }
        actions={
          <button type="button" className="btn btn-outline" onClick={() => reload()} data-testid="tracking-refresh">
            ↻ Refresh
          </button>
        }
      />
      <Alert type="info">{t.trackingNote}</Alert>

      <div className="grid grid-main-side">
        <div className="card stack">
          <div className="row between">
            <div>
              <div className="small muted">Current status</div>
              <h2 style={{ margin: 0 }} data-testid="tracking-current-status" data-status={t.status}>
                {t.statusLabel}
              </h2>
            </div>
            <StatusBadge status={t.status} customerLabel />
          </div>
          {t.isCancelled && (
            <div className="alert alert-error" data-testid="tracking-cancelled">
              This order was cancelled{t.cancelReason ? `: ${t.cancelReason}` : '.'}
            </div>
          )}
          <DeliveryTimeline steps={t.steps} />
          <p className="small muted">Last updated {formatDateTime(t.lastUpdatedAt)} · refreshes automatically</p>
        </div>

        <div className="stack">
          <div className="card">
            <h3>Delivery</h3>
            <dl className="kv">
              <dt>Delivery partner</dt>
              <dd data-testid="tracking-partner">{t.delivery?.assignedTo?.name || 'Not assigned yet'}</dd>
              {t.delivery?.assignedTo?.mobile && (
                <>
                  <dt>Phone</dt>
                  <dd>{t.delivery.assignedTo.mobile}</dd>
                </>
              )}
              <dt>Expected by</dt>
              <dd>{formatDate(t.delivery?.estimatedDeliveryDate)}</dd>
              {t.delivery?.deliveredAt && (
                <>
                  <dt>Delivered at</dt>
                  <dd>{formatDateTime(t.delivery.deliveredAt)}</dd>
                </>
              )}
              <dt>Items</dt>
              <dd>{t.itemCount}</dd>
              <dt>Total</dt>
              <dd>{formatCurrency(t.total)}</dd>
            </dl>
          </div>
          <div className="card">
            <h3>Delivering to</h3>
            <AddressBlock address={t.shippingAddress} />
          </div>
          <div className="card">
            <h3>Updates</h3>
            <StatusHistory history={t.history} />
          </div>
        </div>
      </div>
    </div>
  );
}
