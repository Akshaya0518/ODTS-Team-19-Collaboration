import { useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../../services/endpoints';
import { useAsync, useDebounced } from '../../hooks/useAsync';
import { Loader, ErrorMessage, EmptyState, PageHeader, Pagination, StatusBadge } from '../../components/ui';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { ORDER_STATUSES, statusMeta } from '../../utils/status';

export default function MyOrders() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const { data, loading, error, reload } = useAsync(() => orderApi.mine({ status, q, page, limit: 10 }), [status, q, page]);

  return (
    <div>
      <PageHeader title="My orders" subtitle="Your full order history. Search by order ID or filter by status." />
      <div className="card flush">
        <div className="toolbar" style={{ padding: '16px 16px 0' }}>
          <input
            className="input grow"
            type="search"
            placeholder="Search by order ID (e.g. ODTS-20261009-0001)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search orders"
            data-testid="orders-search"
          />
          <select
            className="select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusMeta(s).label}
              </option>
            ))}
          </select>
        </div>
        {loading && <Loader />}
        <div style={{ padding: '0 16px' }}>
          <ErrorMessage error={error} onRetry={reload} />
        </div>
        {data && !loading && data.items.length === 0 && (
          <EmptyState
            icon="📦"
            title={status || q ? 'No matching orders' : 'You have not placed any orders yet'}
            action={
              !status && !q && (
                <Link to="/products" className="btn btn-primary">
                  Start shopping
                </Link>
              )
            }
          />
        )}
        {data && !loading && data.items.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table" data-testid="my-orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Placed</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((o) => (
                    <tr key={o.orderId}>
                      <td className="mono">
                        <Link to={`/customer/orders/${o.orderId}`}>{o.orderId}</Link>
                      </td>
                      <td className="nowrap">{formatDateTime(o.createdAt)}</td>
                      <td>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                      <td className="nowrap">{formatCurrency(o.total)}</td>
                      <td>
                        <StatusBadge status={o.status} customerLabel />
                      </td>
                      <td className="text-right nowrap">
                        <Link to={`/customer/orders/${o.orderId}`} className="btn btn-sm btn-ghost">
                          Details
                        </Link>
                        <Link to={`/customer/orders/${o.orderId}/track`} className="btn btn-sm btn-outline">
                          Track
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
