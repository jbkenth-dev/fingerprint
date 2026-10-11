<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Expose-Headers: Retry-After');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load .env file from project root (one level above /api/)
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        // Skip comments
        if (str_starts_with($line, '#')) continue;
        if (str_contains($line, '=')) {
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            // Remove surrounding quotes if present
            if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
                $value = substr($value, 1, -1);
            }
            putenv("$key=$value");
        }
    }
}

$DB_HOST = getenv('DB_HOST') ?: '127.0.0.1';
$DB_NAME = getenv('DB_NAME') ?: 'francis_key';
$DB_USER = getenv('DB_USER') ?: 'root';
$DB_PASS = getenv('DB_PASS') ?: '';
require_once __DIR__ . '/db_cooldown.php';
$cooldownPath = db_cooldown_path($DB_HOST, $DB_NAME, $DB_USER);
$remaining = db_cooldown_remaining($cooldownPath);
if ($remaining > 0) db_limit_response($remaining);

try {
    $pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        // Opt in only on hosting that supports persistent PDO connections.
        PDO::ATTR_PERSISTENT => filter_var(getenv('DB_PERSISTENT') ?: 'false', FILTER_VALIDATE_BOOLEAN),
    ]);
} catch (PDOException $e) {
    if ((int) ($e->errorInfo[1] ?? 0) === 1226 || str_contains($e->getMessage(), '[1226]')) {
        $retryAfter = max(60, min(3600, (int) (getenv('DB_LIMIT_RETRY_SECONDS') ?: 300)));
        db_cooldown_record($cooldownPath, $retryAfter);
        db_limit_response($retryAfter);
    }
    error_log('Database connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'The database is temporarily unavailable. Please try again later.']);
    exit;
}

// $pdo is now available to include-using scripts
