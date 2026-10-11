<?php
require_once __DIR__ . '/../api/attendance_filters.php';
require_once __DIR__ . '/../api/db_cooldown.php';

function check($condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}

$range = attendance_filters(['startDate' => '2026-09-01', 'endDate' => '2026-09-30']);
check($range['values'] === ['2026-09-01', '2026-09-30'], 'Range parameters should preserve both endpoints.');
check(str_contains($range['where'], 'BETWEEN ? AND ?'), 'Range must use bound SQL parameters.');
check(attendance_filters(['date' => '2026-10-12'])['values'] === ['2026-10-12'], 'Single date compatibility.');
check(attendance_filters([])['where'] === '', 'Unfiltered endpoint compatibility.');
$database = new PDO('sqlite::memory:');
$database->exec('CREATE TABLE attendance_logs (id INTEGER, logDate TEXT)');
$database->exec("INSERT INTO attendance_logs VALUES (1, '2026-08-31'), (2, '2026-09-01'), (3, '2026-09-30'), (4, '2026-10-01')");
$statement = $database->prepare('SELECT a.id FROM attendance_logs a' . $range['where'] . ' ORDER BY a.id');
$statement->execute($range['values']);
check($statement->fetchAll(PDO::FETCH_COLUMN) === [2, 3], 'SQL range must include both boundary dates and exclude outside records.');
foreach ([['startDate' => '2026-09-30', 'endDate' => '2026-09-01'],
          ['startDate' => '2026-02-30', 'endDate' => '2026-03-01'],
          ['startDate' => '2026-09-01'], ['date' => ['2026-09-01']], ['date' => 'invalid']] as $query) {
    $rejected = false;
    try { attendance_filters($query); } catch (InvalidArgumentException $error) { $rejected = true; }
    check($rejected, 'Invalid dates must not fall back to all records.');
}

$file = tempnam(sys_get_temp_dir(), 'attendance-policy-test-');
try {
    check(db_cooldown_remaining($file, 1000) === 0, 'Empty guard should not block connections.');
    db_cooldown_record($file, 300, 1000);
    check(db_cooldown_remaining($file, 1100) === 200, 'Other processes should see remaining cooldown.');
    check(db_cooldown_remaining($file, 1301) === 0, 'Cooldown must expire.');
    check(file_get_contents($file) === '1300', 'Guard should store only a timestamp.');
} finally {
    unlink($file);
}
echo "PASS backend date validation and database cooldown lifecycle\n";
