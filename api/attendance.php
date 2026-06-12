<?php
require_once __DIR__ . '/db.php';

// Disable HTML errors so PHP output is never polluted before JSON
ini_set('display_errors', '0');
ini_set('html_errors', '0');
error_reporting(E_ALL);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $date = $_GET['date'] ?? null;
        $limit = isset($_GET['limit']) ? max(1, min(500, (int) $_GET['limit'])) : 100;
        $offset = isset($_GET['offset']) ? max(0, (int) $_GET['offset']) : 0;

        if ($date && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $stmt = $pdo->prepare(
                'SELECT a.id, a.userId, a.idNumber, a.name, a.role, a.logDate, a.logTime, a.status,
                        a.deviceId, a.fingerprintId, a.smartCardId, a.source, a.createdAt
                 FROM attendance_logs a
                 WHERE a.logDate = ?
                 ORDER BY a.logDate DESC, a.logTime DESC, a.id DESC
                 LIMIT ? OFFSET ?'
            );
            $stmt->bindValue(1, $date, PDO::PARAM_STR);
            $stmt->bindValue(2, $limit, PDO::PARAM_INT);
            $stmt->bindValue(3, $offset, PDO::PARAM_INT);
            $stmt->execute();

            $countStmt = $pdo->prepare('SELECT COUNT(*) AS total FROM attendance_logs WHERE logDate = ?');
            $countStmt->bindValue(1, $date, PDO::PARAM_STR);
            $countStmt->execute();
        } else {
            $stmt = $pdo->prepare(
                'SELECT a.id, a.userId, a.idNumber, a.name, a.role, a.logDate, a.logTime, a.status,
                        a.deviceId, a.fingerprintId, a.smartCardId, a.source, a.createdAt
                 FROM attendance_logs a
                 ORDER BY a.logDate DESC, a.logTime DESC, a.id DESC
                 LIMIT ? OFFSET ?'
            );
            $stmt->bindValue(1, $limit, PDO::PARAM_INT);
            $stmt->bindValue(2, $offset, PDO::PARAM_INT);
            $stmt->execute();

            $countStmt = $pdo->query('SELECT COUNT(*) AS total FROM attendance_logs');
        }

        $records = $stmt->fetchAll();
        $total = (int) ($countStmt->fetch()['total'] ?? 0);

        echo json_encode([
            'ok' => true,
            'records' => $records,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

if ($method === 'DELETE') {
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