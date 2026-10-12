<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_middleware.php';
require_once __DIR__ . '/attendance_filters.php';
require_once __DIR__ . '/manual_attendance_policy.php';

$faculty = require_auth($pdo, 'faculty');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}
try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) throw new InvalidArgumentException('Invalid attendance request.');
    $scheduleId = filter_var($input['scheduleId'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $bulkPresent = ($input['action'] ?? '') === 'set-present';
    $userId = filter_var($input['userId'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $status = $input['status'] ?? null;
    if ($bulkPresent && !in_array($status, ['Present', 'Absent'], true)) throw new InvalidArgumentException('Select Present or Absent for the class.');
    if (!$scheduleId || !in_array($status, ['Present', 'Late', 'Absent'], true) || (!$bulkPresent && !$userId)) {
        throw new InvalidArgumentException('Select a class, student, and attendance status.');
    }
    $date = $input['date'] ?? '';
    if (!is_string($date) || $date === '') throw new InvalidArgumentException('Select an attendance date.');
    attendance_filters(['date' => $date]);
    if ($date > (new DateTimeImmutable('now', new DateTimeZone('Asia/Manila')))->format('Y-m-d')) throw new InvalidArgumentException('Attendance cannot be recorded for a future date.');
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('SELECT * FROM class_schedules WHERE id = ? AND facultyId = ? FOR UPDATE');
    $stmt->execute([$scheduleId, $faculty['user_id']]);
    $schedule = $stmt->fetch();
    if (!$schedule) {
        $pdo->rollBack();
        http_response_code(403);
        echo json_encode(['error' => 'You can only update your assigned classes.']);
        exit;
    }
    if (!in_array((new DateTimeImmutable($date))->format('l'), array_map('trim', explode(',', $schedule['days'])), true)) throw new InvalidArgumentException('Select a scheduled class day.');
    if ($bulkPresent) {
        $students = array_values(array_filter($pdo->query("SELECT * FROM users WHERE role = 'student' AND status = 'Active' FOR UPDATE")->fetchAll(),
            fn($student) => manual_attendance_student_matches($student, $schedule)));
        if (!$students) throw new InvalidArgumentException('There are no active students in this class.');
        $placeholders = implode(',', array_fill(0, count($students), '?'));
        $stmt = $pdo->prepare('SELECT * FROM attendance_logs WHERE logDate = ? AND userId IN (' . $placeholders . ') ORDER BY logTime, id FOR UPDATE');
        $stmt->execute(array_merge([$date], array_column($students, 'id')));
        $logs = $stmt->fetchAll();
    } else {
        $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? FOR UPDATE');
        $stmt->execute([$userId]);
        $student = $stmt->fetch();
        if (!$student || !manual_attendance_student_matches($student, $schedule)) throw new InvalidArgumentException('This student is not active in the selected class section.');
        $students = [$student];
        $stmt = $pdo->prepare('SELECT * FROM attendance_logs WHERE userId = ? AND logDate = ? ORDER BY logTime, id FOR UPDATE');
        $stmt->execute([$userId, $date]);
        $logs = $stmt->fetchAll();
    }
    $save = $pdo->prepare('INSERT INTO attendance_logs
        (userId, idNumber, name, role, logDate, logTime, status, deviceId, fingerprintId, smartCardId, source, localRecordId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE logTime = VALUES(logTime), status = VALUES(status), source = VALUES(source)');
    $update = $pdo->prepare('UPDATE attendance_logs SET logTime = ?, status = ?, source = ? WHERE id = ? AND userId = ? AND logDate = ?');
    $read = $pdo->prepare('SELECT id, userId, idNumber, name, role, logDate, logTime, status, deviceId, fingerprintId, smartCardId, source, localRecordId, createdAt FROM attendance_logs WHERE source = ? AND userId = ? AND logDate = ? ORDER BY id LIMIT 1');
    $records = [];
    foreach ($students as $student) {
        $studentId = (int) $student['id'];
        foreach (manual_attendance_changes($logs, $schedule, $studentId, $date, $status) as $change) {
            if ($change['target'] !== null) {
                $update->execute([$change['logTime'], $change['status'], $change['source'], $change['target']['id'], $studentId, $date]);
            } else {
                $save->execute([$studentId, $student['idNumber'] ?? null,
                    trim(implode(' ', array_filter([$student['firstName'], $student['middleName'] ?? '', $student['lastName']]))),
                    'student', $date, $change['logTime'], $change['status'], 'FACULTY-MANUAL',
                    $student['fingerprintId'] ?? '', $student['smartCardId'] ?? '', $change['source'], $change['localRecordId']]);
            }
            $read->execute([$change['source'], $studentId, $date]);
            $record = $read->fetch();
            if (!$record) throw new RuntimeException('The attendance update could not be confirmed.');
            $records[] = $record;
        }
    }
    $pdo->commit();
    echo json_encode(['ok' => true, 'records' => $records, 'count' => count($students)]);
} catch (InvalidArgumentException $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['error' => $error->getMessage()]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Manual attendance update: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Attendance could not be updated. Please try again.']);
}
