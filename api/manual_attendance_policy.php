<?php
function manual_attendance_time(array $schedule, string $status): string {
    if (!in_array($status, ['Present', 'Late', 'Absent'], true)) throw new InvalidArgumentException('Choose Present, Late, or Absent.');
    $minutes = static function ($time): int {
        if (!is_string($time) || !preg_match('/^(\d{2}):(\d{2})(?::\d{2})?$/D', $time, $match) || (int) $match[1] > 23 || (int) $match[2] > 59) {
            throw new InvalidArgumentException('The class time schedule is invalid.');
        }
        return (int) $match[1] * 60 + (int) $match[2];
    };
    $start = $minutes($schedule['startTime'] ?? null);
    $end = $minutes($schedule['endTime'] ?? null);
    if ($end <= $start) throw new InvalidArgumentException('The class time schedule is invalid.');
    if ($status === 'Absent') return '00:00:00';
    $time = $start + ($status === 'Late' ? 16 : 0);
    if ($time > $end - 15) throw new InvalidArgumentException('This class has no valid time for the selected attendance status.');
    return sprintf('%02d:%02d:00', intdiv($time, 60), $time % 60);
}

function manual_attendance_out_time(array $schedule, string $status): ?string {
    manual_attendance_time($schedule, $status);
    if ($status === 'Absent') return null;
    return strlen($schedule['endTime']) === 5 ? $schedule['endTime'] . ':00' : $schedule['endTime'];
}

function manual_attendance_current_status(array $logs, array $schedule, int $userId, string $date): string {
    $start = (int) substr($schedule['startTime'], 0, 2) * 60 + (int) substr($schedule['startTime'], 3, 2);
    $end = (int) substr($schedule['endTime'], 0, 2) * 60 + (int) substr($schedule['endTime'], 3, 2);
    $first = null;
    foreach ($logs as $log) {
        if ((int) $log['userId'] !== $userId || $log['logDate'] !== $date) continue;
        $minutes = (int) substr($log['logTime'], 0, 2) * 60 + (int) substr($log['logTime'], 3, 2);
        if ($log['source'] === 'faculty-manual' && ($log['localRecordId'] ?? '') === "manual:{$schedule['id']}:$userId:$date") {
            return $log['status'] === 'ABSENT' ? 'Absent' : ($minutes <= $start + 15 ? 'Present' : 'Late');
        }
        if (str_starts_with($log['source'] ?? '', 'faculty-manual') || $log['status'] !== 'IN') continue;
        if ($minutes >= $start - 15 && $minutes <= $end - 15) $first = $first === null ? $minutes : min($first, $minutes);
    }
    return $first === null ? 'Absent' : ($first <= $start + 15 ? 'Present' : 'Late');
}

function manual_attendance_student_matches(array $student, array $schedule): bool {
    if (($student['role'] ?? '') !== 'student' || ($student['status'] ?? '') !== 'Active') return false;
    if (!preg_match('/(\d)[^-]*-\s*([A-E])$|(\d)\s*([A-E])$/i', $student['department'] ?? '', $match)) return false;
    $year = (int) ($match[1] !== '' ? $match[1] : ($match[3] ?? 0));
    $section = strtoupper($match[2] !== '' ? $match[2] : ($match[4] ?? ''));
    return (['', '1st Year', '2nd Year', '3rd Year', '4th Year'][$year] ?? '') === $schedule['yearLevel'] && $section === $schedule['sectionName'];
}
