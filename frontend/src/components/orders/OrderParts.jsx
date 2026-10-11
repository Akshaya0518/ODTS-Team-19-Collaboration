/** Pieces of an order that appear on customer, admin and delivery pages. */
import { formatCurrency, formatDateTime } from '../../utils/format';
import { statusMeta } from '../../utils/status';

export function OrderItemsTable({ items = [] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Product</th>
            <th className="text-right">Unit price</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Line total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.product?._id || item.product}>
              <td>{item.name}</td>
              <td className="text-right">{formatCurrency(item.unitPrice)}</td>
              <td className="text-right">{item.quantity}</td>
              <td className="text-right">{formatCurrency(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OrderTotals({ order }) {
  return (
    <div>
      <div className="summary-line">
        <span className="muted">Subtotal</span>
        <span>{formatCurrency(order.subtotal)}</span>
      </div>
      <div className="summary-line">
        <span className="muted">Delivery fee</span>
        <span>{order.deliveryFee ? formatCurrency(order.deliveryFee) : 'Free'}</span>
      </div>
      <div className="summary-line total">
        <span>Total</span>
        <span data-testid="order-total">{formatCurrency(order.total)}</span>
      </div>
    </div>
  );
}

/** Status history, newest first. Accepts entries from the order or the tracking API. */
export function StatusHistory({ history = [] }) {
  const entries = [...history].sort((a, b) => new Date(b.at) - new Date(a.at));
  return (
    <ul className="history" data-testid="status-history">
      {entries.map((h, index) => {
        const by = h.by || h.changedBy;
        return (
          <li key={`${h.status}-${h.at}-${index}`}>
            <span className="bullet" style={{ background: `var(--${toneVar(h.status)})` }} />
            <div>
              <strong>{h.status === 'Pending' ? 'Order placed' : h.status}</strong>
              <div className="small muted">
                {formatDateTime(h.at)}
                {by?.name && ` · by ${by.name} (${by.role || h.role})`}
              </div>
              {h.note && <div className="note">{h.note}</div>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function toneVar(status) {
  const tone = statusMeta(status).tone;
  return { slate: 'slate-400', blue: 'blue-600', violet: 'violet-600', amber: 'amber-600', teal: 'teal-500', green: 'green-600', red: 'red-600' }[tone];
}

export function AddressBlock({ address }) {
  if (!address) return <span className="muted">—</span>;
  return (
    <address style={{ fontStyle: 'normal', lineHeight: 1.6 }}>
      {address.recipientName && <strong>{address.recipientName}</strong>}
      {address.recipientName && <br />}
      {address.line1}
      <br />
      {address.city}, {address.state} – {address.pincode}
      {address.mobile && (
        <>
          <br />
          <span className="muted">📞 {address.mobile}</span>
        </>
      )}
    </address>
  );
}
