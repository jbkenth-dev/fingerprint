import { createApiClient } from "./utils/apiClient";

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
  client.clearCache();
}

/**
 * Clear the in-memory auth token (call on logout).
 */
export function clearAuthToken() {
  _authToken = null;
  client.clearCache();
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
      return token;
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

let browserStorage;
try { browserStorage = globalThis.localStorage; } catch { /* Memory-only protection. */ }
const client = createApiClient({
  base: API_BASE,
  getToken: getAuthToken,
  storage: browserStorage,
  onUnauthorized() {
    clearSession();
    window.dispatchEvent(new CustomEvent('auth:expired'));
  },
  onRecovered() {
    window.dispatchEvent(new CustomEvent('api:recovered'));
  },
});

export const apiFetch = client.request;
export { API_BASE };
