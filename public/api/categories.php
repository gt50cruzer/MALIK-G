<?php
/**
 * MALIK G COLLECTION — CATEGORIES API ENDPOINT
 * - GET (public): Active categories list
 * - GET (?admin=1): Admin list of all categories with product counts & timestamps
 * - POST (admin): create, update, toggle_active, delete
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$pdo = getDBConnection();

// Ensure categories table has description, is_active, and updated_at columns
try {
    $pdo->exec('ALTER TABLE categories ADD COLUMN description TEXT NULL');
} catch (Throwable $e) {}
try {
    $pdo->exec('ALTER TABLE categories ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
} catch (Throwable $e) {}
try {
    $pdo->exec('ALTER TABLE categories ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
} catch (Throwable $e) {}

function normalizeCategoryKeyPhp(string $raw): string
{
    $clean = trim((string)preg_replace('/\s+/', ' ', $raw));
    return strtolower($clean);
}

function cleanCategoryNamePhp(string $raw): string
{
    return trim((string)preg_replace('/\s+/', ' ', $raw));
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $isAdminReq = isset($_GET['admin']) && (string)$_GET['admin'] === '1';
    if ($isAdminReq) {
        requireAdminAuth();
    }

    $stmt = $pdo->query(
        'SELECT c.id, c.name, c.slug, c.subtitle, c.description, c.is_active, c.created_at, c.updated_at,
                COUNT(p.id) AS product_count
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id OR LOWER(p.category_name) = LOWER(c.name)
         GROUP BY c.id
         ORDER BY c.id ASC'
    );
    $rows = $stmt->fetchAll();
    $search = strtolower(trim((string)($_GET['search'] ?? '')));

    $categories = [];
    foreach ($rows as $row) {
        $active = !isset($row['is_active']) || (int)$row['is_active'] !== 0;
        if (!$isAdminReq && !$active) {
            continue;
        }
        $name = (string)$row['name'];
        if ($search !== '' && strpos(strtolower($name), $search) === false) {
            continue;
        }
        $desc = isset($row['description']) && $row['description'] !== null
            ? (string)$row['description']
            : (string)($row['subtitle'] ?? '');
        $createdAt = (string)($row['created_at'] ?? gmdate('c'));
        $updatedAt = (string)($row['updated_at'] ?? $createdAt);

        $categories[] = [
            'id'           => (int)$row['id'],
            'name'         => $name,
            'slug'         => (string)$row['slug'],
            'description'  => $desc,
            'subtitle'     => $desc !== '' ? $desc : (string)($row['subtitle'] ?? 'Curated collection at Malik G Collection'),
            'active'       => $active,
            'productCount' => (int)($row['product_count'] ?? 0),
            'createdAt'    => $createdAt,
            'updatedAt'    => $updatedAt,
        ];
    }

    sendJson(['success' => true, 'categories' => $categories]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAdminAuth();
    verifyCsrfToken();

    $body = getJsonBody();
    $action = trim((string)($_GET['action'] ?? $body['action'] ?? 'create'));

    if ($action === 'create') {
        $name = cleanCategoryNamePhp((string)($body['name'] ?? ''));
        $description = trim((string)($body['description'] ?? $body['subtitle'] ?? ''));
        $subtitle = $description !== '' ? $description : 'Curated collection at Malik G Collection';
        $active = !isset($body['active']) || (bool)$body['active'] ? 1 : 0;

        if ($name === '') {
            sendJson(['success' => false, 'message' => 'Category name is required.', 'error' => 'Category name is required.'], 400);
        }

        $dupCheck = $pdo->prepare('SELECT id FROM categories WHERE LOWER(TRIM(name)) = LOWER(:name) LIMIT 1');
        $dupCheck->execute([':name' => $name]);
        if ($dupCheck->fetch()) {
            $err = sprintf('A category named "%s" already exists.', $name);
            sendJson(['success' => false, 'message' => $err, 'error' => $err], 409);
        }

        $slug = strtolower(trim((string)preg_replace('/[^a-zA-Z0-9]+/', '-', $name), '-'));
        $stmt = $pdo->prepare(
            'INSERT INTO categories (name, slug, subtitle, description, is_active) VALUES (:name, :slug, :subtitle, :description, :is_active)'
        );
        $stmt->execute([
            ':name'        => $name,
            ':slug'        => $slug,
            ':subtitle'    => $subtitle,
            ':description' => $description,
            ':is_active'   => $active,
        ]);
        $newId = (int)$pdo->lastInsertId();
        $nowIso = gmdate('c');

        sendJson([
            'success'  => true,
            'message'  => sprintf('Category "%s" created successfully.', $name),
            'category' => [
                'id'           => $newId,
                'name'         => $name,
                'slug'         => $slug,
                'description'  => $description,
                'subtitle'     => $subtitle,
                'active'       => $active === 1,
                'productCount' => 0,
                'createdAt'    => $nowIso,
                'updatedAt'    => $nowIso,
            ],
        ]);
    }

    if ($action === 'update') {
        $id = (int)($body['id'] ?? 0);
        $name = cleanCategoryNamePhp((string)($body['name'] ?? ''));
        $description = trim((string)($body['description'] ?? $body['subtitle'] ?? ''));
        $subtitle = $description !== '' ? $description : 'Curated collection at Malik G Collection';
        $active = !isset($body['active']) || (bool)$body['active'] ? 1 : 0;

        if ($id <= 0) {
            sendJson(['success' => false, 'message' => 'Category not found.', 'error' => 'Category not found.'], 404);
        }
        if ($name === '') {
            sendJson(['success' => false, 'message' => 'Category name is required.', 'error' => 'Category name is required.'], 400);
        }

        $existingStmt = $pdo->prepare('SELECT id, name, created_at FROM categories WHERE id = :id LIMIT 1');
        $existingStmt->execute([':id' => $id]);
        $existing = $existingStmt->fetch();
        if (!$existing) {
            sendJson(['success' => false, 'message' => 'Category not found.', 'error' => 'Category not found.'], 404);
        }

        $dupCheck = $pdo->prepare('SELECT id FROM categories WHERE id <> :id AND LOWER(TRIM(name)) = LOWER(:name) LIMIT 1');
        $dupCheck->execute([':id' => $id, ':name' => $name]);
        if ($dupCheck->fetch()) {
            $err = sprintf('Another category named "%s" already exists.', $name);
            sendJson(['success' => false, 'message' => $err, 'error' => $err], 409);
        }

        $slug = strtolower(trim((string)preg_replace('/[^a-zA-Z0-9]+/', '-', $name), '-'));
        $upd = $pdo->prepare(
            'UPDATE categories SET name = :name, slug = :slug, subtitle = :subtitle, description = :description, is_active = :is_active WHERE id = :id'
        );
        $upd->execute([
            ':name'        => $name,
            ':slug'        => $slug,
            ':subtitle'    => $subtitle,
            ':description' => $description,
            ':is_active'   => $active,
            ':id'          => $id,
        ]);

        // Keep product category_name synchronized with the category_id
        $syncProd = $pdo->prepare(
            'UPDATE products SET category_id = :id, category_name = :name WHERE category_id = :id OR LOWER(category_name) = LOWER(:old_name)'
        );
        $syncProd->execute([
            ':id'       => $id,
            ':name'     => $name,
            ':old_name' => (string)$existing['name'],
        ]);

        $cntStmt = $pdo->prepare('SELECT COUNT(*) FROM products WHERE category_id = :id OR LOWER(category_name) = LOWER(:name)');
        $cntStmt->execute([':id' => $id, ':name' => $name]);
        $prodCount = (int)$cntStmt->fetchColumn();
        $nowIso = gmdate('c');

        sendJson([
            'success'  => true,
            'message'  => sprintf('Category "%s" updated successfully.', $name),
            'category' => [
                'id'           => $id,
                'name'         => $name,
                'slug'         => $slug,
                'description'  => $description,
                'subtitle'     => $subtitle,
                'active'       => $active === 1,
                'productCount' => $prodCount,
                'createdAt'    => (string)($existing['created_at'] ?? $nowIso),
                'updatedAt'    => $nowIso,
            ],
        ]);
    }

    if ($action === 'toggle_active') {
        $id = (int)($body['id'] ?? 0);
        $active = !empty($body['active']) ? 1 : 0;

        $existingStmt = $pdo->prepare('SELECT id, name, slug, subtitle, description, created_at FROM categories WHERE id = :id LIMIT 1');
        $existingStmt->execute([':id' => $id]);
        $existing = $existingStmt->fetch();
        if (!$existing) {
            sendJson(['success' => false, 'message' => 'Category not found.', 'error' => 'Category not found.'], 404);
        }

        $upd = $pdo->prepare('UPDATE categories SET is_active = :is_active WHERE id = :id');
        $upd->execute([':is_active' => $active, ':id' => $id]);

        $cntStmt = $pdo->prepare('SELECT COUNT(*) FROM products WHERE category_id = :id OR LOWER(category_name) = LOWER(:name)');
        $cntStmt->execute([':id' => $id, ':name' => (string)$existing['name']]);
        $prodCount = (int)$cntStmt->fetchColumn();
        $nowIso = gmdate('c');

        sendJson([
            'success'  => true,
            'message'  => sprintf('Category "%s" is now %s.', (string)$existing['name'], $active === 1 ? 'Active' : 'Inactive'),
            'category' => [
                'id'           => $id,
                'name'         => (string)$existing['name'],
                'slug'         => (string)$existing['slug'],
                'description'  => (string)($existing['description'] ?? $existing['subtitle'] ?? ''),
                'subtitle'     => (string)($existing['subtitle'] ?? ''),
                'active'       => $active === 1,
                'productCount' => $prodCount,
                'createdAt'    => (string)($existing['created_at'] ?? $nowIso),
                'updatedAt'    => $nowIso,
            ],
        ]);
    }

    if ($action === 'delete') {
        $id = (int)($body['id'] ?? 0);
        $existingStmt = $pdo->prepare('SELECT id, name FROM categories WHERE id = :id LIMIT 1');
        $existingStmt->execute([':id' => $id]);
        $existing = $existingStmt->fetch();
        if (!$existing) {
            sendJson(['success' => false, 'message' => 'Category not found.', 'error' => 'Category not found.'], 404);
        }

        $cntStmt = $pdo->prepare('SELECT COUNT(*) FROM products WHERE category_id = :id OR LOWER(category_name) = LOWER(:name)');
        $cntStmt->execute([':id' => $id, ':name' => (string)$existing['name']]);
        $prodCount = (int)$cntStmt->fetchColumn();

        if ($prodCount > 0) {
            $blockMsg = 'This category contains products. Please move or remove those products before deleting the category.';
            sendJson(['success' => false, 'message' => $blockMsg, 'error' => $blockMsg, 'productCount' => $prodCount], 400);
        }

        $del = $pdo->prepare('DELETE FROM categories WHERE id = :id');
        $del->execute([':id' => $id]);

        sendJson([
            'success' => true,
            'message' => sprintf('Category "%s" deleted successfully.', (string)$existing['name']),
        ]);
    }

    sendJson(['success' => false, 'message' => 'Invalid category action.', 'error' => 'Invalid category action.'], 400);
}

sendJson(['success' => false, 'error' => 'Method not allowed.'], 405);

