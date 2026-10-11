import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userApi } from '../../services/endpoints';
import { Field, ErrorMessage, PageHeader } from '../../components/ui';
import AddressFields from '../../components/forms/AddressFields';
import { formatDate, initials, formatAddress } from '../../utils/format';
import { MOBILE_RE, validateAddress } from '../../utils/validation';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => ({
    name: user.name,
    mobile: user.mobile,
    address: user.address || { line1: '', city: '', state: '', pincode: '' },
  }));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const isCustomer = user.role === 'customer';

  async function save(e) {
    e.preventDefault();
    const found = isCustomer ? validateAddress(form.address) : {};
    if (!form.name || form.name.trim().length < 2) found.name = 'Name must be at least 2 characters';
    if (!MOBILE_RE.test(form.mobile)) found.mobile = 'Enter a valid 10-digit mobile number';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setError(null);
    try {
      const body = { name: form.name, mobile: form.mobile, ...(isCustomer && { address: form.address }) };
      const data = await userApi.updateProfile(body);
      setUser(data.user);
      toast.success('Profile updated');
      setEditing(false);
    } catch (err) {
      setErrors(err.fieldErrors ? err.fieldErrors() : {});
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader title="My profile" />
      <div className="card stack">
        <div className="row">
          <span className="avatar" style={{ width: 56, height: 56, fontSize: '1.2rem' }}>
            {initials(user.name)}
          </span>
          <div>
            <h2 style={{ margin: 0 }} data-testid="profile-name">
              {user.name}
            </h2>
            <div className="muted small" style={{ textTransform: 'capitalize' }}>
              {user.role === 'delivery' ? 'Delivery personnel' : user.role} · member since {formatDate(user.createdAt)}
            </div>
          </div>
          {!editing && (
            <button type="button" className="btn btn-outline" style={{ marginLeft: 'auto' }} onClick={() => setEditing(true)}>
              Edit profile
            </button>
          )}
        </div>

        {!editing ? (
          <dl className="kv">
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Mobile</dt>
            <dd>{user.mobile}</dd>
            {isCustomer && (
              <>
                <dt>Delivery address</dt>
                <dd>{formatAddress(user.address)}</dd>
              </>
            )}
          </dl>
        ) : (
          <form className="stack" onSubmit={save} noValidate>
            <div className="form-grid">
              <Field label="Full name" htmlFor="pname" error={errors.name}>
                <input id="pname" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Mobile" htmlFor="pmobile" error={errors.mobile}>
                <input id="pmobile" className="input" maxLength={10} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
              </Field>
              <Field label="Email" hint="Email cannot be changed" className="span-2">
                <input className="input" value={user.email} disabled />
              </Field>
            </div>
            {isCustomer && (
              <>
                <h3>Default delivery address</h3>
                <AddressFields value={form.address} onChange={(address) => setForm({ ...form, address })} errors={errors} />
              </>
            )}
            <ErrorMessage error={error} />
            <div className="row">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
