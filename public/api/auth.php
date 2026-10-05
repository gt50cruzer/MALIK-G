<?php
/**
 * MALIK G COLLECTION — ADMIN AUTHENTICATION & PASSWORD CHANGE ENDPOINT
 * Supports:
 * - GET  ?action=check
 * - POST ?action=login
 * - POST ?action=logout
 * - POST ?action=change_password
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$action = $_GET['action'] ?? '';
$pdo = getDBConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'check') {
    if (isAdminAuthenticated()) {
        sendJson([
            'success'       => true,
            'authenticated' => true,
            'admin'         => [
                'id'    => (int)$_SESSION['admin_id'],
                'email' => $_SESSION['admin_email'],
            ],
            'csrfToken'     => ensureCsrfToken(),
        ]);
    } else {
        sendJson([
            'success'       => true,
            'authenticated' => false,
            'csrfToken'     => ensureCsrfToken(),
        ]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
    $body = getJsonBody();
    $email = strtolower(trim((string)($body['email'] ?? '')));
    $password = (string)($body['password'] ?? '');

    if ($email === '' || $password === '') {
        sendJson(['success' => false, 'error' => 'Please enter both email and password.'], 400);
    }

    $stmt = $pdo->prepare('SELECT id, email, password_hash FROM admins WHERE LOWER(email) = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    $admin = $stmt->fetch();

    if (!$admin || !password_verify($password, $admin['password_hash'])) {
        sendJson(['success' => false, 'error' => 'Invalid email or password.'], 401);
    }

    session_regenerate_id(true);
    $_SESSION['admin_id'] = (int)$admin['id'];
    $_SESSION['admin_email'] = $admin['email'];
    $_SESSION['last_activity'] = time();
    $csrf = ensureCsrfToken();

    sendJson([
        'success'       => true,
        'authenticated' => true,
        'admin'         => [
            'id'    => (int)$admin['id'],
            'email' => $admin['email'],
        ],
        'csrfToken'     => $csrf,
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
    }
    session_destroy();
    sendJson(['success' => true, 'authenticated' => false]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'change_password') {
    requireAdminAuth();
    verifyCsrfToken();

    $body = getJsonBody();
    $currentPassword = (string)($body['currentPassword'] ?? '');
    $newPassword = (string)($body['newPassword'] ?? '');
    $confirmPassword = (string)($body['confirmPassword'] ?? '');

    if ($currentPassword === '' || $newPassword === '' || $confirmPassword === '') {
        sendJson(['success' => false, 'error' => 'All password fields are required.'], 400);
    }

    if (strlen($newPassword) < 8) {
        sendJson(['success' => false, 'error' => 'New password must be at least 8 characters long.'], 400);
    }

    if ($newPassword !== $confirmPassword) {
        sendJson(['success' => false, 'error' => 'New password and confirmation do not match.'], 400);
    }

    $stmt = $pdo->prepare('SELECT id, password_hash FROM admins WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => (int)$_SESSION['admin_id']]);
    $admin = $stmt->fetch();

    if (!$admin || !password_verify($currentPassword, $admin['password_hash'])) {
        sendJson(['success' => false, 'error' => 'Current password is incorrect.'], 401);
    }

    $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $updateStmt = $pdo->prepare('UPDATE admins SET password_hash = :hash, updated_at = NOW() WHERE id = :id');
    $updateStmt->execute([
        ':hash' => $newHash,
        ':id'   => (int)$admin['id'],
    ]);

    sendJson([
        'success' => true,
        'message' => 'Owner password updated successfully. Your old password is no longer valid.',
    ]);
}

sendJson(['success' => false, 'error' => 'Invalid auth action.'], 400);
