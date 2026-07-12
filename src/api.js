/**
 * API helper for Francis Key frontend.
 * Handles auth token injection and API base URL configuration.
 */

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const STORAGE_KEY = 'francis-key-auth';

/**
 * Get the auth token from localStorage.
 */
function getAuthToken() {
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

  // Handle 401 - session expired or invalid
  if (res.status === 401) {
    clearSession();
    // Dispatch a custom event so AuthContext can react
    window.dispatchEvent(new CustomEvent('auth:expired'));
    throw new Error('Session expired. Please sign in again.');
  }

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

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

export { API_BASE };