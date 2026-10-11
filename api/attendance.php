<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_middleware.php';
require_once __DIR__ . '/attendance_filters.php';

// Disable HTML errors so PHP output is never polluted before JSON
ini_set('display_errors', '0');
ini_set('html_errors', '0');
error_reporting(E_ALL);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    require_auth($pdo);
    try {
        $filter = attendance_filters($_GET);
        $limit = isset($_GET['limit']) ? max(1, min(500, (int) $_GET['limit'])) : 100;
        $offset = isset($_GET['offset']) ? max(0, (int) $_GET['offset']) : 0;
        $stmt = $pdo->prepare(
            'SELECT a.id, a.userId, a.idNumber, a.name, a.role, a.logDate, a.logTime, a.status,
                    a.deviceId, a.fingerprintId, a.smartCardId, a.source, a.createdAt
             FROM attendance_logs a' . $filter['where'] . '
             ORDER BY a.logDate DESC, a.logTime DESC, a.id DESC LIMIT ? OFFSET ?'
        );
        $position = 1;
        foreach ($filter['values'] as $value) $stmt->bindValue($position++, $value, PDO::PARAM_STR);
        $stmt->bindValue($position++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($position, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $countStmt = $pdo->prepare('SELECT COUNT(*) AS total FROM attendance_logs a' . $filter['where']);
        $countStmt->execute($filter['values']);

        $records = $stmt->fetchAll();
        $total = (int) ($countStmt->fetch()['total'] ?? 0);

        echo json_encode([
            'ok' => true,
            'records' => $records,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'range' => $filter['range'],
        ]);
    } catch (InvalidArgumentException $e) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

if ($method === 'DELETE') {
    require_auth($pdo, 'admin');
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'An attendance record ID is required.']);
            exit;
        }

        $stmt = $pdo->prepare('DELETE FROM attendance_logs WHERE id = ?');
        $stmt->bindValue(1, (int) $id, PDO::PARAM_INT);
        $stmt->execute();

        echo json_encode(['ok' => true, 'message' => 'Attendance record deleted.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);