import { useState } from 'react';
import { deliveryApi, userApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { todayISO } from '../../utils/format';
import { ErrorMessage, Field, Spinner } from '../ui';

/**
 * Assign (or reassign) a delivery person to an order. Used on the
 * admin order page and on the "Assign deliveries" page.
 */
export default function AssignDeliveryForm({ orderId, currentAssigneeId, onAssigned }) {
  const toast = useToast();
  const { data, loading, error } = useAsync(() => userApi.deliveryPersonnel(), []);
  const [personId, setPersonId] = useState(currentAssigneeId || '');
  const [eta, setEta] = useState(todayISO(2));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const activePeople = (data?.personnel || []).filter((p) => p.isActive);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!personId) {
      setFormError(new Error('Please choose a delivery person'));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const result = await deliveryApi.assign({ orderId, deliveryPersonId: personId, estimatedDeliveryDate: eta || undefined });
      toast.success(`${result.reassigned ? 'Reassigned' : 'Assigned'} to ${result.delivery.assignedTo.name}`);
      onAssigned?.(result.delivery);
    } catch (err) {
      setFormError(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <form onSubmit={handleSubmit} className="stack" data-testid="assign-form">
      <Field label="Delivery person" htmlFor={`person-${orderId}`}>
        <select
          id={`person-${orderId}`}
          className="select"
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
          data-testid="assign-person"
        >
          <option value="">Select…</option>
          {activePeople.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name} · {p.stats?.active ?? 0} active
            </option>
          ))}
        </select>
      </Field>
      <Field label="Estimated delivery date" htmlFor={`eta-${orderId}`}>
        <input id={`eta-${orderId}`} type="date" className="input" min={todayISO()} value={eta} onChange={(e) => setEta(e.target.value)} />
      </Field>
      <ErrorMessage error={formError} />
      <button type="submit" className="btn btn-primary" disabled={saving} data-testid="assign-submit">
        {saving ? 'Saving…' : currentAssigneeId ? 'Reassign delivery' : 'Assign delivery'}
      </button>
    </form>
  );
}
