const QUOTA_MESSAGE = 'The database connection allowance is temporarily exhausted. Automatic requests are paused; please try again later.';

export function createApiClient({ base = '', fetcher = fetch, getToken = () => null,
  now = Date.now, storage, onUnauthorized = () => {}, onRecovered = () => {} } = {}) {
  const cache = new Map();
  const pending = new Map();
  const cooldownKey = `francis-key-api-cooldown:${base}`;
  let cooldown = null;
  let generation = 0;

  function clearCache() {
    generation++;
    cache.clear();
    pending.clear();
  }

  function cooldownError() {
    try {
      const saved = JSON.parse(storage?.getItem(cooldownKey) || 'null');
      if (saved?.until > (cooldown?.until || 0)) cooldown = saved;
    } catch { /* Storage may be unavailable. */ }
    if (!cooldown || cooldown.until <= now()) return null;
    const error = new Error(cooldown.message);
    error.status = 503;
    error.code = cooldown.code;
    error.retryAfterMs = cooldown.until - now();
    return error;
  }

  function subscribe(entry, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(signal.reason || new DOMException('Aborted', 'AbortError'));
        return;
      }
      entry.consumers++;
      let finished = false;
      function cleanup() {
        finished = true;
        signal?.removeEventListener('abort', abort);
        entry.consumers--;
        // React StrictMode can remount immediately; let a replacement consumer join.
        queueMicrotask(() => {
          if (!entry.consumers && !entry.settled) entry.controller.abort();
        });
      }
      function abort() {
        if (finished) return;
        cleanup();
        reject(signal.reason || new DOMException('Aborted', 'AbortError'));
      }
      signal?.addEventListener('abort', abort, { once: true });
      entry.promise.then(value => {
        if (finished) return;
        cleanup();
        resolve(value);
      }, error => {
        if (finished) return;
        cleanup();
        reject(error);
      });
    });
  }

  async function request(path, options = {}) {
    options.signal?.throwIfAborted();
    const blocked = cooldownError();
    if (blocked) throw blocked;
    const method = (options.method || 'GET').toUpperCase();
    const read = method === 'GET';
    const token = getToken()?.trim() || '';
    const url = new URL(`${base}${path}`, 'http://local.invalid');
    url.searchParams.sort();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers.Authorization = `Bearer ${token}`;
    const key = JSON.stringify([token, url.href, headers]);
    const ttl = options.cacheTtl ?? (/\/(users|class-schedules|class-subjects|departments)\.php(?:\?|$)/.test(path) ? 60000 : 15000);
    if (read && ttl <= 0) cache.delete(key);
    if (read && ttl > 0 && cache.get(key)?.expires > now()) return structuredClone(cache.get(key).value);
    if (read && pending.has(key) && !pending.get(key).controller.signal.aborted) {
      return subscribe(pending.get(key), options.signal);
    }
    if (!read) clearCache();
    const version = generation;
    const entry = { controller: new AbortController(), consumers: 0, settled: false };
    const { cacheTtl, signal, ...fetchOptions } = options;
    entry.promise = Promise.resolve().then(async () => {
      entry.controller.signal.throwIfAborted();
      // Another request may have discovered the shared quota since this was scheduled.
      const blocked = cooldownError();
      if (blocked) throw blocked;
      const response = await fetcher(`${base}${path}`, { ...fetchOptions, method, headers, signal: entry.controller.signal });
      let data;
      const text = await response.text();
      try { data = JSON.parse(text); } catch { data = { error: text }; }
      if (!response.ok) {
        const quota = data.code === 'DB_CONNECTION_LIMIT' || /max_connections_per_hour|\[1226\]/i.test(data.error || '');
        const header = response.headers.get('Retry-After');
        const headerSeconds = header && /^\d+$/.test(header) ? Number(header) : header ? Math.max(0, (Date.parse(header) - now()) / 1000) : 0;
        const seconds = Math.max(Number(data.retryAfter) || 0, headerSeconds || 0) || (quota ? 3600 : 0);
        const error = new Error(quota ? QUOTA_MESSAGE : data.error || `Request failed: ${response.status}`);
        error.status = response.status;
        error.code = quota ? 'DB_CONNECTION_LIMIT' : data.code;
        if (quota || ((response.status === 503 || response.status === 429) && seconds > 0)) {
          error.retryAfterMs = Math.max(1000, seconds * 1000);
          cooldown = { until: now() + error.retryAfterMs, message: error.message, code: error.code };
          try { storage?.setItem(cooldownKey, JSON.stringify(cooldown)); } catch { /* Memory fallback. */ }
          clearCache();
        }
        if (response.status === 401 && !(path.endsWith('/auth.php') && method === 'POST')) {
          clearCache();
          onUnauthorized();
        }
        throw error;
      }
      if (read && ttl > 0 && version === generation) {
        if (cache.size >= 100) cache.delete(cache.keys().next().value);
        cache.set(key, { value: structuredClone(data), expires: now() + ttl });
      }
      if (!read) clearCache();
      if (cooldown && cooldown.until <= now()) {
        cooldown = null;
        try { storage?.removeItem(cooldownKey); } catch { /* Memory fallback. */ }
        onRecovered();
      }
      return data;
    }).finally(() => {
      entry.settled = true;
      if (pending.get(key) === entry) pending.delete(key);
    });
    if (read) pending.set(key, entry);
    return subscribe(entry, signal);
  }
  return { request, clearCache };
}
