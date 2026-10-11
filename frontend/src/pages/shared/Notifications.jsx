import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { notificationApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { Loader, ErrorMessage, EmptyState, PageHeader, Pagination } from '../../components/ui';
import { formatDateTime, timeAgo } from '../../utils/format';

/** Where the "View" link of a notification should go, depending on who is reading it. */
function linkFor(role, n) {
  if (!n.orderId) return null;
  if (role === 'customer') return `/customer/orders/${n.orderId}/track`;
  if (role === 'delivery') return '/delivery/deliveries';
  return `/admin/orders/${n.orderId}`;
}

export default function Notifications() {
  const { user } = useAuth();
  const toast = useToast();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(
    () => notificationApi.list({ unreadOnly: unreadOnly ? 'true' : undefined, page, limit: 15 }),
    [unreadOnly, page]
  );

  async function markRead(id) {
    try {
      await notificationApi.markRead(id);
      reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function markAll() {
    try {
      const result = await notificationApi.markAllRead();
      toast.success(`${result.updated} notification(s) marked as read`);
      reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="In-app notifications only (no email or SMS is sent by this prototype)."
        actions={
          <button type="button" className="btn btn-outline" onClick={markAll} disabled={!data?.unreadCount} data-testid="mark-all-read">
            Mark all as read
          </button>
        }
      />
      <div className="card flush">
        <div className="toolbar" style={{ padding: '16px 18px 0' }}>
          <div className="tabs" role="tablist">
            <button type="button" className={`tab${!unreadOnly ? ' active' : ''}`} onClick={() => { setUnreadOnly(false); setPage(1); }}>
              All
            </button>
            <button type="button" className={`tab${unreadOnly ? ' active' : ''}`} onClick={() => { setUnreadOnly(true); setPage(1); }}>
              Unread {data ? `(${data.unreadCount})` : ''}
            </button>
          </div>
        </div>
        {loading && <Loader />}
        <div style={{ padding: '0 18px' }}>
          <ErrorMessage error={error} onRetry={reload} />
        </div>
        {data && !loading && data.items.length === 0 && <EmptyState icon="🔕" title="No notifications" />}
        {data && !loading && (
          <div data-testid="notification-list">
            {data.items.map((n) => {
              const link = linkFor(user.role, n);
              return (
                <div key={n._id} className={`notif${n.isRead ? '' : ' unread'}`} data-testid="notification">
                  <span className="dot" aria-label={n.isRead ? 'Read' : 'Unread'} />
                  <div className="body">
                    <div className="row between">
                      <strong>{n.title}</strong>
                      <span className="small muted" title={formatDateTime(n.createdAt)}>
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <div>{n.message}</div>
                    <div className="row" style={{ marginTop: 6 }}>
                      {link && (
                        <Link to={link} className="small" onClick={() => !n.isRead && markRead(n._id)}>
                          View order {n.orderId}
                        </Link>
                      )}
                      {!n.isRead && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => markRead(n._id)}>
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
