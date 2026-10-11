import { useState } from 'react';
import { ConfirmDialog } from '../ui';
import { ACTION_LABELS } from '../../utils/status';

/**
 * One button per status the CURRENT USER is allowed to move to.
 * The list (`allowed`) comes from the backend, so buttons never offer
 * a move the server would reject.
 *
 * onChange(status, note) must return a promise.
 */
export default function StatusActions({ allowed = [], onChange, size = '' }) {
  const [pending, setPending] = useState(null);

  if (allowed.length === 0) return <span className="muted small">No further actions</span>;

  return (
    <>
      <div className="row">
        {allowed.map((status) => (
          <button
            key={status}
            type="button"
            className={`btn ${size} ${status === 'Cancelled' ? 'btn-outline' : 'btn-primary'}`}
            onClick={() => setPending(status)}
            data-testid={`status-action-${status.replace(/ /g, '-').toLowerCase()}`}
          >
            {ACTION_LABELS[status] || status}
          </button>
        ))}
      </div>
      {pending && (
        <ConfirmDialog
          title={ACTION_LABELS[pending] || `Change to ${pending}`}
          message={
            pending === 'Cancelled'
              ? 'Cancelling returns the items to stock and notifies the customer. This cannot be undone.'
              : `The order will move to "${pending}" and the customer will be notified.`
          }
          confirmLabel={ACTION_LABELS[pending] || 'Confirm'}
          danger={pending === 'Cancelled'}
          withNote
          notePlaceholder={pending === 'Cancelled' ? 'Reason for cancellation (optional)' : 'Note for the status history (optional)'}
          onCancel={() => setPending(null)}
          onConfirm={async (note) => {
            try {
              await onChange(pending, note);
            } finally {
              setPending(null);
            }
          }}
        />
      )}
    </>
  );
}
