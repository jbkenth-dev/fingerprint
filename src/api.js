/**
 * API helper for Francis Key frontend.
 * Handles auth token injection and API base URL configuration.
 */

/**
 * Normalize the API base URL.
 * - If VITE_API_BASE contains an absolute HTTP(S) URL, use it as-is.
 *   This avoids issues with proxies in production when the frontend and backend are on different origins.
 *   If it's already a relative path (e.g. "/api"), use it as-is.
 *   Note: Using an absolute URL from a different origin may cause CORS issues; ensure the backend
 *   is configured to allow the frontend's origin.
 */
function resolveApiBase() {
  const raw = import.meta.env.VITE_API_BASE || '/api';
  // If raw is an absolute URL, use it as-is.
  try {
    new URL(raw);
    return raw;
  } catch {
    // Not a valid URL — treat it as a relative path (the normal case).
  }
  return raw;
}

const API_BASE = resolveApiBase();
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
    // Use a contextual fallback: "session expired" makes no sense during a login attempt
    // since there is no session yet.
    const fallback = isLoginAttempt
      ? 'Sign in failed. Please check your credentials and try again.'
      : 'Session expired. Please sign in again.';
    throw new Error(data.error || fallback);
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

export { API_BASE };