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

// Ensure authorized owner admin account (malikg@gmail.com) exists in admins table
try {
    $ownerEmail = 'malikg@gmail.com';
    $chkOwner = $pdo->prepare('SELECT id FROM admins WHERE LOWER(email) = :email LIMIT 1');
    $chkOwner->execute([':email' => $ownerEmail]);
    if (!$chkOwner->fetch()) {
        $initialHash = password_hash('malikgcollection', PASSWORD_DEFAULT);
        $upOwner = $pdo->prepare('INSERT INTO admins (id, email, password_hash) VALUES (1, :email, :hash) ON DUPLICATE KEY UPDATE email = :email2, password_hash = :hash2');
        $upOwner->execute([
            ':email'  => $ownerEmail,
            ':hash'   => $initialHash,
            ':email2' => $ownerEmail,
            ':hash2'  => $initialHash,
        ]);
    }
} catch (Throwable $e) {
    // Continue safely
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'check') {
    if (isAdminAuthenticated()) {
        sendJson([
            'success'       => true,
            'authenticated' => true,
            'role'          => 'admin',
            'admin'         => [
                'id'    => (int)$_SESSION['admin_id'],
                'email' => $_SESSION['admin_email'],
            ],
            'csrfToken'     => ensureCsrfToken(),
        ]);
    } elseif (!empty($_SESSION['customer_id'])) {
        sendJson([
            'success'               => true,
            'authenticated'         => false,
            'customerAuthenticated' => true,
            'role'                  => 'customer',
            'user'                  => [
                'id'       => (int)$_SESSION['customer_id'],
                'fullName' => $_SESSION['customer_name'] ?? '',
                'email'    => $_SESSION['customer_email'] ?? '',
                'role'     => 'customer',
            ],
            'csrfToken'             => ensureCsrfToken(),
        ]);
    } else {
        sendJson([
            'success'               => true,
            'authenticated'         => false,
            'customerAuthenticated' => false,
            'role'                  => null,
            'csrfToken'             => ensureCsrfToken(),
        ]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'register') {
    $body = getJsonBody();
    $fullName = trim((string)($body['fullName'] ?? ''));
    $email = strtolower(trim((string)($body['email'] ?? '')));
    $password = (string)($body['password'] ?? '');
    $confirmPassword = (string)($body['confirmPassword'] ?? '');

    if ($fullName === '') {
        sendJson(['success' => false, 'error' => 'Please enter your full name.'], 400);
    }

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJson(['success' => false, 'error' => 'Please enter a valid email address.'], 400);
    }

    if ($password === '') {
        sendJson(['success' => false, 'error' => 'Please enter a password.'], 400);
    }

    if (strlen($password) < 6) {
        sendJson(['success' => false, 'error' => 'Password must be at least 6 characters long.'], 400);
    }

    if ($password !== $confirmPassword) {
        sendJson(['success' => false, 'error' => 'Passwords do not match.'], 400);
    }

    // Ensure customers table exists
    $pdo->exec("CREATE TABLE IF NOT EXISTS `customers` (
      `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      `full_name` VARCHAR(191) NOT NULL,
      `email` VARCHAR(191) NOT NULL,
      `password_hash` VARCHAR(255) NOT NULL,
      `role` VARCHAR(32) NOT NULL DEFAULT 'customer',
      `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      UNIQUE KEY `uniq_customer_email` (`email`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $chkCust = $pdo->prepare('SELECT id FROM customers WHERE LOWER(email) = :email LIMIT 1');
    $chkCust->execute([':email' => $email]);

    if ($chkCust->fetch()) {
        sendJson(['success' => false, 'error' => 'An account with this email already exists.'], 409);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $ins = $pdo->prepare('INSERT INTO customers (full_name, email, password_hash, role) VALUES (:name, :email, :hash, :role)');
    $ins->execute([
        ':name'  => $fullName,
        ':email' => $email,
        ':hash'  => $hash,
        ':role'  => 'customer',
    ]);
    $customerId = (int)$pdo->lastInsertId();

    session_regenerate_id(true);
    unset($_SESSION['admin_id'], $_SESSION['admin_email']);
    $_SESSION['customer_id'] = $customerId;
    $_SESSION['customer_name'] = $fullName;
    $_SESSION['customer_email'] = $email;
    $_SESSION['last_activity'] = time();

    sendJson([
        'success'               => true,
        'message'               => 'Account created successfully.',
        'authenticated'         => false,
        'customerAuthenticated' => true,
        'role'                  => 'customer',
        'user'                  => [
            'id'       => $customerId,
            'fullName' => $fullName,
            'email'    => $email,
            'role'     => 'customer',
        ],
        'csrfToken'             => ensureCsrfToken(),
    ]);
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

    if ($admin && password_verify($password, $admin['password_hash'])) {
        session_regenerate_id(true);
        unset($_SESSION['customer_id'], $_SESSION['customer_name'], $_SESSION['customer_email']);
        $_SESSION['admin_id'] = (int)$admin['id'];
        $_SESSION['admin_email'] = $admin['email'];
        $_SESSION['last_activity'] = time();
        $csrf = ensureCsrfToken();

        sendJson([
            'success'       => true,
            'authenticated' => true,
            'role'          => 'admin',
            'admin'         => [
                'id'    => (int)$admin['id'],
                'email' => $admin['email'],
            ],
            'csrfToken'     => $csrf,
        ]);
    }

    // Check customer table
    try {
        $cStmt = $pdo->prepare('SELECT id, full_name, email, password_hash FROM customers WHERE LOWER(email) = :email LIMIT 1');
        $cStmt->execute([':email' => $email]);
        $customer = $cStmt->fetch();
        if ($customer && password_verify($password, $customer['password_hash'])) {
            session_regenerate_id(true);
            unset($_SESSION['admin_id'], $_SESSION['admin_email']);
            $_SESSION['customer_id'] = (int)$customer['id'];
            $_SESSION['customer_name'] = $customer['full_name'];
            $_SESSION['customer_email'] = $customer['email'];
            $_SESSION['last_activity'] = time();

            sendJson([
                'success'               => true,
                'authenticated'         => false,
                'customerAuthenticated' => true,
                'role'                  => 'customer',
                'user'                  => [
                    'id'       => (int)$customer['id'],
                    'fullName' => $customer['full_name'],
                    'email'    => $customer['email'],
                    'role'     => 'customer',
                ],
                'csrfToken'             => ensureCsrfToken(),
            ]);
        }
    } catch (Throwable $e) {
        // Table may not exist yet before first registration
    }

    sendJson(['success' => false, 'error' => 'Invalid email or password.'], 401);
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
    $confirmPassword = (string)($body['confirmNewPassword'] ?? $body['confirmPassword'] ?? '');

    if ($currentPassword === '') {
        sendJson(['success' => false, 'error' => 'Please enter your current password.'], 400);
    }

    if ($newPassword === '') {
        sendJson(['success' => false, 'error' => 'Please enter a new password.'], 400);
    }

    if (strlen($newPassword) < 6) {
        sendJson(['success' => false, 'error' => 'New password must be at least 6 characters long.'], 400);
    }

    if ($newPassword !== $confirmPassword) {
        sendJson(['success' => false, 'error' => 'New passwords do not match.'], 400);
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
        'message' => 'Password updated successfully.',
    ]);
}

sendJson(['success' => false, 'error' => 'Invalid auth action.'], 400);
