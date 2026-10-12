<?php
require_once __DIR__ . '/../api/manual_attendance_policy.php';
require_once __DIR__ . '/../api/manual_attendance_store.php';
require_once __DIR__ . '/../api/attendance_filters.php';
function verify_manual($condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
verify_manual(manual_public_record(['id' => 1, 'status' => 'IN']) === ['id' => 'manual-1', 'status' => 'IN'], 'Manual IDs must not collide with device scan IDs.');
$schedule = ['startTime' => '08:00:00', 'endTime' => '09:00:00', 'yearLevel' => '1st Year', 'sectionName' => 'A'];
$schedule['id'] = 10;
$date = '2026-10-12';
$scan = ['userId' => 1, 'logDate' => $date, 'logTime' => '08:00:00', 'status' => 'IN', 'source' => 'esp32', 'localRecordId' => 'device-1'];
foreach (['07:44:59' => 'Absent', '07:45:00' => 'Present', '08:15:59' => 'Present', '08:16:00' => 'Late', '08:45:59' => 'Late', '08:46:00' => 'Absent'] as $time => $expected) {
    verify_manual(manual_attendance_current_status([array_merge($scan, ['logTime' => $time])], $schedule, 1, $date) === $expected, 'Same to IN must match scanner boundaries.');
}
foreach (['Present' => '08:00:00', 'Late' => '08:16:00', 'Absent' => '00:00:00'] as $expected => $time) {
    $manual = array_merge($scan, ['source' => 'faculty-manual', 'localRecordId' => "manual:10:1:$date", 'logTime' => $time, 'status' => $expected === 'Absent' ? 'ABSENT' : 'IN']);
    verify_manual(manual_attendance_current_status([$scan, $manual], $schedule, 1, $date) === $expected, 'Same to IN must prioritize saved IN checks.');
    verify_manual(manual_attendance_current_status([$manual], array_merge($schedule, ['id' => 20]), 1, $date) === 'Absent', 'Other classes must not affect copied checks.');
}
$out = array_merge($scan, ['source' => 'faculty-manual-out-present', 'localRecordId' => "manual:10:1:$date:out", 'status' => 'OUT', 'logTime' => '09:00:00']);
verify_manual(manual_attendance_current_status([$out], $schedule, 1, $date) === 'Absent', 'OUT must not become IN when copying.');
verify_manual(manual_attendance_current_status([$scan], $schedule, 2, $date) === 'Absent', 'Other students must not affect copied checks.');
foreach (['Present' => '08:00:00', 'Late' => '08:16:00', 'Absent' => '00:00:00'] as $status => $time) {
    verify_manual(manual_attendance_time($schedule, $status) === $time, "$status time must be based on the selected class.");
    verify_manual(manual_attendance_out_time($schedule, $status) === ($status === 'Absent' ? null : '09:00:00'), "$status must have a scheduled OUT except Absent.");
}
$later = array_merge($schedule, ['startTime' => '11:00:00', 'endTime' => '12:00:00']);
verify_manual(manual_attendance_time($later, 'Present') === '11:00:00', 'Present must use any class start.');
verify_manual(manual_attendance_time($later, 'Late') === '11:16:00', 'Late must use any class start plus 16 minutes.');
verify_manual(manual_attendance_out_time($later, 'Present') === '12:00:00', 'OUT must use the selected class end.');
verify_manual(manual_attendance_out_time($later, 'Late') === '12:00:00', 'Late must use the same class end.');
verify_manual(manual_attendance_out_time(array_merge($later, ['endTime' => '12:00']), 'Present') === '12:00:00', 'OUT supports minute-only schedule times.');
foreach ([['startTime' => 'bad'], ['endTime' => '07:00:00'], ['endTime' => '08:30:00']] as $invalid) {
    try {
        manual_attendance_time(array_merge($schedule, $invalid), 'Late');
        throw new RuntimeException('Invalid class times were accepted.');
    } catch (InvalidArgumentException $expected) {}
}
try {
    manual_attendance_time($schedule, 'Unknown');
    throw new RuntimeException('Invalid attendance status was accepted.');
} catch (InvalidArgumentException $expected) {}
$student = ['role' => 'student', 'status' => 'Active', 'department' => 'BSIT 1-A'];
verify_manual(manual_attendance_student_matches($student, $schedule), 'Assigned section must match.');
verify_manual(manual_attendance_student_matches(array_merge($student, ['department' => 'BSIT 1A']), $schedule), 'Compact section must match.');
foreach ([['department' => 'BSIT 1-B'], ['status' => 'Inactive'], ['role' => 'faculty'], ['department' => 'BSIT 2-A']] as $invalid) {
    verify_manual(!manual_attendance_student_matches(array_merge($student, $invalid), $schedule), 'Unassigned or inactive student must be rejected.');
}
foreach (['2026-02-30', 'invalid'] as $date) {
    try { attendance_filters(['date' => $date]); throw new RuntimeException('Invalid date accepted.'); }
    catch (InvalidArgumentException $expected) {}
}
echo "PASS manual attendance times, invalid statuses, dates, and roster scope\n";
