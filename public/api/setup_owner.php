<?php
/**
 * MALIK G COLLECTION — INITIAL OWNER ACCOUNT SETUP UTILITY
 * Run once after importing database.sql on Hostinger if no admin exists yet,
 * or to initialize the first owner Gmail & password_hash().
 * Automatically locks itself once an owner password has been configured.
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$pdo = getDBConnection();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = getJsonBody();
    $email = strtolower(trim((string)($body['email'] ?? '')));
    $password = (string)($body['password'] ?? '');

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
        sendJson(['success' => false, 'error' => 'Provide a valid Gmail address and a password of at least 8 characters.'], 400);
    }

    $countStmt = $pdo->query('SELECT COUNT(*) FROM admins');
    $count = (int)$countStmt->fetchColumn();

    if ($count > 0) {
        sendJson([
            'success' => false,
            'error'   => 'An owner account already exists. Please sign in at /admin/login and use Change Password.',
        ], 403);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $ins = $pdo->prepare('INSERT INTO admins (email, password_hash) VALUES (:email, :hash)');
    $ins->execute([':email' => $email, ':hash' => $hash]);

    sendJson([
        'success' => true,
        'message' => 'Initial owner account created successfully. You may now log in at /admin/login.',
    ]);
}

sendJson([
    'success' => true,
    'message' => 'POST { "email": "your@gmail.com", "password": "YourSecurePassword" } to initialize if admins table is empty.',
]);
