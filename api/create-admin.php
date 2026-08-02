<?php
/**
 * Create an admin account.
 *
 * Unlike users.php (which requires an authenticated admin session), this
 * endpoint is the bootstrap path used by the standalone /admin-create-account
 * page. Access is gated by a setup password configured in the environment
 * (ADMIN_SETUP_PASSWORD in the project .env / Awardspace / Vercel env vars).
 *
 * Request body (JSON):
 *   {
 *     "setupPassword": "<the ADMIN_SETUP_PASSWORD value>",
 *     "idNumber": "...", "username": "...",
 *     "firstName": "...", "middleName": "...", "lastName": "...",
 *     "email": "...", "phone": "...", "password": "...",
 *     "department": "..."
 *   }
 *
 * The created user is always role=admin, status=Active, and the password is
 * stored bcrypt-hashed (matching users.php behavior for non-student roles).
 */
require_once __DIR__ . '/db.php';

// db.php already emits CORS + JSON headers and exits on a DB connection failure.

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON payload"]);
    exit;
}

// Verify the setup password from the environment.
$setupPassword = (string) ($input['setupPassword'] ?? '');
$expectedPassword = (string) (getenv('ADMIN_SETUP_PASSWORD') ?: '');
if ($expectedPassword === '' || $setupPassword === '' || !hash_equals($expectedPassword, $setupPassword)) {
    http_response_code(401);
    echo json_encode(["error" => "Invalid or missing setup password."]);
    exit;
}

function create_admin_field_exists(PDO $pdo, string $field, ?string $value): bool {
    if ($value === null || $value === '') {
        return false;
    }
    $stmt = $pdo->prepare("SELECT id FROM users WHERE LOWER(TRIM(`$field`)) = LOWER(TRIM(?)) LIMIT 1");
    $stmt->execute([$value]);
    return (bool) $stmt->fetch();
}

$fieldLabels = [
    'idNumber' => 'ID number',
    'username' => 'Username',
    'email' => 'Email address',
];
foreach ($fieldLabels as $field => $label) {
    if (create_admin_field_exists($pdo, $field, $input[$field] ?? null)) {
        http_response_code(409);
        echo json_encode(["error" => "$label already exists."]);
        exit;
    }
}

$password = (string) ($input['password'] ?? '');
if ($password === '') {
    http_response_code(400);
    echo json_encode(["error" => "Password is required."]);
    exit;
}

$stmt = $pdo->prepare(
    'INSERT INTO users (role, status, idNumber, username, firstName, middleName, lastName, email, phone, department, password)
     VALUES (:role, :status, :idNumber, :username, :firstName, :middleName, :lastName, :email, :phone, :department, :password)'
);
$stmt->execute([
    ':role' => 'admin',
    ':status' => 'Active',
    ':idNumber' => $input['idNumber'] ?? null,
    ':username' => $input['username'] ?? null,
    ':firstName' => $input['firstName'] ?? '',
    ':middleName' => $input['middleName'] ?? null,
    ':lastName' => $input['lastName'] ?? '',
    ':email' => $input['email'] ?? '',
    ':phone' => $input['phone'] ?? null,
    ':department' => $input['department'] ?? '',
    ':password' => password_hash($password, PASSWORD_BCRYPT),
]);

$id = $pdo->lastInsertId();
$stmt = $pdo->prepare(
    'SELECT id, role, status, firstName, middleName, lastName, idNumber, username, email, phone, department
     FROM users WHERE id = ?'
);
$stmt->execute([$id]);
echo json_encode($stmt->fetch());
