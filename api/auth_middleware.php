<?php
/**
 * Authentication middleware for Francis Key API.
 * Include this file in any endpoint that requires authentication.
 *
 * Usage:
 *   require_once __DIR__ . '/auth_middleware.php';
 *   $currentUser = require_auth($pdo); // returns user array
 *   $currentUser = require_auth($pdo, 'admin'); // requires admin role
 */

/**
 * Validate a Bearer token from the Authorization header.
 * Returns the user session array or null if invalid/expired.
 */
function validate_session(PDO $pdo): ?array {
    $headers = [];

    // getallheaders() may not be available on all PHP builds (e.g., Nginx + PHP-FPM)
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
    } else {
        // Fallback: parse from $_SERVER
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $headerName = str_replace('_', '-', strtolower(substr($key, 5)));
                $headers[$headerName] = $value;
            }
        }
    }

    // Normalize header keys to lowercase for case-insensitive lookup
    $normalizedHeaders = [];
    foreach ($headers as $key => $value) {
        $normalizedHeaders[strtolower($key)] = $value;
    }

    $authHeader = $normalizedHeaders['authorization'] ?? '';

    if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
        return null;
    }

    $token = $matches[1];

    // Ensure sessions table exists
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token VARCHAR(128) NOT NULL UNIQUE,
            role VARCHAR(32) NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )'
    );

    $stmt = $pdo->prepare(
        'SELECT s.user_id, s.role, s.expires_at,
                u.id, u.role AS user_role, u.status,
                u.firstName, u.lastName, u.email
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.token = ? AND s.expires_at > NOW() AND u.status = "Active"
         LIMIT 1'
    );
    $stmt->execute([$token]);
    $row = $stmt->fetch();

    if (!$row) {
        return null;
    }

    return $row;
}

/**
 * Require authentication. Sends 401/403 and exits if not authorized.
 *
 * @param PDO $pdo Database connection
 * @param string|null $allowedRole Optional role to restrict access (e.g., 'admin')
 * @return array The authenticated user's session data
 */
function require_auth(PDO $pdo, ?string $allowedRole = null): array {
    $session = validate_session($pdo);

    if (!$session) {
        // Debug: capture token presence
        $headers = [];
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
        } else {
            foreach ($_SERVER as $key => $value) {
                if (str_starts_with($key, 'HTTP_')) {
                    $headerName = str_replace('_', '-', strtolower(substr($key, 5)));
                    $headers[$headerName] = $value;
                }
            }
        }
        $normalizedHeaders = [];
        foreach ($headers as $key => $value) {
            $normalizedHeaders[strtolower($key)] = $value;
        }
        $authHeader = $normalizedHeaders['authorization'] ?? '';
        $tokenProvided = !empty($authHeader) ? 'yes' : 'no';
        error_log('[auth_middleware] Authentication failed. Token provided: '.$tokenProvided);
        http_response_code(401);
        header('X-Auth-Debug: Token provided: '.$tokenProvided);
        echo json_encode(['error' => 'Unauthorized. Please sign in again.']);
        exit;
    }

    if ($allowedRole) {
        $deny = ($session['role'] !== $allowedRole) && ($session['user_role'] !== $allowedRole);
        if ($deny) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden. Insufficient permissions.']);
            exit;
        }
    }

    return $session;
}

/**
 * Generate a cryptographically secure session token.
 *
 * @param PDO $pdo Database connection
 * @param int $userId The user ID
 * @param string $role The user role
 * @param int $ttlHours Token time-to-live in hours (default: 24)
 * @return string The generated token
 */
function create_session(PDO $pdo, int $userId, string $role, int $ttlHours = 24): string {
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', time() + ($ttlHours * 3600));

    // Ensure the sessions table exists before any write operation.
    // validate_session() also creates it, but auth.php only calls
    // create_session() during login — not validate_session() — so we
    // need this here too.
    $pdo->exec('CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(128) NOT NULL UNIQUE,
        role VARCHAR(32) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )');

    // Clean up old sessions for this user (keep only the latest 5)
    $stmt = $pdo->prepare(
        'DELETE FROM sessions WHERE user_id = ? AND id NOT IN (
            SELECT id FROM (
                SELECT id FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5
            ) AS recent
        )'
    );
    $stmt->execute([$userId, $userId]);

    // Insert new session
    $stmt = $pdo->prepare(
        'INSERT INTO sessions (user_id, token, role, expires_at) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $token, $role, $expiresAt]);

    return $token;
}

/**
 * Destroy a session (logout).
 */
function destroy_session(PDO $pdo, string $token): void {
    $stmt = $pdo->prepare('DELETE FROM sessions WHERE token = ?');
    $stmt->execute([$token]);
}