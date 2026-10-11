/**
 * Client-side checks give instant feedback while typing.
 * The BACKEND repeats every check — these are for convenience, not security.
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MOBILE_RE = /^[6-9]\d{9}$/;
export const PINCODE_RE = /^\d{6}$/;

export function passwordProblems(password = '') {
  const problems = [];
  if (password.length < 8) problems.push('at least 8 characters');
  if (!/[a-z]/.test(password)) problems.push('a lower-case letter');
  if (!/[A-Z]/.test(password)) problems.push('an upper-case letter');
  if (!/\d/.test(password)) problems.push('a number');
  return problems;
}

const ADDRESS_RULES = [
  ['line1', (v) => v.trim().length >= 5, 'Enter your street address'],
  ['city', (v) => v.trim().length >= 2, 'City is required'],
  ['state', (v) => v.trim().length >= 2, 'State is required'],
  ['pincode', (v) => PINCODE_RE.test(v), 'Pincode must be 6 digits'],
];

export function validateAddress(address, prefix = 'address.') {
  const errors = {};
  for (const [field, isValid, message] of ADDRESS_RULES) {
    if (!isValid(String(address?.[field] ?? ''))) errors[`${prefix}${field}`] = message;
  }
  return errors;
}

export function validateRegistration(form) {
  const errors = {};
  if (!form.name || form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (!EMAIL_RE.test(form.email || '')) errors.email = 'Enter a valid email address';
  if (!MOBILE_RE.test(form.mobile || '')) errors.mobile = 'Enter a valid 10-digit mobile number';
  const pw = passwordProblems(form.password);
  if (pw.length) errors.password = `Password needs ${pw.join(', ')}`;
  if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';
  return { ...errors, ...validateAddress(form.address) };
}
