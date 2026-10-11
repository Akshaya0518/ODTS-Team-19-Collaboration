import { useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../../services/endpoints';
import { useAsync, useDebounced } from '../../hooks/useAsync';
import { Loader, ErrorMessage, EmptyState, PageHeader, Pagination, StatusBadge } from '../../components/ui';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { ORDER_STATUSES } from '../../utils/status';

export default function AdminOrders() {
  const [filters, setFilters] = useState({ status: '', q: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const q = useDebounced(filters.q);
  const { data, loading, error, reload } = useAsync(
    () => orderApi.all({ status: filters.status, q, from: filters.from, to: filters.to, page, limit: 15 }),
    [filters.status, q, filters.from, filters.to, page]
  );
  const set = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setPage(1);
  };

  return (
    <div>
      <PageHeader title="Order management" subtitle="View every order, confirm, cancel and assign deliveries." />
      <div className="card flush">
        <div className="toolbar" style={{ padding: '16px 16px 0' }}>
          <input className="input grow" type="search" placeholder="Search order ID…" value={filters.q} onChange={set('q')} aria-label="Search order ID" data-testid="admin-orders-search" />
          <select className="select" value={filters.status} onChange={set('status')} aria-label="Status" data-testid="admin-orders-status">
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input type="date" className="input" value={filters.from} onChange={set('from')} aria-label="From date" />
          <input type="date" className="input" value={filters.to} onChange={set('to')} aria-label="To date" />
        </div>
        {loading && <Loader />}
        <div style={{ padding: '0 16px' }}>
          <ErrorMessage error={error} onRetry={reload} />
        </div>
        {data && !loading && data.items.length === 0 && <EmptyState title="No orders match these filters" />}
        {data && !loading && data.items.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table" data-testid="admin-orders-table">
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
                  {data.items.map((o) => (
                    <tr key={o.orderId} className={!o.assignedTo && ['Confirmed', 'Processing'].includes(o.status) ? 'highlight' : ''}>
                      <td className="mono">
                        <Link to={`/admin/orders/${o.orderId}`}>{o.orderId}</Link>
                      </td>
                      <td>
                        {o.customer?.name}
                        <div className="small muted">{o.customer?.email}</div>
                      </td>
                      <td className="nowrap">{formatDateTime(o.createdAt)}</td>
                      <td className="text-right">{formatCurrency(o.total)}</td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                      <td>{o.assignedTo?.name || <span className="muted">—</span>}</td>
                      <td className="text-right">
                        <Link to={`/admin/orders/${o.orderId}`} className="btn btn-sm btn-outline">
                          Manage
                        </Link>
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
