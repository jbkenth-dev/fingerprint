<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_middleware.php';

// Auto-create the departments table if it does not exist.
$pdo->exec('CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)');

$method = $_SERVER['REQUEST_METHOD'];

// GET — list all departments
if ($method === 'GET') {
    require_auth($pdo); // any authenticated user can list departments
    $stmt = $pdo->query('SELECT id, name FROM departments ORDER BY name ASC');
    echo json_encode($stmt->fetchAll());
    exit;
}

// POST — create department
if ($method === 'POST') {
    require_auth($pdo, 'admin');
    $input = json_decode(file_get_contents('php://input'), true);
    $name = trim($input['name'] ?? '');

    if ($name === '') {
        http_response_code(400);
        echo json_encode(["error" => "Department name is required."]);
        exit;
    }

    // Duplicate check (case-insensitive)
    $stmt = $pdo->prepare('SELECT id FROM departments WHERE LOWER(name) = LOWER(?)');
    $stmt->execute([$name]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(["error" => "Department already exists."]);
        exit;
    }

    $stmt = $pdo->prepare('INSERT INTO departments (name) VALUES (?)');
    $stmt->execute([$name]);
    $id = $pdo->lastInsertId();

    $stmt = $pdo->prepare('SELECT id, name FROM departments WHERE id = ?');
    $stmt->execute([$id]);
    http_response_code(201);
    echo json_encode($stmt->fetch());
    exit;
}

// PUT — update department
if ($method === 'PUT') {
    require_auth($pdo, 'admin');
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? null;
    $name = trim($input['name'] ?? '');

    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "An ID is required."]);
        exit;
    }
    if ($name === '') {
        http_response_code(400);
        echo json_encode(["error" => "Department name is required."]);
        exit;
    }

    // Duplicate check (case-insensitive, excluding self)
    $stmt = $pdo->prepare('SELECT id FROM departments WHERE LOWER(name) = LOWER(?) AND id != ?');
    $stmt->execute([$name, (int) $id]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(["error" => "Department already exists."]);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE departments SET name = ? WHERE id = ?');
    $stmt->execute([$name, (int) $id]);

    $stmt = $pdo->prepare('SELECT id, name FROM departments WHERE id = ?');
    $stmt->execute([(int) $id]);
    echo json_encode($stmt->fetch());
    exit;
}

// DELETE — delete department
if ($method === 'DELETE') {
    require_auth($pdo, 'admin');
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "An ID is required."]);
        exit;
    }

    $stmt = $pdo->prepare('DELETE FROM departments WHERE id = ?');
    $stmt->execute([(int) $id]);
    echo json_encode(["ok" => true]);
    exit;
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
