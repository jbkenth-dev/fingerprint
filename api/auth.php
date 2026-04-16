<?php
require_once __DIR__ . '/db.php';

function column_exists(PDO $pdo, string $table, string $column): bool {
    $stmt = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
    $stmt->execute([$column]);
    return (bool) $stmt->fetch();
}

function normalize_login(string $value): string {
    return strtolower(trim($value));
}

function fallback_username(array $user): string {
    $email = strtolower((string) ($user['email'] ?? ''));
    return strstr($email, '@', true) ?: $email;
}

function fallback_password(array $user): string {
    return strtolower((string) ($user['firstName'] ?? '')) . '123';
}

function sanitize_user(array $user): array {
    unset($user['password']);
    return $user;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON payload"]);
    exit;
}

$identifier = normalize_login($input['identifier'] ?? '');
$password = (string) ($input['password'] ?? '');
$role = trim($input['role'] ?? '');

if (!$identifier || !$password || !$role) {
    http_response_code(400);
    echo json_encode(["error" => "Username or email, password, and role are required"]);
    exit;
}

try {
    $hasUsername = column_exists($pdo, 'users', 'username');
    $hasPassword = column_exists($pdo, 'users', 'password');
    $user = false;

    if ($hasUsername && $hasPassword) {
        $stmt = $pdo->prepare('SELECT * FROM users WHERE (LOWER(email) = ? OR LOWER(username) = ?) AND role = ? AND status = "Active" LIMIT 1');
        $stmt->execute([$identifier, $identifier, $role]);
        $user = $stmt->fetch();

        if (!$user || (string) ($user['password'] ?? '') !== $password) {
            $user = false;
        }
    } else {
        $stmt = $pdo->prepare('SELECT * FROM users WHERE role = ? AND status = "Active"');
        $stmt->execute([$role]);
        $candidates = $stmt->fetchAll();

        foreach ($candidates as $candidate) {
            $email = normalize_login($candidate['email'] ?? '');
            $username = normalize_login(fallback_username($candidate));
            if (($identifier === $email || $identifier === $username) && hash_equals(fallback_password($candidate), $password)) {
                $user = $candidate;
                break;
            }
        }
    }

    if (!$user) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid credentials or inactive account"]);
        exit;
    }

    echo json_encode(["user" => sanitize_user($user)]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
