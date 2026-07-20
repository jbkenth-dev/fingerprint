<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_middleware.php';

function ensure_class_subjects_table(PDO $pdo): void {
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS class_subjects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subjectCode VARCHAR(100) NOT NULL,
            subjectName VARCHAR(255) NOT NULL,
            yearLevel VARCHAR(20) NOT NULL,
            semester VARCHAR(20) NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_subject_code (subjectCode)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function ensure_class_schedules_table(PDO $pdo): void {
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS class_schedules (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sectionName VARCHAR(1) NOT NULL,
            yearLevel VARCHAR(20) NOT NULL,
            semester VARCHAR(20) NOT NULL,
            days VARCHAR(64) NOT NULL,
            subjectId INT NOT NULL,
            subjectCode VARCHAR(100) NOT NULL,
            subjectName VARCHAR(255) NOT NULL,
            startTime TIME NOT NULL,
            endTime TIME NOT NULL,
            facultyId INT DEFAULT NULL,
            facultyName VARCHAR(255) DEFAULT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_schedule_subject (sectionName, yearLevel, semester, subjectId),
            CONSTRAINT fk_class_schedules_subject FOREIGN KEY (subjectId) REFERENCES class_subjects(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $columns = $pdo->query('SHOW COLUMNS FROM class_schedules LIKE "days"')->fetchAll();
    if (count($columns) === 0) {
        $pdo->exec("ALTER TABLE class_schedules ADD COLUMN days VARCHAR(64) NOT NULL DEFAULT 'Monday' AFTER semester");
    }

    $facultyIdColumns = $pdo->query('SHOW COLUMNS FROM class_schedules LIKE "facultyId"')->fetchAll();
    if (count($facultyIdColumns) === 0) {
        $pdo->exec("ALTER TABLE class_schedules ADD COLUMN facultyId INT DEFAULT NULL AFTER endTime");
    }

    $facultyNameColumns = $pdo->query('SHOW COLUMNS FROM class_schedules LIKE "facultyName"')->fetchAll();
    if (count($facultyNameColumns) === 0) {
        $pdo->exec("ALTER TABLE class_schedules ADD COLUMN facultyName VARCHAR(255) DEFAULT NULL AFTER facultyId");
    }
}

function normalize_value(?string $value): string {
    return trim((string) $value);
}

function normalize_section(?string $value): string {
    return strtoupper(normalize_value($value));
}

function normalize_days(array $days): array {
    $allowedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    $allowedLookup = array_flip($allowedDays);
    $normalizedDays = [];

    foreach ($days as $day) {
        $normalizedDay = normalize_value(is_string($day) ? $day : '');
        if ($normalizedDay !== '' && isset($allowedLookup[$normalizedDay])) {
            $normalizedDays[$normalizedDay] = $normalizedDay;
        }
    }

    return array_values(array_intersect($allowedDays, array_values($normalizedDays)));
}

function encode_days(array $days): string {
    return implode(', ', normalize_days($days));
}

function decode_days(?string $days): array {
    return normalize_days(array_map('trim', explode(',', (string) $days)));
}

function days_overlap(array $leftDays, array $rightDays): bool {
    return count(array_intersect(normalize_days($leftDays), normalize_days($rightDays))) > 0;
}

function time_to_minutes(string $time): ?int {
    if (!preg_match('/^\d{2}:\d{2}$/', $time)) {
        return null;
    }
    [$hours, $minutes] = array_map('intval', explode(':', $time));
    if ($hours < 0 || $hours > 23 || $minutes < 0 || $minutes > 59) {
        return null;
    }
    return ($hours * 60) + $minutes;
}

function validate_schedule_payload(array $input): ?string {
    if (normalize_section($input['section'] ?? '') === '') {
        return 'Section is required';
    }
    if (normalize_value($input['yearLevel'] ?? '') === '') {
        return 'Year level is required';
    }
    if (normalize_value($input['semester'] ?? '') === '') {
        return 'Semester is required';
    }
    if (!isset($input['days']) || !is_array($input['days']) || count(normalize_days($input['days'])) === 0) {
        return 'Please select at least one day.';
    }
    if (!isset($input['entries']) || !is_array($input['entries']) || count($input['entries']) === 0) {
        return 'No subjects are available for the selected year level and semester.';
    }

    foreach ($input['entries'] as $entry) {
        $startTime = normalize_value($entry['startTime'] ?? '');
        $endTime = normalize_value($entry['endTime'] ?? '');

        if ($startTime === '' || $endTime === '') {
            return 'Start and end times are required';
        }

        $startMinutes = time_to_minutes($startTime);
        $endMinutes = time_to_minutes($endTime);
        if ($startMinutes === null || $endMinutes === null) {
            return 'Start and end times are required';
        }
        if (($endMinutes - $startMinutes) < 60) {
            return 'Start and end times must be at least 1 hour apart';
        }

        if (empty($entry['facultyId'])) {
            return 'Faculty is required for each subject.';
        }
    }

    return null;
}

function section_schedule_exists(PDO $pdo, string $section, string $yearLevel, string $semester): bool {
    $stmt = $pdo->prepare('SELECT id FROM class_schedules WHERE sectionName = ? AND yearLevel = ? AND semester = ? LIMIT 1');
    $stmt->execute([$section, $yearLevel, $semester]);
    return (bool) $stmt->fetch();
}

function fetch_schedule_group_rows(PDO $pdo, string $section, string $yearLevel, string $semester): array {
    $stmt = $pdo->prepare('SELECT id, sectionName AS section, yearLevel, semester, days, subjectId, subjectCode, subjectName, startTime, endTime, facultyId, facultyName, createdAt, updatedAt FROM class_schedules WHERE sectionName = ? AND yearLevel = ? AND semester = ? ORDER BY startTime ASC, subjectCode ASC');
    $stmt->execute([$section, $yearLevel, $semester]);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        $row['days'] = decode_days($row['days'] ?? '');
    }
    unset($row);
    return $rows;
}

function delete_schedule_group(PDO $pdo, string $section, string $yearLevel, string $semester): void {
    $stmt = $pdo->prepare('DELETE FROM class_schedules WHERE sectionName = ? AND yearLevel = ? AND semester = ?');
    $stmt->execute([$section, $yearLevel, $semester]);
}

function fetch_subjects_for_schedule(PDO $pdo, string $yearLevel, string $semester): array {
    $stmt = $pdo->prepare('SELECT id, subjectCode, subjectName, yearLevel, semester FROM class_subjects WHERE yearLevel = ? AND semester = ? ORDER BY subjectCode ASC, subjectName ASC');
    $stmt->execute([$yearLevel, $semester]);
    return $stmt->fetchAll();
}

function validate_subject_matches(PDO $pdo, array $inputEntries, array $availableSubjects): array {
    $subjectsById = [];
    foreach ($availableSubjects as $subject) {
        $subjectsById[(int) $subject['id']] = $subject;
    }

    $normalizedEntries = [];
    foreach ($inputEntries as $entry) {
        $subjectId = isset($entry['subjectId']) ? (int) $entry['subjectId'] : 0;
        if ($subjectId <= 0 || !isset($subjectsById[$subjectId])) {
            throw new RuntimeException('One or more schedule subjects are invalid.');
        }

        $subject = $subjectsById[$subjectId];
        $facultyId = !empty($entry['facultyId']) ? (int) $entry['facultyId'] : null;
        $facultyName = normalize_value($entry['facultyName'] ?? '');

        $normalizedEntries[] = [
            'subjectId' => $subjectId,
            'subjectCode' => $subject['subjectCode'],
            'subjectName' => $subject['subjectName'],
            'startTime' => normalize_value($entry['startTime'] ?? ''),
            'endTime' => normalize_value($entry['endTime'] ?? ''),
            'facultyId' => $facultyId,
            'facultyName' => $facultyName,
        ];
    }

    return $normalizedEntries;
}

function validate_time_overlaps(array $entries): ?string {
    $windows = [];
    foreach ($entries as $entry) {
        $windows[] = [
            'start' => time_to_minutes($entry['startTime']),
            'end' => time_to_minutes($entry['endTime']),
        ];
    }

    usort($windows, fn ($left, $right) => $left['start'] <=> $right['start']);

    for ($index = 1; $index < count($windows); $index++) {
        if ($windows[$index]['start'] < $windows[$index - 1]['end']) {
            return 'Schedule times must not overlap.';
        }
    }

    return null;
}

function find_subject_schedule_conflict(PDO $pdo, array $entries, ?array $excludeGroup = null): ?array {
    $stmt = $pdo->prepare(
        'SELECT sectionName AS section, yearLevel, semester, days
         FROM class_schedules
         WHERE subjectId = ?
           AND startTime < ?
           AND endTime > ?
           AND NOT (sectionName = ? AND yearLevel = ? AND semester = ?)'
    );

    $excludeSection = $excludeGroup['section'] ?? '';
    $excludeYearLevel = $excludeGroup['yearLevel'] ?? '';
    $excludeSemester = $excludeGroup['semester'] ?? '';

    $inputDays = normalize_days($excludeGroup['days'] ?? []);

    foreach ($entries as $entry) {
        $stmt->execute([
            $entry['subjectId'],
            $entry['endTime'],
            $entry['startTime'],
            $excludeSection,
            $excludeYearLevel,
            $excludeSemester,
        ]);

        while ($conflict = $stmt->fetch()) {
            if (days_overlap($inputDays, decode_days($conflict['days'] ?? ''))) {
                return [
                    'entry' => $entry,
                    'section' => $conflict['section'],
                    'yearLevel' => $conflict['yearLevel'],
                    'semester' => $conflict['semester'],
                    'days' => decode_days($conflict['days'] ?? ''),
                ];
            }
        }
    }

    return null;
}

function fetch_schedule_rows(PDO $pdo): array {
    $stmt = $pdo->query('SELECT id, sectionName AS section, yearLevel, semester, days, subjectId, subjectCode, subjectName, startTime, endTime, facultyId, facultyName, createdAt, updatedAt FROM class_schedules ORDER BY sectionName ASC, yearLevel ASC, semester ASC, startTime ASC, subjectCode ASC');
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        $row['days'] = decode_days($row['days'] ?? '');
    }
    unset($row);
    return $rows;
}

ensure_class_subjects_table($pdo);
ensure_class_schedules_table($pdo);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    require_auth($pdo);
    if (isset($_GET['yearLevel']) || isset($_GET['semester'])) {
        $yearLevel = normalize_value($_GET['yearLevel'] ?? '');
        $semester = normalize_value($_GET['semester'] ?? '');
        if ($yearLevel === '' || $semester === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Year level and semester are required.']);
            exit;
        }

        echo json_encode([
            'subjects' => fetch_subjects_for_schedule($pdo, $yearLevel, $semester),
        ]);
        exit;
    }

    echo json_encode(fetch_schedule_rows($pdo));
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = [];
}

