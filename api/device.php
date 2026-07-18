<?php
require_once __DIR__ . '/db.php';

const DEFAULT_DEVICE_KEY = 'FRANCIS_KEY_DEVICE_KEY';

function json_response(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function request_input(): array {
    $input = json_decode(file_get_contents('php://input'), true);
    return is_array($input) ? $input : [];
}

function normalize_value($value): string {
    return trim((string) $value);
}

function normalize_uid($value): string {
    return strtoupper(str_replace([' ', ':', '-'], '', normalize_value($value)));
}

function expected_device_key(): string {
    $configured = getenv('FRANCIS_KEY_DEVICE_KEY');
    return $configured !== false && trim($configured) !== '' ? trim($configured) : DEFAULT_DEVICE_KEY;
}

function provided_device_key(array $input): string {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    foreach ($headers as $name => $value) {
        if (strtolower($name) === 'x-device-key') {
            return trim((string) $value);
        }
    }
    return trim((string) ($input['apiKey'] ?? $_GET['apiKey'] ?? ''));
}

function require_device_key(array $input): void {
    $expected = expected_device_key();
    $provided = provided_device_key($input);
    if ($expected === '' || !hash_equals($expected, $provided)) {
        json_response(['ok' => false, 'error' => 'Invalid device API key.'], 401);
    }
}

function column_exists(PDO $pdo, string $table, string $column): bool {
    $stmt = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
    $stmt->execute([$column]);
    return (bool) $stmt->fetch();
}

function ensure_user_device_columns(PDO $pdo): void {
    if (!column_exists($pdo, 'users', 'smartCardId')) {
        $pdo->exec('ALTER TABLE users ADD COLUMN smartCardId VARCHAR(64) DEFAULT NULL');
    }
    if (!column_exists($pdo, 'users', 'fingerprintId')) {
        $pdo->exec('ALTER TABLE users ADD COLUMN fingerprintId VARCHAR(64) DEFAULT NULL');
    }
    if (!column_exists($pdo, 'users', 'idNumber')) {
        $pdo->exec('ALTER TABLE users ADD COLUMN idNumber VARCHAR(128) DEFAULT NULL UNIQUE');
    }
}

function ensure_attendance_table(PDO $pdo): void {
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS attendance_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            idNumber VARCHAR(128) DEFAULT NULL,
            name VARCHAR(384) NOT NULL,
            role VARCHAR(32) DEFAULT NULL,
            logDate DATE NOT NULL,
            logTime TIME NOT NULL,
            status VARCHAR(8) NOT NULL,
            deviceId VARCHAR(64) NOT NULL,
            fingerprintId VARCHAR(64) NOT NULL,
            smartCardId VARCHAR(64) NOT NULL,
            source VARCHAR(32) NOT NULL DEFAULT "esp32",
            localRecordId VARCHAR(128) DEFAULT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            syncedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_device_local (deviceId, localRecordId),
            INDEX idx_attendance_user_date (userId, logDate),
            INDEX idx_attendance_date_time (logDate, logTime),
            CONSTRAINT fk_attendance_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function select_device_user_fields(PDO $pdo): string {
    $fields = ['id', 'role', 'status', 'firstName', 'lastName', 'email', 'phone', 'smartCardId', 'fingerprintId', 'department'];
    foreach (['middleName', 'idNumber', 'username'] as $field) {
        if (column_exists($pdo, 'users', $field)) {
            $fields[] = $field;
        }
    }
    return implode(',', $fields);
}

function user_full_name(array $user): string {
    return trim(implode(' ', array_filter([
        $user['firstName'] ?? '',
        $user['middleName'] ?? '',
        $user['lastName'] ?? '',
    ])));
}

function serialize_user(array $user): array {
    return [
        'id' => (int) $user['id'],
        'idNumber' => $user['idNumber'] ?? null,
        'fullName' => user_full_name($user),
        'role' => $user['role'] ?? null,
        'status' => $user['status'] ?? null,
        'department' => $user['department'] ?? null,
        'smartCardId' => $user['smartCardId'] ?? null,
        'fingerprintId' => $user['fingerprintId'] ?? null,
    ];
}

function fetch_user(PDO $pdo, int $id): ?array {
    $stmt = $pdo->prepare('SELECT ' . select_device_user_fields($pdo) . ' FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function fetch_active_users(PDO $pdo): array {
    $stmt = $pdo->query('SELECT ' . select_device_user_fields($pdo) . ' FROM users WHERE status = "Active" ORDER BY lastName ASC, firstName ASC, id ASC');
    return array_map('serialize_user', $stmt->fetchAll());
}

function fetch_all_users(PDO $pdo): array {
    $stmt = $pdo->query('SELECT ' . select_device_user_fields($pdo) . ' FROM users ORDER BY id ASC');
    return array_map('serialize_user', $stmt->fetchAll());
}

function credential_taken(PDO $pdo, string $column, string $value, int $excludeUserId): bool {
    if ($value === '') {
        return false;
    }
    $stmt = $pdo->prepare("SELECT id FROM users WHERE `$column` = ? AND id <> ? LIMIT 1");
    $stmt->execute([$value, $excludeUserId]);
    return (bool) $stmt->fetch();
}

function register_credentials(PDO $pdo, array $input): array {
    $userId = (int) ($input['userId'] ?? 0);
    $fingerprintId = normalize_value($input['fingerprintId'] ?? '');
    $smartCardId = normalize_uid($input['smartCardId'] ?? $input['rfidUid'] ?? '');

    if ($userId <= 0 || $fingerprintId === '' || $smartCardId === '') {
        json_response(['ok' => false, 'error' => 'userId, fingerprintId, and smartCardId are required.'], 400);
    }

    $user = fetch_user($pdo, $userId);
    if (!$user) {
        json_response(['ok' => false, 'error' => 'Selected user was not found.'], 404);
    }
    if (($user['status'] ?? '') !== 'Active') {
        json_response(['ok' => false, 'error' => 'Selected user is not active.'], 409);
    }
    if (credential_taken($pdo, 'fingerprintId', $fingerprintId, $userId)) {
        json_response(['ok' => false, 'error' => 'Fingerprint ID is already assigned to another user.'], 409);
    }
    if (credential_taken($pdo, 'smartCardId', $smartCardId, $userId)) {
        json_response(['ok' => false, 'error' => 'RFID UID is already assigned to another user.'], 409);
    }

    $stmt = $pdo->prepare('UPDATE users SET fingerprintId = ?, smartCardId = ? WHERE id = ?');
    $stmt->execute([$fingerprintId, $smartCardId, $userId]);

    return serialize_user(fetch_user($pdo, $userId));
}

function find_user_by_credentials(PDO $pdo, string $fingerprintId, string $smartCardId): ?array {
    $stmt = $pdo->prepare(
        'SELECT ' . select_device_user_fields($pdo) . '
         FROM users
         WHERE fingerprintId = ?
           AND smartCardId = ?
           AND status = "Active"
         LIMIT 1'
    );
    $stmt->execute([$fingerprintId, $smartCardId]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function find_user_by_fingerprint(PDO $pdo, string $fingerprintId): ?array {
    $stmt = $pdo->prepare('SELECT ' . select_device_user_fields($pdo) . ' FROM users WHERE fingerprintId = ? AND status = "Active" LIMIT 1');
    $stmt->execute([$fingerprintId]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function find_user_by_card(PDO $pdo, string $smartCardId): ?array {
    $stmt = $pdo->prepare('SELECT ' . select_device_user_fields($pdo) . ' FROM users WHERE smartCardId = ? AND status = "Active" LIMIT 1');
    $stmt->execute([$smartCardId]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function split_occurrence_time(?string $occurredAt): array {
    $tz = new DateTimeZone('Asia/Manila');
    try {
        $date = $occurredAt ? new DateTime($occurredAt, $tz) : new DateTime('now', $tz);
    } catch (Exception $exception) {
        $date = new DateTime('now', $tz);
    }
    $date->setTimezone($tz);
    return [$date->format('Y-m-d'), $date->format('H:i:s')];
}

function next_attendance_status(PDO $pdo, int $userId, string $logDate): string {
    $stmt = $pdo->prepare('SELECT COUNT(*) AS total FROM attendance_logs WHERE userId = ? AND logDate = ?');
    $stmt->execute([$userId, $logDate]);
    $total = (int) (($stmt->fetch()['total'] ?? 0));
    return $total % 2 === 0 ? 'IN' : 'OUT';
}

function duplicate_local_record(PDO $pdo, string $deviceId, string $localRecordId): ?array {
    if ($localRecordId === '') {
        return null;
    }
    $stmt = $pdo->prepare('SELECT * FROM attendance_logs WHERE deviceId = ? AND localRecordId = ? LIMIT 1');
    $stmt->execute([$deviceId, $localRecordId]);
    $record = $stmt->fetch();
    return $record ?: null;
}

function attendance_error(array $payload, int $status, bool $throwOnError): void {
    if ($throwOnError) {
        throw new RuntimeException(json_encode($payload), $status);
    }
    json_response($payload, $status);
}

function save_attendance(PDO $pdo, array $input, bool $throwOnError = false): array {
    $fingerprintId = normalize_value($input['fingerprintId'] ?? '');
    $smartCardId = normalize_uid($input['smartCardId'] ?? $input['rfidUid'] ?? '');
    $deviceId = normalize_value($input['deviceId'] ?? 'ESP32-FRANCIS-KEY');
    $localRecordId = normalize_value($input['localRecordId'] ?? '');

    if ($fingerprintId === '' || $smartCardId === '' || $deviceId === '') {
        attendance_error(['ok' => false, 'error' => 'fingerprintId, smartCardId, and deviceId are required.'], 400, $throwOnError);
    }

    $duplicate = duplicate_local_record($pdo, $deviceId, $localRecordId);
    if ($duplicate) {
        return [
            'duplicate' => true,
            'attendanceId' => (int) $duplicate['id'],
            'status' => $duplicate['status'],
            'date' => $duplicate['logDate'],
            'time' => $duplicate['logTime'],
            'user' => serialize_user(fetch_user($pdo, (int) $duplicate['userId'])),
        ];
    }

    $fingerprintUser = find_user_by_fingerprint($pdo, $fingerprintId);
    $cardUser = find_user_by_card($pdo, $smartCardId);
    $matchedUser = find_user_by_credentials($pdo, $fingerprintId, $smartCardId);

    if (!$matchedUser) {
        attendance_error([
            'ok' => false,
            'error' => 'Fingerprint and RFID do not belong to the same active user.',
            'fingerprintUser' => $fingerprintUser ? serialize_user($fingerprintUser) : null,
            'cardUser' => $cardUser ? serialize_user($cardUser) : null,
        ], 403, $throwOnError);
    }

    [$logDate, $logTime] = split_occurrence_time($input['occurredAt'] ?? null);
    $status = next_attendance_status($pdo, (int) $matchedUser['id'], $logDate);
    $name = user_full_name($matchedUser);

    $stmt = $pdo->prepare(
        'INSERT INTO attendance_logs
            (userId, idNumber, name, role, logDate, logTime, status, deviceId, fingerprintId, smartCardId, source, localRecordId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        (int) $matchedUser['id'],
        $matchedUser['idNumber'] ?? null,
        $name,
        $matchedUser['role'] ?? null,
        $logDate,
        $logTime,
        $status,
        $deviceId,
        $fingerprintId,
        $smartCardId,
        normalize_value($input['source'] ?? 'esp32'),
        $localRecordId !== '' ? $localRecordId : null,
    ]);

    return [
        'duplicate' => false,
        'attendanceId' => (int) $pdo->lastInsertId(),
        'status' => $status,
        'date' => $logDate,
        'time' => $logTime,
        'user' => serialize_user($matchedUser),
    ];
}

function sync_records(PDO $pdo, array $input): array {
    $records = $input['records'] ?? [];
    if (!is_array($records)) {
        json_response(['ok' => false, 'error' => 'records must be an array.'], 400);
    }

    $results = [];
    foreach ($records as $index => $record) {
        if (!is_array($record)) {
            $results[] = ['index' => $index, 'ok' => false, 'error' => 'Invalid record.'];
            continue;
        }

        try {
            $saved = save_attendance($pdo, $record + [
                'deviceId' => $input['deviceId'] ?? 'ESP32-FRANCIS-KEY',
                'source' => 'esp32-sync',
            ], true);
            $results[] = ['index' => $index, 'ok' => true] + $saved;
        } catch (Throwable $throwable) {
            $decoded = json_decode($throwable->getMessage(), true);
            $results[] = ['index' => $index, 'ok' => false, 'error' => $decoded['error'] ?? $throwable->getMessage()];
        }
    }

    return $results;
}

ensure_user_device_columns($pdo);
ensure_attendance_table($pdo);

$input = request_input();
$action = normalize_value($_GET['action'] ?? $input['action'] ?? 'status');
require_device_key($input);

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action === 'status') {
            json_response([
                'ok' => true,
                'deviceApi' => 'ready',
                'database' => 'ready',
                'timeZone' => 'Asia/Manila',
            ]);
        }
        if ($action === 'users') {
            json_response(['ok' => true, 'users' => fetch_active_users($pdo)]);
        }
        if ($action === 'all_users') {
            json_response(['ok' => true, 'users' => fetch_all_users($pdo)]);
        }
        if ($action === 'attendance') {
            $stmt = $pdo->query('SELECT id, userId, idNumber, name, role, logDate, logTime, status, deviceId, createdAt FROM attendance_logs ORDER BY logDate DESC, logTime DESC, id DESC LIMIT 100');
            json_response(['ok' => true, 'records' => $stmt->fetchAll()]);
        }
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if ($action === 'register') {
            json_response(['ok' => true, 'user' => register_credentials($pdo, $input)]);
        }
        if ($action === 'attendance') {
            json_response(['ok' => true] + save_attendance($pdo, $input));
        }
        if ($action === 'sync') {
            json_response(['ok' => true, 'results' => sync_records($pdo, $input)]);
        }
        if ($action === 'deactivate_user') {
            $userId = (int) ($input['userId'] ?? 0);
            if ($userId <= 0) json_response(['ok' => false, 'error' => 'userId is required.'], 400);
            $user = fetch_user($pdo, $userId);
            if (!$user) json_response(['ok' => false, 'error' => 'User not found.'], 404);
            $stmt = $pdo->prepare('UPDATE users SET status = ? WHERE id = ?');
            $stmt->execute(['Inactive', $userId]);
            json_response(['ok' => true, 'user' => serialize_user(fetch_user($pdo, $userId))]);
        }
        if ($action === 'activate_user') {
            $userId = (int) ($input['userId'] ?? 0);
            if ($userId <= 0) json_response(['ok' => false, 'error' => 'userId is required.'], 400);
            $user = fetch_user($pdo, $userId);
            if (!$user) json_response(['ok' => false, 'error' => 'User not found.'], 404);
            $stmt = $pdo->prepare('UPDATE users SET status = ? WHERE id = ?');
            $stmt->execute(['Active', $userId]);
            json_response(['ok' => true, 'user' => serialize_user(fetch_user($pdo, $userId))]);
        }
        if ($action === 'delete_credentials') {
            $userId = (int) ($input['userId'] ?? 0);
            if ($userId <= 0) json_response(['ok' => false, 'error' => 'userId is required.'], 400);
            $user = fetch_user($pdo, $userId);
            if (!$user) json_response(['ok' => false, 'error' => 'User not found.'], 404);
            $stmt = $pdo->prepare('UPDATE users SET fingerprintId = NULL, smartCardId = NULL WHERE id = ?');
            $stmt->execute([$userId]);
            json_response(['ok' => true, 'user' => serialize_user(fetch_user($pdo, $userId))]);
        }
    }

    json_response(['ok' => false, 'error' => 'Unsupported device API action.'], 404);
} catch (Throwable $throwable) {
    json_response(['ok' => false, 'error' => $throwable->getMessage()], 500);
}
