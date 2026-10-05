<?php
/**
 * MALIK G COLLECTION — SECURITY, SESSION, CSRF & RESPONSE HELPERS
 */

declare(strict_types=1);

// Suppress any accidental PHP notices/warnings from corrupting JSON output
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
ob_start();

set_exception_handler(function (Throwable $e): void {
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error.',
        'error'   => 'Internal server error.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
});

require_once __DIR__ . '/../config/database.php';

// Configure secure PHP session cookies
if (session_status() === PHP_SESSION_NONE) {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (!empty($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);

    session_set_cookie_params([
        'lifetime' => ADMIN_SESSION_TIMEOUT,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

function sendJson(array $payload, int $statusCode = 200): void
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    if (isset($payload['error']) && !isset($payload['message'])) {
        $payload['message'] = $payload['error'];
    }
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return $_POST ?: [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : ($_POST ?: []);
}

function ensureCsrfToken(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken(): void
{
    $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    if (!$sessionToken || !$headerToken || !hash_equals($sessionToken, $headerToken)) {
        sendJson(['success' => false, 'error' => 'Invalid or expired security token (CSRF). Please refresh and try again.'], 403);
    }
}

function isAdminAuthenticated(): bool
{
    if (empty($_SESSION['admin_id']) || empty($_SESSION['admin_email'])) {
        return false;
    }
    // Check session timeout
    $lastActivity = $_SESSION['last_activity'] ?? 0;
    if ((time() - $lastActivity) > ADMIN_SESSION_TIMEOUT) {
        session_unset();
        session_destroy();
        return false;
    }
    $_SESSION['last_activity'] = time();
    return true;
}

function requireAdminAuth(): void
{
    if (!isAdminAuthenticated()) {
        sendJson([
            'success'       => false,
            'authenticated' => false,
            'error'         => 'Unauthorized. Owner authentication required.',
        ], 401);
    }
}

function sanitizeText(?string $input): string
{
    return trim(htmlspecialchars((string)$input, ENT_QUOTES, 'UTF-8'));
}
