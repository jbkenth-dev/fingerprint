/**
 * API helper for Francis Key frontend.
 * Handles auth token injection and API base URL configuration.
 */

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const STORAGE_KEY = 'francis-key-auth';

// In-memory token cache so apiFetch never races with localStorage effects.
let _authToken = null;

/**
 * Set the in-memory auth token (call immediately on login, before any navigation).
 */
export function setAuthToken(token) {
  _authToken = token;
}

/**
 * Clear the in-memory auth token (call on logout).
 */
export function clearAuthToken() {
  _authToken = null;
}

/**
 * Get the auth token — prefer the in-memory cache, fall back to localStorage.
 */
function getAuthToken() {
  if (_authToken) return _authToken;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      return session?.token || null;
    }
  } catch {
    // localStorage not available
  }
  return null;
}

/**
 * Clear the stored session (used on 401 responses).
 */
function clearSession() {
  _authToken = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Make an authenticated API request.
 *
 * @param {string} path - API path (e.g., '/users.php')
 * @param {object} [options] - Fetch options (method, body, headers, etc.)
 * @returns {Promise<any>} Parsed JSON response
 */
export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // Try to parse JSON, fall back to text
  let data;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  // Handle 401 — use the backend's actual error message (e.g. "Invalid credentials")
  // instead of a hardcoded string, so login failures show the right feedback.
  if (res.status === 401) {
    // Only clear session / dispatch expiry for non-login requests.
    // Login POST to auth.php returns 401 for wrong credentials — that's not a session expiry.
    const isLoginAttempt = path.endsWith('/auth.php') && (options.method || 'GET').toUpperCase() === 'POST';
    if (!isLoginAttempt) {
      clearSession();
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    throw new Error(data.error || 'Session expired. Please sign in again.');
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

export { API_BASE };