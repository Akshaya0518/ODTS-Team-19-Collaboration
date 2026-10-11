/** Loading, empty and message components used on every page. */

export function Loader({ label = 'Loading…', full = false }) {
  return (
    <div className={`loader${full ? ' full' : ''}`} role="status" data-testid="loader">
      <div className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function Spinner({ small = true }) {
  return <span className={`spinner${small ? ' sm' : ''}`} aria-hidden="true" />;
}

export function EmptyState({ icon = '📭', title, children, action }) {
  return (
    <div className="empty" data-testid="empty-state">
      <div className="empty-icon" aria-hidden="true">
        {icon}
      </div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

/** Shows an error from the API (or any Error) with an optional retry button. */
export function ErrorMessage({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="alert alert-error" role="alert" data-testid="error-message">
      <div className="row between">
        <span>{error.message || 'Something went wrong.'}</span>
        {onRetry && (
          <button type="button" className="btn btn-sm btn-outline" onClick={() => onRetry()}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function Alert({ type = 'info', children, testId }) {
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'} data-testid={testId}>
      {children}
    </div>
  );
}
