/**
 * ONE place that talks to the backend.
 * Every page calls functions from services/endpoints.js, which all use apiRequest() below.
 *
 * - The login cookie is sent automatically (credentials: 'include').
 * - Errors are turned into ApiRequestError with a readable message and field errors.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiRequestError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }

  /** Converts [{ field, message }] into { field: message } for forms. */
  fieldErrors() {
    return Object.fromEntries((this.errors || []).map((e) => [e.field, e.message]));
  }
}

function buildUrl(path, query) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.append(key, value);
  });
  const qs = params.toString();
  return `${BASE_URL}${path}${qs ? `?${qs}` : ''}`;
}

const SERVER_DOWN =
  'Cannot reach the server. Make sure the backend is running (npm run dev in the backend folder).';

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toError(response, payload) {
  if (response.status === 401) window.dispatchEvent(new CustomEvent('odts:unauthorized'));
  // The Vite proxy answers 500/502/504 without JSON when the backend is not running.
  const fallback = [500, 502, 503, 504].includes(response.status) ? SERVER_DOWN : `Request failed (${response.status})`;
  return new ApiRequestError(payload?.message || fallback, response.status, payload?.errors || []);
}

/** Options for fetch(): JSON body (if any) and the login cookie. */
function buildInit({ method = 'GET', body, signal }) {
  const init = { method, credentials: 'include', signal };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  return init;
}

export async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(buildUrl(path, options.query), buildInit(options));
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiRequestError(SERVER_DOWN, 0);
  }

  if (options.raw && response.ok) return response;
  const payload = await readJson(response);
  if (!response.ok) throw toError(response, payload);
  return payload?.data;
}
