<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_middleware.php';

function normalize_login(string $value): string {
    return strtolower(trim($value));
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
    $stmt = $pdo->prepare('SELECT * FROM users WHERE (LOWER(email) = ? OR LOWER(username) = ?) AND role = ? AND status = "Active" LIMIT 1');
    $stmt->execute([$identifier, $identifier, $role]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid credentials or inactive account"]);
        exit;
    }

    $storedPassword = $user['password'] ?? '';
    $passwordValid = password_verify($password, $storedPassword);

    // If password_verify failed and the stored value is not a bcrypt hash,
    // the password may have been inserted as plaintext (e.g. from seed data).
    // Try a direct comparison and, if it matches, upgrade to bcrypt on the fly.
    if (!$passwordValid && $storedPassword !== '' && !str_starts_with($storedPassword, '$2')) {
        if (hash_equals($storedPassword, $password)) {
            $passwordValid = true;
            $newHash = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare('UPDATE users SET password = ? WHERE id = ?');
            $stmt->execute([$newHash, $user['id']]);
            $user['password'] = $newHash;
        }
    }

    if (!$passwordValid) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid credentials or inactive account"]);
        exit;
    }

    $token = create_session($pdo, $user['id'], $user['role']);

    echo json_encode(["user" => sanitize_user($user), "token" => $token]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
