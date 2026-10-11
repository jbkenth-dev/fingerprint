<?php
// Keep query validation separate so malformed ranges never fall back to all dates.
function attendance_filters(array $query): array {
    $validDate = static function ($value): bool {
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $value)) return false;
        [$year, $month, $day] = array_map('intval', explode('-', $value));
        return checkdate($month, $day, $year);
    };
    if (isset($query['startDate']) || isset($query['endDate'])) {
        $start = $query['startDate'] ?? '';
        $end = $query['endDate'] ?? '';
        if (!$validDate($start) || !$validDate($end) || $start > $end) {
            throw new InvalidArgumentException('Provide a valid startDate and endDate in YYYY-MM-DD order.');
        }
        return ['where' => ' WHERE a.logDate BETWEEN ? AND ?', 'values' => [$start, $end],
            'range' => ['startDate' => $start, 'endDate' => $end]];
    }
    if (isset($query['date']) && $query['date'] !== '') {
        if (!$validDate($query['date'])) throw new InvalidArgumentException('Provide a valid date in YYYY-MM-DD format.');
        return ['where' => ' WHERE a.logDate = ?', 'values' => [$query['date']], 'range' => null];
    }
    return ['where' => '', 'values' => [], 'range' => null];
}
