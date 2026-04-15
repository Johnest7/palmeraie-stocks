/**
 * api.js
 * ------
 * A shared API client used by all pages.
 * 
 * WHY THIS FILE EXISTS:
 * Every page needs to call the backend. Instead of repeating the same
 * fetch() boilerplate everywhere, we centralize it here.
 * 
 * This file provides:
 * - api.get('/products')         → GET request
 * - api.post('/shopping', data)  → POST request
 * - api.postForm('/shopping', formData) → POST with file upload
 * - Automatic Authorization header with the stored JWT token
 * - Automatic redirect to login if token is missing or expired
 */

// API_BASE is loaded from config.js, reads from environment

// Get the stored token
function getToken() {
  return localStorage.getItem('token');
}

// Get the stored user info
function getCurrentUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

// Logout: clear storage and redirect to login
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// Core fetch wrapper
async function apiFetch(path, options = {}) {
  const token = getToken();
  if (!token) {
    logout();
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    ...(options.headers || {})
  };

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    logout();
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erreur serveur' }));
    throw new Error(err.detail || 'Erreur inconnue');
  }

  return res.json();
}

// Public API object
const api = {
  get: (path) => apiFetch(path),

  post: (path, data) => apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  put: (path, data) => apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  delete: (path) => apiFetch(path, { method: 'DELETE' }),

  // For file uploads (receipt photos)
  postForm: (path, formData) => apiFetch(path, {
    method: 'POST',
    body: formData
  })
};
