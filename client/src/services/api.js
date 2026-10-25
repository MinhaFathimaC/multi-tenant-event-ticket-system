const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'Network request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => request('/auth/me'),
  switchDemoUser: (role) => request(`/auth/switch-demo/${role}`),

  // Events
  getEvents: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.category) searchParams.set('category', params.category);
    if (params.search) searchParams.set('search', params.search);
    if (params.tenant_id) searchParams.set('tenant_id', params.tenant_id);
    if (params.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    return request(`/events${qs ? `?${qs}` : ''}`);
  },
  getEventById: (id) => request(`/events/${id}`),
  createEvent: (eventData) => request('/events', { method: 'POST', body: JSON.stringify(eventData) }),
  updateEvent: (id, eventData) => request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(eventData) }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE' }),

  // Reservations
  holdTickets: (eventId, tierId, quantity = 1) =>
    request('/reservations/hold', { method: 'POST', body: JSON.stringify({ eventId, tierId, quantity }) }),
  getActiveReservation: () => request('/reservations/active'),
  cancelReservation: (id) => request(`/reservations/${id}`, { method: 'DELETE' }),
  cleanupExpiredHolds: () => request('/reservations/cleanup', { method: 'POST' }),

  // Payments & Orders
  simulatePayment: (payload) => request('/payments/simulate', { method: 'POST', body: JSON.stringify(payload) }),
  getOrder: (id) => request(`/payments/orders/${id}`),
  getMyTickets: () => request('/payments/my-tickets'),

  // Analytics
  getDashboardAnalytics: (tenantId = null) => {
    const qs = tenantId ? `?tenant_id=${tenantId}` : '';
    return request(`/analytics/dashboard${qs}`);
  },

  // Admin & Stress Test
  getSystemStatus: () => request('/admin/status'),
  getTenants: () => request('/admin/tenants'),
  createTenant: (tenantData) => request('/admin/tenants', { method: 'POST', body: JSON.stringify(tenantData) }),
  getUsers: () => request('/admin/users'),
  runConcurrencyStressTest: (params) =>
    request('/admin/stress-test', { method: 'POST', body: JSON.stringify(params) })
};

export default api;
