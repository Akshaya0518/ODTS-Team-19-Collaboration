/**
 * COMPONENT TESTS (React Testing Library + Vitest)
 * These run without the backend: network calls are replaced with fake responses.
 */
import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DeliveryTimeline from '../components/tracking/DeliveryTimeline';
import { StatusBadge } from '../components/ui';
import ProtectedRoute from '../routes/ProtectedRoute';
import Login from '../pages/public/Login';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { validateRegistration, passwordProblems } from '../utils/validation';

/** Replaces window.fetch: `routes` maps "METHOD /path" to [status, body]. */
function mockFetch(routes) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options = {}) => {
    const key = `${options.method || 'GET'} ${String(url).split('?')[0]}`;
    const [status, body] = routes[key] || [404, { success: false, message: `No mock for ${key}` }];
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  });
}

const renderWithApp = (ui, { route = '/' } = {}) =>
  render(
    <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );

describe('StatusBadge', () => {
  test('FE-01 shows the customer label "Order Placed" for Pending', () => {
    render(<StatusBadge status="Pending" customerLabel />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Order Placed');
  });

  test('FE-02 shows the raw status for admins', () => {
    render(<StatusBadge status="Out for Delivery" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Out for Delivery');
  });
});

describe('DeliveryTimeline', () => {
  test('FE-03 renders the six steps with done / current / upcoming states from the API', () => {
    const states = ['done', 'done', 'done', 'current', 'upcoming', 'upcoming'];
    const labels = ['Order Placed', 'Order Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];
    const steps = labels.map((label, i) => ({ status: label, label, state: states[i], at: i < 4 ? '2026-10-09T10:00:00Z' : null }));
    render(<DeliveryTimeline steps={steps} />);
    const items = screen.getAllByTestId('timeline-step');
    expect(items).toHaveLength(6);
    expect(items.map((li) => li.dataset.state)).toEqual(states);
    expect(within(items[3]).getByText('Shipped')).toBeInTheDocument();
    expect(within(items[5]).getByText('Pending')).toBeInTheDocument(); // not reached yet
  });
});

describe('Client-side validation helpers', () => {
  test('FE-04 password rules mirror the backend', () => {
    expect(passwordProblems('Abcdef12')).toEqual([]);
    expect(passwordProblems('abc')).toEqual(['at least 8 characters', 'an upper-case letter', 'a number']);
  });

  test('FE-05 registration form reports every invalid field', () => {
    const errors = validateRegistration({ name: 'A', email: 'x', mobile: '123', password: 'a', confirmPassword: 'b', address: {} });
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(['name', 'email', 'mobile', 'password', 'confirmPassword', 'address.line1', 'address.pincode'])
    );
  });
});

describe('ProtectedRoute', () => {
  test('FE-06 redirects to /login when nobody is logged in', async () => {
    mockFetch({ 'GET /api/auth/me': [401, { success: false, message: 'Please log in to continue' }] });
    renderWithApp(
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><div>Secret admin page</div></ProtectedRoute>} />
      </Routes>,
      { route: '/admin' }
    );
    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Secret admin page')).not.toBeInTheDocument();
  });

  test('FE-07 blocks a customer from an admin page', async () => {
    mockFetch({ 'GET /api/auth/me': [200, { success: true, data: { user: { name: 'Arun', role: 'customer' } } }] });
    renderWithApp(
      <Routes>
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><div>Secret admin page</div></ProtectedRoute>} />
      </Routes>,
      { route: '/admin' }
    );
    expect(await screen.findByText("You don't have access to this page")).toBeInTheDocument();
    expect(screen.queryByText('Secret admin page')).not.toBeInTheDocument();
  });
});

describe('Login page', () => {
  test('FE-08 shows validation messages and does not call the API for empty input', async () => {
    const fetchSpy = mockFetch({ 'GET /api/auth/me': [401, { success: false, message: 'no' }] });
    renderWithApp(<Login />, { route: '/login' });
    await userEvent.click(await screen.findByTestId('login-submit'));
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('/auth/login'))).toBe(false);
  });

  test('FE-09 shows the server error message for a wrong password', async () => {
    mockFetch({
      'GET /api/auth/me': [401, { success: false, message: 'no' }],
      'POST /api/auth/login': [401, { success: false, message: 'Invalid email or password' }],
    });
    renderWithApp(<Login />, { route: '/login' });
    await userEvent.type(await screen.findByTestId('login-email'), 'arun@example.com');
    await userEvent.type(screen.getByTestId('login-password'), 'Wrong@123');
    await userEvent.click(screen.getByTestId('login-submit'));
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });
});
