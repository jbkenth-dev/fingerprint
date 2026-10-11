export const LIVE_REFRESH_MS = 60000;

// Schedule after completion, pause in background/offline, and respect server cooldowns.
export function startPolling(load, { repeat = true, interval = LIVE_REFRESH_MS, initialDelay = 300,
  document: doc = globalThis.document, events = globalThis.window, navigator: network = globalThis.navigator,
  now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let stopped = false;
  let busy = false;
  let timer;
  let nextAt = now() + initialDelay;
  let failures = 0;
  let complete = false;
  const available = () => doc?.visibilityState !== 'hidden' && network?.onLine !== false;
  function schedule() {
    clearTimer(timer);
    if (stopped || busy || complete || !available()) return;
    timer = setTimer(run, Math.max(0, nextAt - now()));
  }
  async function run() {
    if (stopped || busy || !available()) return;
    busy = true;
    let retry = interval;
    try {
      await load();
      failures = 0;
    } catch (error) {
      failures++;
      retry = Math.max(Math.min(interval * 2 ** failures, 900000), error.retryAfterMs || 0);
    } finally {
      busy = false;
      complete = !repeat;
      nextAt = now() + retry;
      schedule();
    }
  }
  doc?.addEventListener('visibilitychange', schedule);
  events?.addEventListener('online', schedule);
  events?.addEventListener('offline', schedule);
  schedule();
  return () => {
    stopped = true;
    clearTimer(timer);
    doc?.removeEventListener('visibilitychange', schedule);
    events?.removeEventListener('online', schedule);
    events?.removeEventListener('offline', schedule);
  };
}
