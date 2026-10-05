<?php
/**
 * MALIK G COLLECTION — CATEGORIES API ENDPOINT
 * - GET: Public & Admin list of categories
 * - POST: Admin create new category
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$pdo = getDBConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query('SELECT id, name, slug, subtitle FROM categories ORDER BY id ASC');
    $categories = $stmt->fetchAll();
    sendJson(['success' => true, 'categories' => $categories]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAdminAuth();
    verifyCsrfToken();

    $body = getJsonBody();
    $name = trim((string)($body['name'] ?? ''));
    $subtitle = trim((string)($body['subtitle'] ?? 'Curated collection at Malik G Collection'));

    if ($name === '') {
        sendJson(['success' => false, 'error' => 'Category name is required.'], 400);
    }

    $slug = strtolower((string)preg_replace('/[^a-zA-Z0-9]+/', '-', $name));
    $stmt = $pdo->prepare('INSERT INTO categories (name, slug, subtitle) VALUES (:name, :slug, :subtitle)');
    try {
        $stmt->execute([
            ':name'     => $name,
            ':slug'     => $slug,
            ':subtitle' => $subtitle,
        ]);
        sendJson([
            'success'  => true,
            'category' => [
                'id'       => (int)$pdo->lastInsertId(),
                'name'     => $name,
                'slug'     => $slug,
                'subtitle' => $subtitle,
            ],
        ]);
    } catch (PDOException $e) {
        sendJson(['success' => false, 'error' => 'Category already exists.'], 400);
    }
}

sendJson(['success' => false, 'error' => 'Method not allowed.'], 405);
