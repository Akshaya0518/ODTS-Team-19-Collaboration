/**
 * Every backend endpoint the frontend uses, grouped by feature.
 * If an API URL changes, this is the only frontend file to update.
 * (Matches backend/src/routes/index.js — see documentation/api-documentation.md)
 */
import { apiRequest } from './api';

export const authApi = {
  me: () => apiRequest('/auth/me'),
  login: (body) => apiRequest('/auth/login', { method: 'POST', body }),
  register: (body) => apiRequest('/auth/register', { method: 'POST', body }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  forgotPassword: (body) => apiRequest('/auth/forgot-password', { method: 'POST', body }),
  resetPassword: (body) => apiRequest('/auth/reset-password', { method: 'POST', body }),
};

export const productApi = {
  list: (query) => apiRequest('/products', { query }),
  get: (id) => apiRequest(`/products/${id}`),
  create: (body) => apiRequest('/products', { method: 'POST', body }),
  update: (id, body) => apiRequest(`/products/${id}`, { method: 'PATCH', body }),
};

export const categoryApi = {
  list: (query) => apiRequest('/categories', { query }),
  create: (body) => apiRequest('/categories', { method: 'POST', body }),
  update: (id, body) => apiRequest(`/categories/${id}`, { method: 'PATCH', body }),
};

export const orderApi = {
  create: (body) => apiRequest('/orders', { method: 'POST', body }),
  mine: (query) => apiRequest('/orders/mine', { query }),
  all: (query) => apiRequest('/orders', { query }),
  get: (orderId) => apiRequest(`/orders/${orderId}`),
  tracking: (orderId) => apiRequest(`/orders/${orderId}/tracking`),
  updateStatus: (orderId, body) => apiRequest(`/orders/${orderId}/status`, { method: 'PATCH', body }),
  cancel: (orderId, body) => apiRequest(`/orders/${orderId}/cancel`, { method: 'POST', body }),
};

export const deliveryApi = {
  assign: (body) => apiRequest('/deliveries/assign', { method: 'POST', body }),
  list: (query) => apiRequest('/deliveries', { query }),
  get: (id) => apiRequest(`/deliveries/${id}`),
  updateStatus: (id, body) => apiRequest(`/deliveries/${id}/status`, { method: 'PATCH', body }),
  addNote: (id, body) => apiRequest(`/deliveries/${id}/notes`, { method: 'POST', body }),
};

export const notificationApi = {
  list: (query) => apiRequest('/notifications', { query }),
  markRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => apiRequest('/notifications/read-all', { method: 'PATCH' }),
};

export const userApi = {
  updateProfile: (body) => apiRequest('/users/me', { method: 'PATCH', body }),
  list: (query) => apiRequest('/users', { query }),
  deliveryPersonnel: () => apiRequest('/users/delivery-personnel'),
  createDeliveryPerson: (body) => apiRequest('/users/delivery-personnel', { method: 'POST', body }),
  setActive: (id, isActive) => apiRequest(`/users/${id}/status`, { method: 'PATCH', body: { isActive } }),
};

export const dashboardApi = {
  get: () => apiRequest('/dashboard'),
};

export const reportApi = {
  orders: (query) => apiRequest('/reports/orders', { query }),
  deliveries: (query) => apiRequest('/reports/deliveries', { query }),
  /** Downloads the CSV version of a report through the same authenticated request path. */
  async downloadCsv(type, query, filename) {
    const response = await apiRequest(`/reports/${type}`, { query: { ...query, format: 'csv' }, raw: true });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
