import { statusMeta } from '../../utils/status';

export function StatusBadge({ status, customerLabel = false }) {
  const meta = statusMeta(status);
  return (
    <span className={`badge tone-${meta.tone}`} data-testid="status-badge" data-status={status}>
      {customerLabel ? meta.label : status}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon, tone = 'teal', sub, testId }) {
  return (
    <div className="card stat" data-testid={testId}>
      <div className={`stat-icon tone-${tone}`} aria-hidden="true">
        {icon}
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, total, onPage }) {
  if (!totalPages || totalPages <= 1) {
    return total !== undefined ? <div className="pagination">{total} result(s)</div> : null;
  }
  return (
    <div className="pagination">
      <span>
        Page {page} of {totalPages} · {total} result(s)
      </span>
      <div className="row">
        <button type="button" className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ← Previous
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

/** Label + input + validation message. Pass the input element as children. */
export function Field({ label, error, hint, htmlFor, className = '', children }) {
  return (
    <div className={`field ${className}`}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? (
        <span className="error" role="alert">
          {error}
        </span>
      ) : (
        hint && <span className="hint">{hint}</span>
      )}
    </div>
  );
}
