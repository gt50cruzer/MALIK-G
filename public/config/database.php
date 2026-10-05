<?php
/**
 * MALIK G COLLECTION — SECURE MYSQL DATABASE CONFIGURATION (PDO)
 * Upload to: /public_html/config/database.php on Hostinger
 */

declare(strict_types=1);

// Prevent direct script execution if accessed via URL
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    http_response_code(403);
    exit('Access denied.');
}

// ============================================================================
// HOSTINGER MYSQL CREDENTIALS
// Replace with your Hostinger hPanel -> Databases -> MySQL Databases details
// ============================================================================
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'u123456789_malikg');
define('DB_USER', getenv('DB_USER') ?: 'u123456789_admin');
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: 'CHANGE_ME_IN_HOSTINGER');

// Session timeout in seconds (2 hours)
define('ADMIN_SESSION_TIMEOUT', 7200);

/**
 * Returns a singleton PDO connection using prepared statements & strict error mode.
 */
function getDBConnection(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_NAME);
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => false,
                'error'   => 'Database connection error. Please verify config/database.php credentials.',
            ]);
            exit;
        }
    }

    return $pdo;
}
