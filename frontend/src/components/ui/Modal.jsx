import { useEffect, useState } from 'react';

export function Modal({ title, children, footer, onClose, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * "Are you sure?" dialog for destructive actions (cancel order, deactivate product…).
 * Optionally asks for a reason / note.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  withNote = false,
  notePlaceholder = 'Reason (optional)',
  onConfirm,
  onCancel,
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm(note.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={title}
      onClose={busy ? undefined : onCancel}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
            Go back
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
            disabled={busy}
            data-testid="confirm-button"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p>{message}</p>
      {withNote && (
        <textarea
          className="textarea"
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
          placeholder={notePlaceholder}
          aria-label="Note"
        />
      )}
    </Modal>
  );
}
