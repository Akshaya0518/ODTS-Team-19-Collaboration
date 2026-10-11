import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Field, ErrorMessage } from '../../components/ui';
import AddressFields from '../../components/forms/AddressFields';
import { validateRegistration } from '../../utils/validation';
import { ROLE_HOME } from '../../utils/status';

const EMPTY = {
  name: '',
  email: '',
  mobile: '',
  password: '',
  confirmPassword: '',
  address: { line1: '', city: '', state: 'Tamil Nadu', pincode: '' },
};

export default function Register() {
  const { user, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateRegistration(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setError(null);
    try {
      await register(form);
      toast.success('Welcome! Your account has been created.');
      navigate('/customer', { replace: true });
    } catch (err) {
      setErrors(err.fieldErrors ? err.fieldErrors() : {});
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  const input = (field, props = {}) => (
    <input
      id={field}
      className={`input${errors[field] ? ' invalid' : ''}`}
      value={form[field]}
      onChange={set(field)}
      data-testid={`register-${field}`}
      {...props}
    />
  );

  return (
    <div className="auth-wrap wide">
      <div className="card stack">
        <div>
          <h1>Create your account</h1>
          <p className="muted">Customer accounts only. Staff accounts are created by the administrator.</p>
        </div>
        <form onSubmit={handleSubmit} className="stack" noValidate>
          <div className="form-grid">
            <Field label="Full name" htmlFor="name" error={errors.name} className="span-2">
              {input('name', { autoComplete: 'name' })}
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email}>
              {input('email', { type: 'email', autoComplete: 'email' })}
            </Field>
            <Field label="Mobile number" htmlFor="mobile" error={errors.mobile} hint="10 digits, e.g. 9876543210">
              {input('mobile', { inputMode: 'numeric', maxLength: 10, autoComplete: 'tel' })}
            </Field>
            <Field label="Password" htmlFor="password" error={errors.password} hint="8+ characters with upper case, lower case and a number">
              {input('password', { type: 'password', autoComplete: 'new-password' })}
            </Field>
            <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword}>
              {input('confirmPassword', { type: 'password', autoComplete: 'new-password' })}
            </Field>
          </div>
          <h3 style={{ marginTop: 6 }}>Delivery address</h3>
          <AddressFields
            value={form.address}
            onChange={(address) => setForm((f) => ({ ...f, address }))}
            errors={errors}
            prefix="address."
          />
          <ErrorMessage error={error} />
          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting} data-testid="register-submit">
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="small">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
