The project reduces connections to fit hosting accounts with an hourly MySQL allowance. Live attendance refreshes once every 60 seconds while the page is visible and online. Failed refreshes back off; quota errors honor the API's retry delay. Date changes wait 300 ms before loading, and a date range uses one request per 500 records instead of one request per day. The dashboard also uses a single paginated weekly query.

Successful GET responses are cached in memory for 15 seconds, or 60 seconds for users, schedules, subjects, and departments. Identical concurrent reads share one request. Cache entries are scoped to the authentication token, cleared on account changes and mutations, and bypassed by the attendance Refresh button. Only a quota retry timestamp and message are shared through browser storage; attendance and account data are not stored there by this cache.

On MySQL error 1226, PHP returns HTTP 503 with `code: DB_CONNECTION_LIMIT`, `retryAfter`, and `Retry-After`. A small timestamp file in PHP's temporary directory pauses connection attempts from other PHP requests for five minutes. The next request after that pause probes the database again. If the hosting environment cannot write there, set `DB_COOLDOWN_DIR` to a private writable directory outside the web root. The browser cooldown and device cooldown still work if the server file cannot be written.

Deployment:

1. Upload `api/attendance.php`, `api/attendance_filters.php`, `api/db.php`, and `api/db_cooldown.php` together to the PHP host **before** deploying the new frontend. The frontend checks range support and shows an error if the PHP endpoint is still old, instead of displaying incomplete data.
2. Deploy the rebuilt `dist` output. Deploy `api/proxy.js` too if that proxy is used by your hosting configuration.
3. Recompile and upload `arduino/francis_key_device` to apply device changes. The idle heartbeat is five minutes; actual attendance uploads still start after the existing five-second delay. The device pauses GET and POST calls on quota errors and leaves unsuccessful uploads pending for later retry. Firmware was not flashed by this code change.
4. `DB_LIMIT_RETRY_SECONDS` optionally changes the PHP cooldown (default 300; accepted range 60–3600 seconds).

`DB_PERSISTENT=true` is an optional optimization only if your PHP host supports it and allows enough simultaneous connections. PHP reuses persistent connections within a worker, so this cannot guarantee a shared connection across every PHP process. It is disabled by default. See [PHP connection management](https://www.php.net/manual/en/pdo.connections.php) and [persistent connections](https://www.php.net/manual/en/features.persistent-connections.php).

These changes reduce traffic; they cannot raise or reset the hosting account's allowance. An already exhausted account must wait for its quota window to reset or be reset by the provider. Multiple users, devices, and other applications using the same database account all contribute to the limit. See [MySQL account resource limits](https://dev.mysql.com/doc/refman/8.4/en/user-resources.html).

Validation:

- `npm run test:attendance`
- `npm run test:requests`
- `php scripts/testBackendPolicy.php` (requires PDO SQLite for the isolated SQL test)
- `npm run build`

Backend policy tests use an in-memory database and a temporary timestamp file; they do not contact the production database. Browser validation uses mocked API responses. ESP32 compilation requires the project's Arduino toolchain and hardware libraries.
