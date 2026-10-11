import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../services/endpoints';
import { useToast } from '../../context/ToastContext';
import { Field, ErrorMessage, Alert } from '../../components/ui';
import { passwordProblems } from '../../utils/validation';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const found = {};
    const problems = passwordProblems(form.password);
    if (problems.length) found.password = `Password needs ${problems.join(', ')}`;
    if (form.password !== form.confirmPassword) found.confirmPassword = 'Passwords do not match';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setError(null);
    try {
      await authApi.resetPassword({ token, ...form });
      toast.success('Password updated. Please log in.');
      navigate('/login');
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-wrap">
        <Alert type="error">This reset link is missing its token. Please request a new one.</Alert>
        <p>
          <Link to="/forgot-password">Request a new link</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="card stack">
        <h1>Choose a new password</h1>
        <form onSubmit={handleSubmit} className="stack" noValidate>
          <Field label="New password" htmlFor="password" error={errors.password} hint="8+ characters with upper case, lower case and a number">
            <input id="password" type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword}>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            />
          </Field>
          <ErrorMessage error={error} />
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
