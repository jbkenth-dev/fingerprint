<?php
require_once 'api/db.php';

try {
    // Check users table
    $stmt = $pdo->query('SELECT COUNT(*) as count FROM users');
    $result = $stmt->fetch();
    echo "Users count: " . $result['count'] . PHP_EOL;

    if ($result['count'] > 0) {
        $stmt = $pdo->query('SELECT id, role, firstName, lastName, email FROM users ORDER BY id');
        $users = $stmt->fetchAll();
        echo "Users:" . PHP_EOL;
        foreach ($users as $user) {
            echo "  - ID: {$user['id']}, {$user['role']}, {$user['firstName']} {$user['lastName']}, {$user['email']}" . PHP_EOL;
        }
    }

    // Check class_subjects table
    $stmt = $pdo->query('SELECT COUNT(*) as count FROM class_subjects');
    $result = $stmt->fetch();
    echo PHP_EOL . "Class subjects count: " . $result['count'] . PHP_EOL;

    // Check class_schedules table
    $stmt = $pdo->query('SELECT COUNT(*) as count FROM class_schedules');
    $result = $stmt->fetch();
    echo "Class schedules count: " . $result['count'] . PHP_EOL;

    // Check attendance_logs table
    $stmt = $pdo->query('SELECT COUNT(*) as count FROM attendance_logs');
    $result = $stmt->fetch();
    echo "Attendance logs count: " . $result['count'] . PHP_EOL;

    // Check sessions table
    $stmt = $pdo->query('SELECT COUNT(*) as count FROM sessions');
    $result = $stmt->fetch();
    echo "Sessions count: " . $result['count'] . PHP_EOL;

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . PHP_EOL;
}
?>