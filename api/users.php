<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_middleware.php';

function column_exists(PDO $pdo, string $table, string $column): bool {
    $stmt = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
    $stmt->execute([$column]);
    return (bool) $stmt->fetch();
}

function select_user_fields(PDO $pdo): string {
    $fields = ['id','role','status','firstName','lastName','email','phone','smartCardId','fingerprintId','department'];
    if (column_exists($pdo, 'users', 'middleName')) {
        $fields[] = 'middleName';
    }
    if (column_exists($pdo, 'users', 'idNumber')) {
        $fields[] = 'idNumber';
    }
    if (column_exists($pdo, 'users', 'username')) {
        $fields[] = 'username';
    }
    if (column_exists($pdo, 'users', 'password')) {
        $fields[] = 'password';
    }
    return implode(',', $fields);
}

function writable_user_fields(PDO $pdo): array {
    $fields = ['role','status','firstName','lastName','email','phone','smartCardId','fingerprintId','department'];
    foreach (['middleName', 'idNumber', 'username', 'password'] as $field) {
        if (column_exists($pdo, 'users', $field)) {
            $fields[] = $field;
        }
    }
    return $fields;
}

function find_duplicate_field(PDO $pdo, string $field, ?string $value, ?int $excludeId = null): bool {
    if ($value === null || $value === '') {
        return false;
    }
    if (!column_exists($pdo, 'users', $field)) {
        return false;
    }
    if ($excludeId) {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE LOWER(TRIM(`$field`)) = LOWER(TRIM(?)) AND id <> ? LIMIT 1");
        $stmt->execute([$value, $excludeId]);
    } else {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE LOWER(TRIM(`$field`)) = LOWER(TRIM(?)) LIMIT 1");
        $stmt->execute([$value]);
    }
    return (bool) $stmt->fetch();
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT ' . select_user_fields($pdo) . ' FROM users ORDER BY id ASC');
    $users = $stmt->fetchAll();
    echo json_encode($users);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if ($method === 'POST') {
    require_auth($pdo, 'admin');
    // create new user — hash password for non-student roles, store plaintext for students
    if (isset($input['password']) && $input['password'] !== '') {
        $role = $input['role'] ?? '';
        if ($role !== 'student') {
            $input['password'] = password_hash($input['password'], PASSWORD_BCRYPT);
        }
    }
    if (find_duplicate_field($pdo, 'idNumber', $input['idNumber'] ?? null)) {
        http_response_code(409);
        echo json_encode(["error" => "ID number already exists."]);
        exit;
    }
    if (find_duplicate_field($pdo, 'username', $input['username'] ?? null)) {
        http_response_code(409);
        echo json_encode(["error" => "Username already exists."]);
        exit;
    }
    if (find_duplicate_field($pdo, 'email', $input['email'] ?? null)) {
        http_response_code(409);
        echo json_encode(["error" => "Email address already exists."]);
        exit;
    }

    $fields = writable_user_fields($pdo);
    $values = [];
    $placeholders = [];
    foreach ($fields as $f) {
        $values[] = $input[$f] ?? null;
        $placeholders[] = '?';
    }
    $sql = 'INSERT INTO users (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);
    $id = $pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT ' . select_user_fields($pdo) . ' FROM users WHERE id = ?');
    $stmt->execute([$id]);
    echo json_encode($stmt->fetch());
    exit;
}

if ($method === 'PUT') {
    $authUser = require_auth($pdo); // require authentication, but not necessarily admin
    // update user (requires id)
    $id = $input['id'] ?? null;
    if (!$id) { http_response_code(400); echo json_encode(["error"=>"An ID is required."]); exit; }
    // If updating another user's record, require admin role
    if ((int)$id !== (int)$authUser['id']) {
        $authUser = require_auth($pdo, 'admin'); // re-authenticate with admin requirement
    }
    // For non-admin updates, strip role and status fields to prevent tampering
    if ((int)$id === (int)$authUser['id'] && $authUser['role'] !== 'admin') {
        unset($input['role']);
        unset($input['status']);
    }
    if (isset($input['password']) && $input['password'] !== '') {
        // Fetch the target user's role to decide hashing
        $stmt = $pdo->prepare('SELECT role FROM users WHERE id = ?');
        $stmt->execute([(int) $id]);
        $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);
        $targetRole = $targetUser['role'] ?? '';

        // If the user is changing their own password, verify current password
        if ((int) $id === (int) $authUser['id']) {
            $currentPassword = $input['currentPassword'] ?? '';
            if (!$currentPassword) {
                http_response_code(400);
                echo json_encode(["error" => "Current password is required to change your password."]);
                exit;
            }
            $stmt = $pdo->prepare('SELECT password FROM users WHERE id = ?');
            $stmt->execute([(int) $id]);
            $stored = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$stored || !password_verify($currentPassword, $stored['password'])) {
                http_response_code(401);
                echo json_encode(["error" => "Invalid current password."]);
                exit;
            }
            unset($input['currentPassword']);
        } else {
            // Admin resetting another user's password — no current password needed
            unset($input['currentPassword']);
        }
        // Hash password for non-student roles, store plaintext for students
        if ($targetRole !== 'student') {
            $input['password'] = password_hash($input['password'], PASSWORD_BCRYPT);
        }
    }
    if (find_duplicate_field($pdo, 'idNumber', $input['idNumber'] ?? null, (int) $id)) {
        http_response_code(409);
        echo json_encode(["error" => "ID number already exists."]);
        exit;
    }
    if (find_duplicate_field($pdo, 'username', $input['username'] ?? null, (int) $id)) {
        http_response_code(409);
        echo json_encode(["error" => "Username already exists."]);
        exit;
    }
    if (find_duplicate_field($pdo, 'email', $input['email'] ?? null, (int) $id)) {
        http_response_code(409);
        echo json_encode(["error" => "Email address already exists."]);
        exit;
    }
    $fields = writable_user_fields($pdo);
    $sets = [];
    $values = [];
    foreach ($fields as $f) {
        if (array_key_exists($f, $input)) {
            $sets[] = "$f = ?";
            $values[] = $input[$f];
        }
    }
    if (empty($sets)) { echo json_encode(["ok"=>true]); exit; }
    $values[] = $id;
    $sql = 'UPDATE users SET ' . implode(',', $sets) . ' WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);

    // Keep sessions role in sync with users.role
    if (!empty($input['role'])) {
        $newRole = $input['role'];
        $stmt = $pdo->prepare('UPDATE sessions SET role = ? WHERE user_id = ?');
        $stmt->execute([$newRole, $id]);
    }

    $stmt = $pdo->prepare('SELECT ' . select_user_fields($pdo) . ' FROM users WHERE id = ?');
    $stmt->execute([$id]);
    echo json_encode($stmt->fetch());
    exit;
}

if ($method === 'DELETE') {
    require_auth($pdo, 'admin');
    // delete user by id parameter
    $id = $_GET['id'] ?? null;
    if (!$id) { http_response_code(400); echo json_encode(["error"=>"An ID is required."]); exit; }
    $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$id]);
    echo json_encode(["ok" => true]);
    exit;
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
