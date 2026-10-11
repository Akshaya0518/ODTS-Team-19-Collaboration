import { useState } from 'react';
import { userApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { Loader, ErrorMessage, EmptyState, PageHeader, Modal, ConfirmDialog, Field } from '../../components/ui';
import { formatDate } from '../../utils/format';
import { EMAIL_RE, MOBILE_RE, passwordProblems } from '../../utils/validation';

function NewPersonForm({ onSaved, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Name must be at least 2 characters';
    if (!EMAIL_RE.test(form.email)) found.email = 'Enter a valid email address';
    if (!MOBILE_RE.test(form.mobile)) found.mobile = 'Enter a valid 10-digit mobile number';
    const pw = passwordProblems(form.password);
    if (pw.length) found.password = `Password needs ${pw.join(', ')}`;
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    setError(null);
    try {
      await userApi.createDeliveryPerson(form);
      toast.success('Delivery person added');
      onSaved();
    } catch (err) {
      setErrors(err.fieldErrors ? err.fieldErrors() : {});
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Add delivery person"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="person-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Create account'}
          </button>
        </>
      }
    >
      <form id="person-form" className="stack" onSubmit={submit} noValidate>
        <Field label="Full name" htmlFor="dp-name" error={errors.name}>
          <input id="dp-name" className="input" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Email (login)" htmlFor="dp-email" error={errors.email}>
          <input id="dp-email" type="email" className="input" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Mobile" htmlFor="dp-mobile" error={errors.mobile}>
          <input id="dp-mobile" className="input" maxLength={10} value={form.mobile} onChange={set('mobile')} />
        </Field>
        <Field label="Temporary password" htmlFor="dp-pass" error={errors.password} hint="Share it privately; 8+ chars with upper, lower and a number">
          <input id="dp-pass" type="password" className="input" value={form.password} onChange={set('password')} />
        </Field>
        <ErrorMessage error={error} />
      </form>
    </Modal>
  );
}

export default function DeliveryPersonnel() {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState(null);
  const { data, loading, error, reload } = useAsync(() => userApi.deliveryPersonnel(), []);

  async function toggle(person) {
    try {
      await userApi.setActive(person._id, !person.isActive);
      toast.success(person.isActive ? 'Account deactivated' : 'Account activated');
      setToggling(null);
      reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Delivery personnel"
        subtitle="Staff accounts, current workload and completed deliveries."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            + Add delivery person
          </button>
        }
      />
      <div className="card flush">
        {loading && <Loader />}
        <div style={{ padding: error ? 16 : 0 }}>
          <ErrorMessage error={error} onRetry={reload} />
        </div>
        {data && data.personnel.length === 0 && <EmptyState title="No delivery personnel yet" />}
        {data && data.personnel.length > 0 && (
          <div className="table-wrap">
            <table className="table" data-testid="personnel-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th className="text-right">Active</th>
                  <th className="text-right">Delivered</th>
                  <th className="text-right">Cancelled</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.personnel.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>
                      {p.email}
                      <div className="small muted">{p.mobile}</div>
                    </td>
                    <td className="text-right">{p.stats.active}</td>
                    <td className="text-right">{p.stats.completed}</td>
                    <td className="text-right">{p.stats.cancelled}</td>
                    <td>
                      <span className={`badge ${p.isActive ? 'tone-green' : 'tone-slate'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="nowrap">{formatDate(p.createdAt)}</td>
                    <td className="text-right">
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => (p.isActive ? setToggling(p) : toggle(p))}>
                        {p.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {adding && (
        <NewPersonForm
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            reload({ silent: true });
          }}
        />
      )}
      {toggling && (
        <ConfirmDialog
          title="Deactivate delivery person?"
          message={`${toggling.name} will no longer be able to log in or receive new assignments.${toggling.stats.active ? ` They still have ${toggling.stats.active} active deliveries — reassign them first.` : ''}`}
          confirmLabel="Deactivate"
          danger
          onCancel={() => setToggling(null)}
          onConfirm={() => toggle(toggling)}
        />
      )}
    </div>
  );
}
