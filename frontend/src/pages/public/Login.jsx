import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Field, ErrorMessage, Alert } from '../../components/ui';
import { EMAIL_RE } from '../../utils/validation';
import { ROLE_HOME } from '../../utils/status';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const found = {};
    if (!EMAIL_RE.test(form.email)) found.email = 'Enter a valid email address';
    if (!form.password) found.password = 'Password is required';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setError(null);
    try {
      const loggedIn = await login(form);
      const from = location.state?.from;
      // Go back to the page that asked for a login, if it belongs to this role (or any shared page).
      const home = ROLE_HOME[loggedIn.role];
      const shared = ['/notifications', '/profile'];
      const canReturn = from && (loggedIn.role === 'customer' || from.startsWith(home) || shared.includes(from));
      const target = canReturn ? from : home;
      navigate(target, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card stack">
        <div>
          <h1>Welcome back</h1>
          <p className="muted">Log in as a customer, administrator or delivery partner.</p>
        </div>
        {location.state?.from && <Alert type="info">Please log in to continue.</Alert>}
        <form onSubmit={handleSubmit} className="stack" noValidate>
          <Field label="Email" htmlFor="email" error={errors.email}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={`input${errors.email ? ' invalid' : ''}`}
              value={form.email}
              onChange={set('email')}
              data-testid="login-email"
            />
          </Field>
          <Field label="Password" htmlFor="password" error={errors.password}>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className={`input${errors.password ? ' invalid' : ''}`}
              value={form.password}
              onChange={set('password')}
              data-testid="login-password"
            />
          </Field>
          <ErrorMessage error={error} />
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting} data-testid="login-submit">
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <div className="row between small">
          <Link to="/forgot-password">Forgot password?</Link>
          <span>
            New here? <Link to="/register">Create an account</Link>
          </span>
        </div>
        {import.meta.env.DEV && (
          <div className="demo-box">
            <strong>Demo accounts (development):</strong> created by <code>npm run seed</code> in the backend. The
            emails and passwords are the <code>SEED_*</code> values in <code>backend/.env</code> — see the README.
          </div>
        )}
      </div>
    </div>
  );
}
