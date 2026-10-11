import { useState } from 'react';
import { reportApi, userApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { Loader, ErrorMessage, EmptyState, PageHeader, StatCard, StatusBadge } from '../../components/ui';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import { ORDER_STATUSES } from '../../utils/status';

const SHOWN_ROWS = 200;

export default function Reports() {
  const toast = useToast();
  const [type, setType] = useState('orders');
  const [filters, setFilters] = useState({ from: '', to: '', status: '', deliveryPersonId: '' });
  const [applied, setApplied] = useState(filters);
  const [downloading, setDownloading] = useState(false);
  const people = useAsync(() => userApi.deliveryPersonnel(), []);

  const query = {
    from: applied.from,
    to: applied.to,
    status: applied.status,
    ...(type === 'deliveries' && { deliveryPersonId: applied.deliveryPersonId }),
  };
  const report = useAsync(() => (type === 'orders' ? reportApi.orders(query) : reportApi.deliveries(query)), [type, applied]);

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  async function download() {
    setDownloading(true);
    try {
      await reportApi.downloadCsv(type, query, `odts-${type}-report.csv`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloading(false);
    }
  }

  const s = report.data?.summary;
  const rows = report.data?.rows || [];

  return (
    <div className="stack">
      <PageHeader
        title="Reports & analytics"
        subtitle="Order and delivery reports calculated from the database. Dates use the server's local time zone."
        actions={
          <button type="button" className="btn btn-outline" onClick={download} disabled={downloading || !rows.length} data-testid="download-csv">
            {downloading ? 'Preparing…' : '⬇ Export CSV'}
          </button>
        }
      />
      <div className="card">
        <form
          className="toolbar"
          style={{ marginBottom: 0 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (filters.from && filters.to && filters.from > filters.to) {
              toast.error('"From" date must be on or before "To" date');
              return;
            }
            setApplied(filters);
          }}
        >
          <div className="tabs" role="tablist">
            <button type="button" className={`tab${type === 'orders' ? ' active' : ''}`} onClick={() => setType('orders')}>
              Order report
            </button>
            <button type="button" className={`tab${type === 'deliveries' ? ' active' : ''}`} onClick={() => setType('deliveries')}>
              Delivery report
            </button>
          </div>
          <label className="field">
            <span className="small muted">From</span>
            <input type="date" className="input" value={filters.from} onChange={set('from')} />
          </label>
          <label className="field">
            <span className="small muted">To</span>
            <input type="date" className="input" value={filters.to} onChange={set('to')} />
          </label>
          <label className="field">
            <span className="small muted">Status</span>
            <select className="select" value={filters.status} onChange={set('status')}>
              <option value="">All</option>
              {ORDER_STATUSES.map((st) => (
                <option key={st}>{st}</option>
              ))}
            </select>
          </label>
          {type === 'deliveries' && (
            <label className="field">
              <span className="small muted">Delivery person</span>
              <select className="select" value={filters.deliveryPersonId} onChange={set('deliveryPersonId')}>
                <option value="">All</option>
                {(people.data?.personnel || []).map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="submit" className="btn btn-primary">
            Apply filters
          </button>
        </form>
      </div>

      {report.loading && <Loader label="Building report…" />}
      <ErrorMessage error={report.error} onRetry={report.reload} />

      {s && !report.loading && type === 'orders' && (
        <div className="grid grid-4">
          <StatCard label="Orders" value={s.totalOrders} icon="📦" tone="blue" testId="report-total-orders" />
          <StatCard label="Total order value" value={formatCurrency(s.totalOrderValue)} icon="₹" tone="green" sub="Excludes cancelled orders" testId="report-total-value" />
          <StatCard label="Delivered" value={s.deliveredOrders} icon="🏠" tone="teal" />
          <StatCard label="Pending deliveries" value={s.pendingDeliveries} icon="⏳" tone="amber" sub="Not delivered or cancelled" />
        </div>
      )}
      {s && !report.loading && type === 'deliveries' && (
        <>
          <div className="grid grid-4">
            <StatCard label="Deliveries assigned" value={s.totalDeliveries} icon="🚚" tone="blue" />
            <StatCard label="Delivered" value={s.deliveredOrders} icon="🏠" tone="green" />
            <StatCard label="Pending" value={s.pendingDeliveries} icon="⏳" tone="amber" />
            <StatCard label="Cancelled" value={s.cancelledDeliveries} icon="✖" tone="red" />
          </div>
          {s.byDeliveryPerson.length > 0 && (
            <div className="card flush">
              <div className="card-header">
                <h3>By delivery person</h3>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th className="text-right">Assigned</th>
                      <th className="text-right">Delivered</th>
                      <th className="text-right">Pending</th>
                      <th className="text-right">On time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.byDeliveryPerson.map((p) => (
                      <tr key={p.name}>
                        <td>{p.name}</td>
                        <td className="text-right">{p.assigned}</td>
                        <td className="text-right">{p.delivered}</td>
                        <td className="text-right">{p.pending}</td>
                        <td className="text-right">{p.onTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {report.data && !report.loading && (
        <div className="card flush">
          <div className="card-header">
            <h3>Rows</h3>
            <span className="small muted">
              {rows.length > SHOWN_ROWS ? `Showing first ${SHOWN_ROWS} of ${rows.length} — export CSV for all` : `${rows.length} row(s)`}
            </span>
          </div>
          {rows.length === 0 ? (
            <EmptyState icon="📄" title="No data for these filters" />
          ) : (
            <div className="table-wrap">
              {type === 'orders' ? (
                <table className="table" data-testid="report-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Created</th>
                      <th>Customer</th>
                      <th className="text-right">Items</th>
                      <th className="text-right">Total</th>
                      <th>Status</th>
                      <th>Delivery person</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, SHOWN_ROWS).map((r) => (
                      <tr key={r.orderId}>
                        <td className="mono">{r.orderId}</td>
                        <td className="nowrap">{formatDateTime(r.createdAt)}</td>
                        <td>{r.customerName}</td>
                        <td className="text-right">{r.items}</td>
                        <td className="text-right">{formatCurrency(r.total)}</td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                        <td>{r.assignedTo || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="table" data-testid="report-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Delivery person</th>
                      <th>Assigned</th>
                      <th>Expected</th>
                      <th>Status</th>
                      <th>Delivered</th>
                      <th>On time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, SHOWN_ROWS).map((r) => (
                      <tr key={r.orderId}>
                        <td className="mono">{r.orderId}</td>
                        <td>{r.assignedTo}</td>
                        <td className="nowrap">{formatDateTime(r.assignedAt)}</td>
                        <td className="nowrap">{formatDate(r.estimatedDeliveryDate)}</td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="nowrap">{r.deliveredAt ? formatDateTime(r.deliveredAt) : '—'}</td>
                        <td>{r.onTime || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
