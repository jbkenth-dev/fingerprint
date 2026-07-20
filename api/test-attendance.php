<?php
/**
 * Developer-mode attendance endpoint.
 * Creates attendance log entries for testing purposes.
 * Requires admin authentication.
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_middleware.php';

// Ensure attendance_logs table exists
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

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // List students with their last attendance status for today
    require_auth($pdo);

    try {
        $tz = new DateTimeZone('Asia/Manila');
        $now = new DateTime('now', $tz);
        $today = $now->format('Y-m-d');

        $stmt = $pdo->prepare(
            "SELECT u.id, u.idNumber, u.firstName, u.middleName, u.lastName, u.role, u.status, u.department,
                    al.id AS lastLogId, al.logTime AS lastLogTime, al.status AS lastLogStatus
             FROM users u
             LEFT JOIN attendance_logs al ON al.userId = u.id AND al.logDate = ? AND al.id = (
                 SELECT MAX(id) FROM attendance_logs WHERE userId = u.id AND logDate = ?
             )
             WHERE u.role = 'student' AND u.status = 'Active'
             ORDER BY u.lastName ASC, u.firstName ASC"
        );
        $stmt->execute([$today, $today]);
        $students = $stmt->fetchAll();

        echo json_encode(['ok' => true, 'students' => $students, 'date' => $today]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST') {
    require_auth($pdo, 'admin');

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON payload"]);
        exit;
    }

    $userId = (int) ($input['userId'] ?? 0);
    $type = strtoupper(trim($input['type'] ?? ''));

    if ($userId <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "userId is required."]);
        exit;
    }
    if ($type !== 'IN' && $type !== 'OUT') {
        http_response_code(400);
        echo json_encode(["error" => "type must be 'IN' or 'OUT'."]);
        exit;
    }

    try {
        // Fetch user
        $stmt = $pdo->prepare('SELECT id, idNumber, firstName, middleName, lastName, role, department, smartCardId, fingerprintId FROM users WHERE id = ? AND status = "Active" LIMIT 1');
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(404);
            echo json_encode(["error" => "Active user not found."]);
            exit;
        }

        // Use Manila timezone for accurate date/time
        $tz = new DateTimeZone('Asia/Manila');
        $now = new DateTime('now', $tz);
        $logDate = $now->format('Y-m-d');
        $logTime = $now->format('H:i:s');

        $name = trim(implode(' ', array_filter([
            $user['firstName'] ?? '',
            $user['middleName'] ?? '',
            $user['lastName'] ?? '',
        ])));
        $fingerprintId = $user['fingerprintId'] ?? 'TEST-FP-' . $userId;
        $smartCardId = $user['smartCardId'] ?? 'TEST-SC-' . $userId;
        $deviceId = 'DEV-MODE';

        $stmt = $pdo->prepare(
            'INSERT INTO attendance_logs
                (userId, idNumber, name, role, logDate, logTime, status, deviceId, fingerprintId, smartCardId, source, localRecordId)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $userId,
            $user['idNumber'] ?? null,
            $name,
            $user['role'] ?? 'student',
            $logDate,
            $logTime,
            $type,
            $deviceId,
            $fingerprintId,
            $smartCardId,
            'dev-mode',
            'dev-' . $userId . '-' . $type . '-' . $now->getTimestamp(),
        ]);

        echo json_encode([
            'ok' => true,
            'attendanceId' => (int) $pdo->lastInsertId(),
            'userId' => $userId,
            'name' => $name,
            'status' => $type,
            'date' => $logDate,
            'time' => $logTime,
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