if ($method === 'POST') {
    require_auth($pdo, 'admin');
    $validationError = validate_schedule_payload($input);
    if ($validationError) {
        http_response_code(400);
        echo json_encode(['error' => $validationError]);
        exit;
    }

    $section = normalize_section($input['section'] ?? '');
    $yearLevel = normalize_value($input['yearLevel'] ?? '');
    $semester = normalize_value($input['semester'] ?? '');
    $days = normalize_days($input['days'] ?? []);

    if (section_schedule_exists($pdo, $section, $yearLevel, $semester)) {
        http_response_code(409);
        echo json_encode(['error' => sprintf('Section %s already has a schedule for %s (%s).', $section, $yearLevel, $semester)]);
        exit;
    }

    $availableSubjects = fetch_subjects_for_schedule($pdo, $yearLevel, $semester);
    if (count($availableSubjects) === 0) {
        http_response_code(400);
        echo json_encode(['error' => 'No subjects are available for the selected year level and semester.']);
        exit;
    }

    try {
        $entries = validate_subject_matches($pdo, $input['entries'], $availableSubjects);
    } catch (RuntimeException $exception) {
        http_response_code(400);
        echo json_encode(['error' => $exception->getMessage()]);
        exit;
    }

    if (count($entries) !== count($availableSubjects)) {
        http_response_code(400);
        echo json_encode(['error' => 'All subjects for the selected year level and semester must be scheduled.']);
        exit;
    }

    $overlapError = validate_time_overlaps($entries);
    if ($overlapError) {
        http_response_code(409);
        echo json_encode(['error' => $overlapError]);
        exit;
    }

    $subjectConflict = find_subject_schedule_conflict($pdo, $entries, [
        'days' => $days,
    ]);
    if ($subjectConflict) {
        http_response_code(409);
        echo json_encode([
            'error' => sprintf(
                'This subject is already scheduled for Section %s at this time.',
                $subjectConflict['section']
            ),
        ]);
        exit;
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO class_schedules (sectionName, yearLevel, semester, days, subjectId, subjectCode, subjectName, startTime, endTime, facultyId, facultyName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        foreach ($entries as $entry) {
            $stmt->execute([
                $section,
                $yearLevel,
                $semester,
                encode_days($days),
                $entry['subjectId'],
                $entry['subjectCode'],
                $entry['subjectName'],
                $entry['startTime'],
                $entry['endTime'],
                $entry['facultyId'],
                $entry['facultyName'],
            ]);
        }
        $pdo->commit();
    } catch (Throwable $throwable) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save the class schedule.']);
        exit;
    }

    echo json_encode([
        'message' => 'Class schedule saved successfully.',
        'rows' => fetch_schedule_rows($pdo),
    ]);
    exit;
}

