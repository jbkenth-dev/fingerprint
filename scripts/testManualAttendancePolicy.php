<?php
require_once __DIR__ . '/../api/manual_attendance_policy.php';
require_once __DIR__ . '/../api/attendance_filters.php';
function verify_manual($condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
$schedule = ['startTime' => '08:00:00', 'endTime' => '09:00:00', 'yearLevel' => '1st Year', 'sectionName' => 'A'];
$schedule['id'] = 10;
$date = '2026-10-12';
$scan = ['userId' => 1, 'logDate' => $date, 'logTime' => '08:00:00', 'status' => 'IN', 'source' => 'esp32', 'localRecordId' => 'device-1'];
$existingIn = array_merge($scan, ['id' => 100]);
$existingOut = array_merge($scan, ['id' => 101, 'status' => 'OUT', 'logTime' => '09:04:00']);
$otherClass = array_merge($scan, ['id' => 102, 'logTime' => '13:00:00']);
verify_manual(manual_attendance_target([$otherClass, $existingOut, $existingIn], $schedule, 1, $date, 'IN')['id'] === 100, 'Manual IN must update the existing class IN row.');
verify_manual(manual_attendance_target([$otherClass, $existingOut, $existingIn], $schedule, 1, $date, 'OUT')['id'] === 101, 'Manual OUT must update the existing class OUT row.');
$savedIn = array_merge($existingIn, ['source' => 'faculty-manual', 'localRecordId' => "manual:10:1:$date", 'status' => 'ABSENT', 'logTime' => '00:00:00']);
verify_manual(manual_attendance_target([$savedIn, $existingIn], $schedule, 1, $date, 'IN')['id'] === 100, 'Repeated checkbox changes must reuse the saved row even at zero time.');
verify_manual(manual_attendance_target([$otherClass], $schedule, 1, $date, 'IN') === null, 'Another class IN must not be changed.');
verify_manual(manual_attendance_target([$existingIn, $existingOut], $schedule, 2, $date, 'OUT') === null, 'Another student must not be changed.');
verify_manual(manual_attendance_target([$existingIn], $schedule, 1, '2026-10-13', 'IN') === null, 'Another date must not be changed.');
$savedOut = array_merge($existingOut, ['source' => 'faculty-manual-out-absent', 'localRecordId' => "manual:10:1:$date:out", 'status' => 'ABSENT', 'logTime' => '00:00:00']);
verify_manual(manual_attendance_target([$savedOut], $schedule, 1, $date, 'OUT')['id'] === 101, 'OUT changes must reuse the OUT row without changing IN.');
$taggedIn = array_merge($existingIn, ['source' => 'faculty-manual:10:IN', 'logTime' => '08:16:00']);
$taggedOut = array_merge($existingOut, ['source' => 'faculty-manual:10:OUT:L']);
// One checkbox must plan both writes, including creating a missing OUT.
foreach ([[], [$existingIn], [$existingIn, $existingOut]] as $logs) {
    foreach (['Present' => '08:00:00', 'Late' => '08:16:00', 'Absent' => '00:00:00'] as $status => $inTime) {
        $changes = manual_attendance_changes($logs, $schedule, 1, $date, $status);
        verify_manual(count($changes) === 2, 'Each status must save an IN and an OUT.');
        verify_manual($changes[0]['logTime'] === $inTime, 'Paired IN must use the selected status time.');
        verify_manual($changes[1]['logTime'] === ($status === 'Absent' ? '00:00:00' : '09:00:00'), 'Paired OUT must use the class end or zero for Absent.');
        verify_manual(array_column($changes, 'status') === ($status === 'Absent' ? ['ABSENT', 'ABSENT'] : ['IN', 'OUT']), 'Both saved records must match the selected status.');
        verify_manual(($changes[0]['target']['id'] ?? null) === (count($logs) ? 100 : null), 'Existing IN must be reused.');
        verify_manual(($changes[1]['target']['id'] ?? null) === (count($logs) === 2 ? 101 : null), 'Existing OUT must be reused; missing OUT must be created.');
    }
}
$savedPair = [];
foreach (['Present', 'Late', 'Absent', 'Present', 'Absent', 'Late'] as $status) {
    $changes = manual_attendance_changes($savedPair, $schedule, 1, $date, $status);
    foreach ($changes as $index => $change) {
        verify_manual(($change['target']['id'] ?? null) === ($savedPair ? 200 + $index : null), 'Repeated changes must reuse both records, including zero-time Absent records.');
    }
    $savedPair = array_map(fn($index) => array_merge($scan, $changes[$index], ['id' => 200 + $index]), [0, 1]);
}
$isolated = manual_attendance_changes([$otherClass, $existingOut, $existingIn], $schedule, 2, $date, 'Present');
verify_manual($isolated[0]['target'] === null && $isolated[1]['target'] === null, 'Paired updates must not change another student.');
verify_manual(manual_attendance_target([$taggedIn, $taggedOut], $schedule, 1, $date, 'IN')['id'] === 100, 'Tagged IN must retain the original scan row ID.');
verify_manual(manual_attendance_target([$taggedIn, $taggedOut], $schedule, 1, $date, 'OUT')['id'] === 101, 'Tagged OUT must retain the original scan row ID.');
verify_manual(manual_attendance_current_status([$taggedIn, $taggedOut], $schedule, 1, $date) === 'Late', 'Same to IN must recognize tags without replacing device local record IDs.');
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
