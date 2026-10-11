<?php
// Store only a retry timestamp, outside the web root. No credentials or query results.
function db_cooldown_path(string $host, string $name, string $user): string {
    $directory = getenv('DB_COOLDOWN_DIR') ?: sys_get_temp_dir();
    return rtrim($directory, '/\\') . DIRECTORY_SEPARATOR . 'francis-key-db-' .
        hash('sha256', __DIR__ . '|' . $host . '|' . $name . '|' . $user) . '.retry';
}

function db_cooldown_remaining(string $path, ?int $now = null): int {
    if (!is_file($path)) return 0;
    $until = (int) @file_get_contents($path);
    return max(0, $until - ($now ?? time()));
}

function db_cooldown_record(string $path, int $seconds, ?int $now = null): void {
    if (@file_put_contents($path, (string) (($now ?? time()) + $seconds), LOCK_EX) === false) {
        error_log('Database cooldown could not be persisted. Check DB_COOLDOWN_DIR permissions.');
    } else {
        @chmod($path, 0600);
    }
}

function db_limit_response(int $retryAfter): void {
    http_response_code(503);
    header('Retry-After: ' . $retryAfter);
    header('Cache-Control: no-store');
    echo json_encode(['ok' => false, 'code' => 'DB_CONNECTION_LIMIT', 'retryAfter' => $retryAfter,
        'error' => 'The database connection allowance is temporarily exhausted. Please try again later.']);
    exit;
}