if ($method === 'PUT') {
    require_auth($pdo, 'admin');
    $originalSection = normalize_section($input['originalSection'] ?? '');
    $originalYearLevel = normalize_value($input['originalYearLevel'] ?? '');
    $originalSemester = normalize_value($input['originalSemester'] ?? '');

    if ($originalSection === '' || $originalYearLevel === '' || $originalSemester === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Original schedule details are required.']);
        exit;
    }

    $validationError = validate_schedule_payload($input);
    if ($validationError) {
        http_response_code(400);
        echo json_encode(['error' => $validationError]);
        exit;
    }

    $existingRows = fetch_schedule_group_rows($pdo, $originalSection, $originalYearLevel, $originalSemester);
    if (count($existingRows) === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'The selected class schedule was not found.']);
        exit;
    }

    $section = normalize_section($input['section'] ?? '');
    $yearLevel = normalize_value($input['yearLevel'] ?? '');
    $semester = normalize_value($input['semester'] ?? '');
    $days = normalize_days($input['days'] ?? []);

    $isSameGroup = $section === $originalSection && $yearLevel === $originalYearLevel && $semester === $originalSemester;
    if (!$isSameGroup && section_schedule_exists($pdo, $section, $yearLevel, $semester)) {
        http_response_code(409);
        echo json_encode(['error' => sprintf('Section %s already has a schedule for %s (%s).', $section, $yearLevel, $semester)]);
        exit;
    }

    $availableSubjects = fetch_subjects_for_schedule($pdo, $yearLevel, $semester);
    if (count($availableSubjects) === 0) {
        http_response_code(400);
        echo json_encode(['error' => 'No subjects are available for the selected year level and semester.']);
        exit;
    }

    try {
        $entries = validate_subject_matches($pdo, $input['entries'], $availableSubjects);
    } catch (RuntimeException $exception) {
        http_response_code(400);
        echo json_encode(['error' => $exception->getMessage()]);
        exit;
    }

    if (count($entries) !== count($availableSubjects)) {
        http_response_code(400);
        echo json_encode(['error' => 'All subjects for the selected year level and semester must be scheduled.']);
        exit;
    }

    $overlapError = validate_time_overlaps($entries);
    if ($overlapError) {
        http_response_code(409);
        echo json_encode(['error' => $overlapError]);
        exit;
    }

    $subjectConflict = find_subject_schedule_conflict($pdo, $entries, [
        'section' => $originalSection,
        'yearLevel' => $originalYearLevel,
        'semester' => $originalSemester,
        'days' => $days,
    ]);
    if ($subjectConflict) {
        http_response_code(409);
        echo json_encode([
            'error' => sprintf(
                'This subject is already scheduled for Section %s at this time.',
                $subjectConflict['section']
            ),
        ]);
        exit;
    }

    $pdo->beginTransaction();
    try {
        delete_schedule_group($pdo, $originalSection, $originalYearLevel, $originalSemester);

        $stmt = $pdo->prepare('INSERT INTO class_schedules (sectionName, yearLevel, semester, days, subjectId, subjectCode, subjectName, startTime, endTime, facultyId, facultyName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        foreach ($entries as $entry) {
            $stmt->execute([
                $section,
                $yearLevel,
                $semester,
                encode_days($days),
                $entry['subjectId'],
                $entry['subjectCode'],
                $entry['subjectName'],
                $entry['startTime'],
                $entry['endTime'],
                $entry['facultyId'],
                $entry['facultyName'],
            ]);
        }
        $pdo->commit();
    } catch (Throwable $throwable) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update the class schedule.']);
        exit;
    }

    echo json_encode([
        'message' => 'Class schedule updated successfully.',
        'rows' => fetch_schedule_rows($pdo),
    ]);
    exit;
}

if ($method === 'DELETE') {
    require_auth($pdo, 'admin');
    $section = normalize_section($_GET['section'] ?? '');
    $yearLevel = normalize_value($_GET['yearLevel'] ?? '');
    $semester = normalize_value($_GET['semester'] ?? '');

    if ($section === '' || $yearLevel === '' || $semester === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Section, year level, and semester are required.']);
        exit;
    }

    $existingRows = fetch_schedule_group_rows($pdo, $section, $yearLevel, $semester);
    if (count($existingRows) === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'The selected class schedule was not found.']);
        exit;
    }

    delete_schedule_group($pdo, $section, $yearLevel, $semester);

    echo json_encode([
        'message' => 'Class schedule deleted successfully.',
        'rows' => fetch_schedule_rows($pdo),
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
