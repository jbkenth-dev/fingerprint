import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../src/utils/apiClient.js';
import { startPolling } from '../src/utils/polling.js';

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers });
const memoryStorage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};

test('simultaneous reads share a request; short cache is isolated from consumer changes and expires', async () => {
  let calls = 0;
  let time = 0;
  const client = createApiClient({ now: () => time, fetcher: async () => { calls++; return json([{ id: 1 }]); } });
  const [first, second] = await Promise.all([client.request('/users.php'), client.request('/users.php')]);
  assert.equal(calls, 1);
  first[0].id = 99;
  assert.equal((await client.request('/users.php'))[0].id, 1);
  time = 60001;
  await client.request('/users.php');
  assert.equal(calls, 2);
});

test('mutations, auth changes and explicit refresh bypass stale cached reads', async () => {
  let calls = 0;
  let token = 'first-user';
  const client = createApiClient({ getToken: () => token, fetcher: async () => json({ call: ++calls }) });
  await client.request('/users.php');
  await client.request('/users.php', { method: 'PUT', body: '{}' });
  await client.request('/users.php');
  assert.equal(calls, 3);
  token = 'second-user';
  await client.request('/users.php');
  await client.request('/users.php', { cacheTtl: 0 });
  assert.equal(calls, 5);
  await client.request('/users.php');
  assert.equal(calls, 6, 'Explicit refresh must also discard the older cache entry');
});

test('aborting one caller does not cancel another caller sharing its request', async () => {
  let release;
  let calls = 0;
  const client = createApiClient({ fetcher: async (url, options) => {
    calls++;
    await new Promise(resolve => { release = resolve; });
    assert.equal(options.signal.aborted, false);
    return json({ ok: true });
  } });
  const controller = new AbortController();
  const first = client.request('/users.php', { signal: controller.signal });
  const second = client.request('/users.php');
  const rejected = assert.rejects(first, { name: 'AbortError' });
  await Promise.resolve();
  controller.abort();
  release();
  await rejected;
  assert.deepEqual(await second, { ok: true });
  assert.equal(calls, 1);
});

test('quota cooldown honors Retry-After and survives reloads/other tabs without network requests', async () => {
  let calls = 0;
  let time = 1000;
  let recoveries = 0;
  const storage = memoryStorage();
  const options = { base: '/api', now: () => time, storage, onRecovered: () => recoveries++, fetcher: async () => {
    calls++;
    return calls === 1 ? json({ code: 'DB_CONNECTION_LIMIT', retryAfter: 300 }, 503, { 'Retry-After': '300' }) : json({ ok: true });
  } };
  const first = createApiClient(options);
  await assert.rejects(first.request('/attendance.php'), error => error.retryAfterMs === 300000);
  const reloaded = createApiClient(options);
  await assert.rejects(reloaded.request('/users.php'), error => error.code === 'DB_CONNECTION_LIMIT');
  await assert.rejects(first.request('/auth.php', { method: 'POST' }));
  assert.equal(calls, 1);
  time += 300001;
  await reloaded.request('/users.php');
  assert.equal(calls, 2);
  assert.equal(recoveries, 1);
  assert.equal(storage.getItem('francis-key-api-cooldown:/api'), null);
});

test('legacy MySQL 1226 is recognized without leaking database account details to the UI', async () => {
  const client = createApiClient({ fetcher: async () => json({ error: "DB connection failed: SQLSTATE[HY000] [1226] User 'private-account' exceeded max_connections_per_hour" }, 500) });
  await assert.rejects(client.request('/users.php'), error => error.retryAfterMs === 3600000 && !error.message.includes('private-account'));
});

test('failed responses are not cached and login failures do not clear an existing session', async () => {
  let expired = 0;
  let calls = 0;
  const client = createApiClient({ onUnauthorized: () => expired++, fetcher: async () => { calls++; return json({ error: 'Unauthorized' }, 401); } });
  await assert.rejects(client.request('/auth.php', { method: 'POST' }));
  assert.equal(expired, 0);
  await assert.rejects(client.request('/users.php'));
  await assert.rejects(client.request('/users.php'));
  assert.equal(calls, 3);
  assert.equal(expired, 2);
});

function pollingFixture(load, options = {}) {
  let time = 0;
  let id = 0;
  const timers = new Map();
  const doc = new EventTarget();
  doc.visibilityState = 'visible';
  const events = new EventTarget();
  const network = { onLine: true };
  const stop = startPolling(load, { document: doc, events, navigator: network, now: () => time,
    setTimer(fn, delay) { const key = ++id; timers.set(key, { fn, at: time + delay }); return key; },
    clearTimer(key) { timers.delete(key); }, ...options });
  return { stop, doc, events, network, async advance(ms) {
    const until = time + ms;
    while (true) {
      const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > until) break;
      time = next[1].at;
      timers.delete(next[0]);
      await next[1].fn();
    }
    time = until;
  } };
}

test('Live waits 60 seconds between successful loads and makes no requests hidden or offline', async () => {
  let calls = 0;
  const app = pollingFixture(async () => { calls++; });
  await app.advance(300);
  assert.equal(calls, 1);
  await app.advance(59999);
  assert.equal(calls, 1);
  await app.advance(1);
  assert.equal(calls, 2);
  app.doc.visibilityState = 'hidden';
  app.doc.dispatchEvent(new Event('visibilitychange'));
  await app.advance(3600000);
  assert.equal(calls, 2);
  app.doc.visibilityState = 'visible';
  app.network.onLine = false;
  app.doc.dispatchEvent(new Event('visibilitychange'));
  await app.advance(3600000);
  assert.equal(calls, 2);
  app.network.onLine = true;
  app.events.dispatchEvent(new Event('online'));
  await app.advance(0);
  assert.equal(calls, 3);
  app.stop();
  await app.advance(3600000);
  assert.equal(calls, 3);
});

test('polling backs off on failures and respects quota delay even across visibility changes', async () => {
  let calls = 0;
  const app = pollingFixture(async () => {
    calls++;
    throw Object.assign(new Error('Quota'), { retryAfterMs: 300000 });
  });
  await app.advance(300);
  assert.equal(calls, 1);
  app.doc.dispatchEvent(new Event('visibilitychange'));
  await app.advance(299999);
  assert.equal(calls, 1);
  await app.advance(1);
  assert.equal(calls, 2);
  app.stop();
});

test('historical ranges load once, and disposing before the debounce prevents any request', async () => {
  let calls = 0;
  const once = pollingFixture(async () => { calls++; }, { repeat: false });
  await once.advance(3600000);
  assert.equal(calls, 1);
  once.stop();
  const cancelled = pollingFixture(async () => { calls++; });
  cancelled.stop();
  await cancelled.advance(3600000);
  assert.equal(calls, 1);
});
