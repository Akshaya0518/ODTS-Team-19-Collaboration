import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { deliveryApi, orderApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { Loader, ErrorMessage, StatusBadge, PageHeader, Field } from '../../components/ui';
import DeliveryTimeline from '../../components/tracking/DeliveryTimeline';
import StatusActions from '../../components/orders/StatusActions';
import { OrderItemsTable, AddressBlock } from '../../components/orders/OrderParts';
import { formatDate, formatDateTime } from '../../utils/format';

/** Loads the delivery AND its tracking timeline (the backend checks the assignment for both). */
async function loadDelivery(id) {
  const { delivery } = await deliveryApi.get(id);
  const { tracking } = await orderApi.tracking(delivery.order.orderId);
  return { delivery, tracking };
}

export default function DeliveryDetails() {
  const { id } = useParams();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const { data, loading, error, reload } = useAsync(() => loadDelivery(id), [id]);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;
  const { delivery, tracking } = data;
  const order = delivery.order;

  async function changeStatus(status, statusNote) {
    try {
      await deliveryApi.updateStatus(delivery._id, { status, note: statusNote });
      toast.success(`Status updated to ${status}`);
      reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function addNote(e) {
    e.preventDefault();
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      await deliveryApi.addNote(delivery._id, { text: note.trim() });
      setNote('');
      toast.success('Note added');
      reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div className="stack">
      <Link to="/delivery/deliveries" className="small">
        ← My deliveries
      </Link>
      <PageHeader
        title={<span className="mono" data-testid="delivery-order-id">{order.orderId}</span>}
        subtitle={`Expected by ${formatDate(delivery.estimatedDeliveryDate)}`}
        actions={<StatusBadge status={order.status} />}
      />

      <div className="grid grid-main-side">
        <div className="stack">
          <div className="card" data-testid="delivery-actions">
            <div className="card-header">
              <h3>Update delivery status</h3>
            </div>
            <StatusActions allowed={delivery.allowedNextStatuses} onChange={changeStatus} />
            {order.status === 'Confirmed' || order.status === 'Processing' ? (
              <p className="small muted" style={{ marginTop: 10 }}>
                The admin marks the order as shipped when it leaves the warehouse. You can then update it.
              </p>
            ) : null}
          </div>
          <div className="card">
            <h3>Progress</h3>
            <DeliveryTimeline steps={tracking.steps} />
          </div>
          <div className="card flush">
            <div className="card-header">
              <h3>Items to deliver</h3>
            </div>
            <OrderItemsTable items={order.items} />
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <h3>Deliver to</h3>
            <AddressBlock address={order.shippingAddress} />
            <p className="small muted" style={{ marginTop: 8 }}>
              Customer: {order.customer?.name}
            </p>
          </div>
          <div className="card stack">
            <h3 style={{ margin: 0 }}>Delivery notes</h3>
            {delivery.notes.length === 0 && <p className="muted small">No notes yet.</p>}
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
            <form onSubmit={addNote} className="stack">
              <Field label="Add a note" htmlFor="note">
                <textarea
                  id="note"
                  className="textarea"
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Customer asked to leave with security"
                  data-testid="note-input"
                />
              </Field>
              <button type="submit" className="btn btn-outline" disabled={savingNote || !note.trim()} data-testid="note-submit">
                {savingNote ? 'Saving…' : 'Save note'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
