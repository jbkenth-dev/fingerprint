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
            subjectId INT NOT NULL,
            subjectCode VARCHAR(100) NOT NULL,
            subjectName VARCHAR(255) NOT NULL,
            startTime TIME NOT NULL,
            endTime TIME NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_schedule_subject (sectionName, yearLevel, semester, subjectId),
            CONSTRAINT fk_class_schedules_subject FOREIGN KEY (subjectId) REFERENCES class_subjects(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function normalize_value(?string $value): string {
    return trim((string) $value);
}

function normalize_subject_code(?string $value): string {
    return strtoupper(normalize_value($value));
}

function normalize_subject_name(?string $value): string {
    return mb_strtoupper(normalize_value($value), 'UTF-8');
}

function validate_subject_payload(array $input): ?string {
    if (normalize_subject_code($input['subjectCode'] ?? '') === '') {
        return 'Subject code required';
    }
    if (normalize_value($input['subjectName'] ?? '') === '') {
        return 'Subject name is required';
    }
    if (normalize_value($input['yearLevel'] ?? '') === '') {
        return 'Year level is required';
    }
    if (normalize_value($input['semester'] ?? '') === '') {
        return 'Semister is required';
    }
    return null;
}

function subject_code_exists(PDO $pdo, string $subjectCode, ?int $excludeId = null): bool {
    if ($excludeId !== null) {
        $stmt = $pdo->prepare('SELECT id FROM class_subjects WHERE UPPER(TRIM(subjectCode)) = ? AND id <> ? LIMIT 1');
        $stmt->execute([$subjectCode, $excludeId]);
    } else {
        $stmt = $pdo->prepare('SELECT id FROM class_subjects WHERE UPPER(TRIM(subjectCode)) = ? LIMIT 1');
        $stmt->execute([$subjectCode]);
    }
    return (bool) $stmt->fetch();
}

function subject_name_exists(PDO $pdo, string $subjectName, ?int $excludeId = null): bool {
    if ($excludeId !== null) {
        $stmt = $pdo->prepare('SELECT id FROM class_subjects WHERE UPPER(TRIM(subjectName)) = ? AND id <> ? LIMIT 1');
        $stmt->execute([$subjectName, $excludeId]);
    } else {
        $stmt = $pdo->prepare('SELECT id FROM class_subjects WHERE UPPER(TRIM(subjectName)) = ? LIMIT 1');
        $stmt->execute([$subjectName]);
    }
    return (bool) $stmt->fetch();
}

function fetch_subject(PDO $pdo, int $id): ?array {
    $stmt = $pdo->prepare('SELECT id, subjectCode, subjectName, yearLevel, semester, createdAt, updatedAt FROM class_subjects WHERE id = ?');
    $stmt->execute([$id]);
    $subject = $stmt->fetch();
    return $subject ?: null;
}

function subject_has_schedule(PDO $pdo, int $id): bool {
    $stmt = $pdo->prepare('SELECT id FROM class_schedules WHERE subjectId = ? LIMIT 1');
    $stmt->execute([$id]);
    return (bool) $stmt->fetch();
}

ensure_class_subjects_table($pdo);
ensure_class_schedules_table($pdo);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    require_auth($pdo);
    $stmt = $pdo->query('SELECT id, subjectCode, subjectName, yearLevel, semester, createdAt, updatedAt FROM class_subjects ORDER BY subjectCode ASC, id ASC');
    echo json_encode($stmt->fetchAll());
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = [];
}

if ($method === 'POST') {
    require_auth($pdo, 'admin');
    $validationError = validate_subject_payload($input);
    if ($validationError) {
        http_response_code(400);
        echo json_encode(['error' => $validationError]);
        exit;
    }

    $subjectCode = normalize_subject_code($input['subjectCode'] ?? '');
    $subjectName = normalize_subject_name($input['subjectName'] ?? '');
    if (subject_code_exists($pdo, $subjectCode)) {
        http_response_code(409);
        echo json_encode(['error' => 'Subject code already exist']);
        exit;
    }
    if (subject_name_exists($pdo, $subjectName)) {
        http_response_code(409);
        echo json_encode(['error' => 'Subject Name already exist']);
        exit;
    }

    $stmt = $pdo->prepare('INSERT INTO class_subjects (subjectCode, subjectName, yearLevel, semester) VALUES (?, ?, ?, ?)');
    $stmt->execute([
        $subjectCode,
        normalize_value($input['subjectName'] ?? ''),
        normalize_value($input['yearLevel'] ?? ''),
        normalize_value($input['semester'] ?? ''),
    ]);

    echo json_encode(fetch_subject($pdo, (int) $pdo->lastInsertId()));
    exit;
}

if ($method === 'PUT') {
    require_auth($pdo, 'admin');
    $id = isset($input['id']) ? (int) $input['id'] : 0;
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'An ID is required.']);
        exit;
    }

    $validationError = validate_subject_payload($input);
    if ($validationError) {
        http_response_code(400);
        echo json_encode(['error' => $validationError]);
        exit;
    }

    $subjectCode = normalize_subject_code($input['subjectCode'] ?? '');
    $subjectName = normalize_subject_name($input['subjectName'] ?? '');
    if (subject_code_exists($pdo, $subjectCode, $id)) {
        http_response_code(409);
        echo json_encode(['error' => 'Subject code already exist']);
        exit;
    }
    if (subject_name_exists($pdo, $subjectName, $id)) {
        http_response_code(409);
        echo json_encode(['error' => 'Subject Name already exist']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE class_subjects SET subjectCode = ?, subjectName = ?, yearLevel = ?, semester = ? WHERE id = ?');
    $stmt->execute([
        $subjectCode,
        normalize_value($input['subjectName'] ?? ''),
        normalize_value($input['yearLevel'] ?? ''),
        normalize_value($input['semester'] ?? ''),
        $id,
    ]);

    echo json_encode(fetch_subject($pdo, $id));
    exit;
}

if ($method === 'DELETE') {
    require_auth($pdo, 'admin');
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'An ID is required.']);
        exit;
    }

    if (subject_has_schedule($pdo, $id)) {
        http_response_code(409);
        echo json_encode(['error' => 'Subject cannot be deleted because it already has a class schedule.']);
        exit;
    }

    $stmt = $pdo->prepare('DELETE FROM class_subjects WHERE id = ?');
    $stmt->execute([$id]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
