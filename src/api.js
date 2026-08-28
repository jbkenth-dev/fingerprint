/**
 * API helper for Francis Key frontend.
 * Handles auth token injection and API base URL configuration.
 */

/**
 * Normalize the API base URL.
 * - If VITE_API_BASE contains an absolute HTTP(S) URL, strip it to just the
 *   path portion so the browser always talks to the same origin (Vercel proxy).
 *   This prevents "Mixed Content" errors when the env var points directly at
 *   the Awardspace backend over plain HTTP.
 *   - If it's already a relative path (e.g. "/api"), use it as-is.
 */
function resolveApiBase() {
  const raw = import.meta.env.VITE_API_BASE || '/api';
  try {
    // If the value is an absolute URL, extract only its pathname.
    const u = new URL(raw);
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      console.warn(
        `[api.js] VITE_API_BASE is an absolute URL (${raw}). ` +
        `Using path "${u.pathname}" instead so the Vercel proxy handles routing. ` +
        `Set VITE_API_BASE=/api in your Vercel environment to suppress this warning.`
      );
      return u.pathname; // e.g. "/api"
    }
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
  console.log('[api.js] setAuthToken: token set');
}

/**
 * Clear the in-memory auth token (call on logout).
 */
export function clearAuthToken() {
  _authToken = null;
  console.log('[api.js] clearAuthToken: token cleared');
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
      const token = session?.token || null;
      if (token) {
        console.log('[api.js] getAuthToken: token from localStorage, length:', token.length, 'prefix:', token.slice(0, 8));
      } else {
        console.log('[api.js] getAuthToken: token from localStorage is null');
      }
      return token;
    }
  } catch {
    // localStorage not available
    console.log('[api.js] getAuthToken: localStorage not available');
  }
  console.log('[api.js] getAuthToken: returning null');
  return null;
}

/**
 * Clear the stored session (used on 401 responses).
 */
function clearSession() {
  console.log('[api.js] clearSession: clearing session');
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
  let token = getAuthToken();
  // Ensure token is a string and trim whitespace
  if (typeof token === 'string') {
    token = token.trim();
  }
  let tokenLog = token ? { length: token.length, prefix: token.slice(0, 8) } : null;
  console.log('[api.js] apiFetch:', { url, method: options.method, token: tokenLog });

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
    // Use a contextual fallback: "session expired" makes no sense during a login attempt
    // since there is no session yet.
    const isLoginAttempt = path.endsWith('/auth.php') && (options.method || 'GET').toUpperCase() === 'POST';
    const fallback = isLoginAttempt
      ? 'Sign in failed. Please check your credentials and try again.'
      : 'Session expired. Please sign in again.';
    throw new Error(data.error || fallback);

    // Only clear session / dispatch expiry for non-login requests.
    // Login POST to auth.php returns 401 for wrong credentials — that's not a session expiry.
    // We do this AFTER throwing the error so that error handling in the caller
    // is not interfered with by session cleanup side effects.
    if (!isLoginAttempt) {
      clearSession();
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

export { API_BASE };