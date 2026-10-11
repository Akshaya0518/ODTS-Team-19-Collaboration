import { useState } from 'react';
import { Link } from 'react-router-dom';
import { deliveryApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { Loader, ErrorMessage, EmptyState, PageHeader, Pagination, StatusBadge } from '../../components/ui';
import { formatDate, formatAddress } from '../../utils/format';

/** The backend only returns deliveries assigned to the logged-in delivery person. */
export default function AssignedDeliveries() {
  const [scope, setScope] = useState('active');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => deliveryApi.list({ scope, page, limit: 15 }), [scope, page]);

  return (
    <div>
      <PageHeader title="My deliveries" subtitle="Only deliveries assigned to you are shown." />
      <div className="card flush">
        <div className="toolbar" style={{ padding: '16px 16px 0' }}>
          <div className="tabs" role="tablist">
            <button type="button" className={`tab${scope === 'active' ? ' active' : ''}`} onClick={() => { setScope('active'); setPage(1); }} data-testid="tab-active">
              Assigned
            </button>
            <button type="button" className={`tab${scope === 'completed' ? ' active' : ''}`} onClick={() => { setScope('completed'); setPage(1); }} data-testid="tab-completed">
              Previous deliveries
            </button>
          </div>
        </div>
        {loading && <Loader />}
        <div style={{ padding: '0 16px' }}>
          <ErrorMessage error={error} onRetry={reload} />
        </div>
        {data && !loading && data.items.length === 0 && (
          <EmptyState icon="🚚" title={scope === 'active' ? 'No assigned deliveries' : 'No previous deliveries yet'} />
        )}
        {data && !loading && data.items.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table" data-testid="my-deliveries-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Address</th>
                    <th>Expected</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((d) => (
                    <tr key={d._id}>
                      <td className="mono">{d.order.orderId}</td>
                      <td>
                        {d.order.customer?.name}
                        <div className="small muted">{d.order.shippingAddress?.mobile}</div>
                      </td>
                      <td>{formatAddress(d.order.shippingAddress)}</td>
                      <td className="nowrap">{formatDate(d.estimatedDeliveryDate)}</td>
                      <td>
                        <StatusBadge status={d.order.status} />
                      </td>
                      <td className="text-right">
                        <Link to={`/delivery/deliveries/${d._id}`} className="btn btn-sm btn-primary" data-testid="open-delivery">
                          Open
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
