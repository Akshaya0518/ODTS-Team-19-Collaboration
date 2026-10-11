import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../services/endpoints';
import { Field, ErrorMessage, Alert } from '../../components/ui';
import { EMAIL_RE } from '../../utils/validation';

/**
 * DEMO password reset: no email service is configured in this prototype.
 * In development the backend returns the reset link (and prints it in the backend terminal).
 * In production it returns nothing secret.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setFieldError('Enter a valid email address');
      return;
    }
    setFieldError('');
    setSubmitting(true);
    setError(null);
    try {
      const data = await authApi.forgotPassword({ email });
      setResult(data || {});
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
          <h1>Reset your password</h1>
          <p className="muted">Enter your account email to generate a reset link.</p>
        </div>
        <Alert type="warning">
          <strong>Demo limitation:</strong> this prototype does not send emails. In development mode the reset link is
          shown below and printed in the backend terminal. It expires in 15 minutes.
        </Alert>
        {result ? (
          <div className="stack">
            <Alert type="success">If an account exists for this email, a reset link has been generated.</Alert>
            {result.devResetUrl && (
              <div className="demo-box">
                <strong>Development-only reset link:</strong>
                <br />
                <a href={result.devResetUrl} data-testid="dev-reset-link">
                  Open reset page
                </a>
              </div>
            )}
            <Link to="/login">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="stack" noValidate>
            <Field label="Email" htmlFor="email" error={fieldError}>
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <ErrorMessage error={error} />
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Please wait…' : 'Generate reset link'}
            </button>
            <Link to="/login" className="small">
              Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
