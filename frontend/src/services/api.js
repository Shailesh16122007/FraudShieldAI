// API service layer: every call goes to the Django backend. There are no offline
// fallbacks, so the UI only ever shows real data (or a clear error).

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : '';
}

async function request(url, { method = 'GET', body, form } = {}) {
  const headers = { 'X-Requested-With': 'XMLHttpRequest' };
  if (method !== 'GET') headers['X-CSRFToken'] = getCookie('csrftoken');
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body: payload, credentials: 'same-origin' });
  } catch {
    throw new ApiError('Cannot reach the FraudShield server. Is `python manage.py runserver` running?', 0);
  }

  let data = null;
  const type = res.headers.get('content-type') || '';
  if (type.includes('application/json')) data = await res.json();

  if (!res.ok) {
    if (res.status === 401 && !url.includes('/accounts/api/login/')) onUnauthorized();
    const message = data?.error || (res.status === 403
      ? 'Request blocked (CSRF check failed). Reload the page and try again.'
      : `Server error (${res.status}).`);
    throw new ApiError(message, res.status);
  }
  return data;
}

function qs(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.append(k, v);
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}

// Auth
export const getCurrentUser = () => request('/accounts/api/user/');
export const loginUser = (username, password) => request('/accounts/api/login/', { method: 'POST', body: { username, password } });
export const logoutUser = () => request('/accounts/api/logout/', { method: 'POST' });
export const updateProfile = (data) => request('/accounts/api/profile/', { method: 'POST', body: data });
export const changePassword = (data) => request('/accounts/api/password/', { method: 'POST', body: data });

// Predictions
export const runPrediction = (payload) => request('/prediction/api/predict/', { method: 'POST', body: payload });
export const fetchSample = (kind) => request(`/prediction/api/sample/${qs({ kind })}`);
export function uploadBatchCSV(file) {
  const form = new FormData();
  form.append('csv_file', file);
  return request('/prediction/api/upload/', { method: 'POST', form });
}
export const fetchHistory = (params = {}) => request(`/prediction/api/history/${qs(params)}`);
export const fetchPrediction = (id) => request(`/prediction/api/history/${id}/`);
export const toggleFlag = (id, flagged) => request(`/prediction/api/history/${id}/flag/`, { method: 'POST', body: flagged === undefined ? {} : { flagged } });
export const deletePrediction = (id) => request(`/prediction/api/history/${id}/delete/`, { method: 'POST' });
export const clearHistory = () => request('/prediction/api/history/clear/', { method: 'POST' });
export const exportCsvUrl = (params = {}) => `/prediction/api/export-csv/${qs(params)}`;

// Analytics
export const fetchDashboard = (period) => request(`/analytics/api/dashboard/${qs({ period })}`);
export const fetchAnalytics = (period) => request(`/analytics/api/analytics/${qs({ period })}`);
export const fetchNotifications = () => request('/analytics/api/notifications/');
export const retrainModels = () => request('/analytics/api/train/', { method: 'POST' });
