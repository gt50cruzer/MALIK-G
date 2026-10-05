<?php
/**
 * MALIK G COLLECTION — PRODUCTS & INVENTORY MANAGEMENT API
 * - GET: Fetch published products (or all products if ?admin=1 and authenticated)
 * - POST ?action=create | update | delete | toggle_publish | toggle_stock
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$pdo = getDBConnection();
$action = $_GET['action'] ?? 'list';

/**
 * Helper to load colors & sizes for an array of product rows
 */
function hydrateProducts(PDO $pdo, array $rows): array
{
    if (empty($rows)) {
        return [];
    }

    $productIds = array_map(fn($r) => (int)$r['id'], $rows);
    $placeholders = implode(',', array_fill(0, count($productIds), '?'));

    // Fetch colors
    $colorStmt = $pdo->prepare("SELECT product_id, color_name, color_hex FROM product_colors WHERE product_id IN ($placeholders) ORDER BY id ASC");
    $colorStmt->execute($productIds);
    $colorsByProduct = [];
    foreach ($colorStmt->fetchAll() as $c) {
        $pid = (int)$c['product_id'];
        $colorsByProduct[$pid][] = [
            'name' => $c['color_name'],
            'hex'  => $c['color_hex'] ?: '#18181B',
        ];
    }

    // Fetch sizes
    $sizeStmt = $pdo->prepare("SELECT product_id, size_name FROM product_sizes WHERE product_id IN ($placeholders) ORDER BY id ASC");
    $sizeStmt->execute($productIds);
    $sizesByProduct = [];
    foreach ($sizeStmt->fetchAll() as $s) {
        $pid = (int)$s['product_id'];
        $sizesByProduct[$pid][] = $s['size_name'];
    }

    $result = [];
    foreach ($rows as $row) {
        $pid = (int)$row['id'];
        $originalPrice = (float)$row['original_price'];
        $offerPrice = $row['offer_price'] !== null ? (float)$row['offer_price'] : null;
        $discountPercent = (int)$row['discount_percent'];

        $effectivePrice = ($offerPrice !== null && $offerPrice > 0 && $offerPrice < $originalPrice)
            ? $offerPrice
            : $originalPrice;
        $oldPrice = ($offerPrice !== null && $offerPrice > 0 && $offerPrice < $originalPrice)
            ? $originalPrice
            : null;

        $result[] = [
            'dbId'             => $pid,
            'id'               => $row['product_code'],
            'sku'              => $row['sku'],
            'name'             => $row['title'],
            'shortDescription' => $row['short_description'] ?: mb_substr($row['description'], 0, 140),
            'description'      => $row['description'],
            'category'         => $row['category_name'],
            'categoryId'       => (int)$row['category_id'],
            'image'            => $row['image'],
            'gallery'          => [$row['image']],
            'price'            => $effectivePrice,
            'oldPrice'         => $oldPrice,
            'originalPrice'    => $originalPrice,
            'offerPrice'       => $offerPrice,
            'discountPercent'  => $discountPercent,
            'inStock'          => $row['stock_status'] === 'in_stock',
            'stockStatus'      => $row['stock_status'],
            'published'        => (bool)$row['published'],
            'isNewArrival'     => (bool)$row['is_new_arrival'],
            'isTrending'       => (bool)$row['is_trending'],
            'fabricOrMaterial' => $row['fabric_or_material'] ?: 'Premium Malik G Selection',
            'rating'           => (float)$row['rating'],
            'reviewsCount'     => (int)$row['reviews_count'],
            'colors'           => $colorsByProduct[$pid] ?? [],
            'sizes'            => $sizesByProduct[$pid] ?? [],
            'tags'             => [strtolower($row['category_name']), strtolower($row['title'])],
            'createdAt'        => $row['created_at'],
        ];
    }

    return $result;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $isAdminRequest = isset($_GET['admin']) && $_GET['admin'] === '1';
    if ($isAdminRequest) {
        requireAdminAuth();
    }

    $sql = 'SELECT p.*, c.name AS category_name
            FROM products p
            INNER JOIN categories c ON p.category_id = c.id';
    if (!$isAdminRequest) {
        $sql .= ' WHERE p.published = 1';
    }
    $sql .= ' ORDER BY p.id DESC';

    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll();

    sendJson([
        'success'  => true,
        'products' => hydrateProducts($pdo, $rows),
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAdminAuth();
    verifyCsrfToken();

    $body = getJsonBody();

    if ($action === 'create' || $action === 'update') {
        $title = trim((string)($body['name'] ?? $body['title'] ?? ''));
        $description = trim((string)($body['description'] ?? ''));
        $shortDescription = trim((string)($body['shortDescription'] ?? ''));
        $categoryName = trim((string)($body['category'] ?? 'Shirts'));
        $image = trim((string)($body['image'] ?? ''));
        $originalPrice = (float)($body['originalPrice'] ?? 0);
        $offerPriceRaw = $body['offerPrice'] ?? null;
        $offerPrice = ($offerPriceRaw !== null && $offerPriceRaw !== '' && (float)$offerPriceRaw > 0)
            ? (float)$offerPriceRaw
            : null;
        $discountPercent = (int)($body['discountPercent'] ?? 0);
        $inStock = isset($body['inStock']) ? (bool)$body['inStock'] : true;
        $published = isset($body['published']) ? (bool)$body['published'] : true;
        $isNewArrival = isset($body['isNewArrival']) ? (bool)$body['isNewArrival'] : true;
        $isTrending = isset($body['isTrending']) ? (bool)$body['isTrending'] : false;
        $fabricOrMaterial = trim((string)($body['fabricOrMaterial'] ?? 'Premium Malik G Craftsmanship'));

        if ($title === '' || $description === '' || $image === '' || $originalPrice <= 0) {
            sendJson(['success' => false, 'error' => 'Title, description, image, and valid original price are required.'], 400);
        }

        if ($offerPrice !== null && $offerPrice < $originalPrice) {
            $discountPercent = (int)round((($originalPrice - $offerPrice) / $originalPrice) * 100);
        } else {
            $offerPrice = null;
            $discountPercent = 0;
        }

        // Resolve category_id
        $catStmt = $pdo->prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(:name) LIMIT 1');
        $catStmt->execute([':name' => $categoryName]);
        $catRow = $catStmt->fetch();
        if ($catRow) {
            $categoryId = (int)$catRow['id'];
        } else {
            $slug = strtolower((string)preg_replace('/[^a-zA-Z0-9]+/', '-', $categoryName));
            $insCat = $pdo->prepare('INSERT INTO categories (name, slug) VALUES (:name, :slug)');
            $insCat->execute([':name' => $categoryName, ':slug' => $slug]);
            $categoryId = (int)$pdo->lastInsertId();
        }

        $colors = is_array($body['colors'] ?? null) ? $body['colors'] : [];
        $sizes = is_array($body['sizes'] ?? null) ? $body['sizes'] : [];

        $pdo->beginTransaction();
        try {
            if ($action === 'create') {
                $productCode = 'mg-prod-' . time() . '-' . random_int(100, 999);
                $sku = 'MGC-' . strtoupper(substr($categoryName, 0, 2)) . '-' . random_int(1000, 9999);

                $insStmt = $pdo->prepare(
                    'INSERT INTO products
                    (product_code, sku, title, short_description, description, category_id, image, original_price, offer_price, discount_percent, stock_status, published, is_new_arrival, is_trending, fabric_or_material)
                    VALUES (:code, :sku, :title, :short_desc, :desc, :cat_id, :img, :orig_price, :offer_price, :disc, :stock, :pub, :new_arr, :trend, :fabric)'
                );
                $insStmt->execute([
                    ':code'        => $productCode,
                    ':sku'         => $sku,
                    ':title'       => $title,
                    ':short_desc'  => $shortDescription ?: mb_substr($description, 0, 140),
                    ':desc'        => $description,
                    ':cat_id'      => $categoryId,
                    ':img'         => $image,
                    ':orig_price'  => $originalPrice,
                    ':offer_price' => $offerPrice,
                    ':disc'        => $discountPercent,
                    ':stock'       => $inStock ? 'in_stock' : 'out_of_stock',
                    ':pub'         => $published ? 1 : 0,
                    ':new_arr'     => $isNewArrival ? 1 : 0,
                    ':trend'       => $isTrending ? 1 : 0,
                    ':fabric'      => $fabricOrMaterial,
                ]);
                $productId = (int)$pdo->lastInsertId();
            } else {
                $productCode = (string)($body['id'] ?? '');
                $findStmt = $pdo->prepare('SELECT id FROM products WHERE product_code = :code OR id = :id LIMIT 1');
                $findStmt->execute([':code' => $productCode, ':id' => (int)($body['dbId'] ?? 0)]);
                $existing = $findStmt->fetch();
                if (!$existing) {
                    $pdo->rollBack();
                    sendJson(['success' => false, 'error' => 'Product not found.'], 404);
                }
                $productId = (int)$existing['id'];

                $updStmt = $pdo->prepare(
                    'UPDATE products SET
                        title = :title,
                        short_description = :short_desc,
                        description = :desc,
                        category_id = :cat_id,
                        image = :img,
                        original_price = :orig_price,
                        offer_price = :offer_price,
                        discount_percent = :disc,
                        stock_status = :stock,
                        published = :pub,
                        is_new_arrival = :new_arr,
                        is_trending = :trend,
                        fabric_or_material = :fabric,
                        updated_at = NOW()
                     WHERE id = :id'
                );
                $updStmt->execute([
                    ':title'       => $title,
                    ':short_desc'  => $shortDescription ?: mb_substr($description, 0, 140),
                    ':desc'        => $description,
                    ':cat_id'      => $categoryId,
                    ':img'         => $image,
                    ':orig_price'  => $originalPrice,
                    ':offer_price' => $offerPrice,
                    ':disc'        => $discountPercent,
                    ':stock'       => $inStock ? 'in_stock' : 'out_of_stock',
                    ':pub'         => $published ? 1 : 0,
                    ':new_arr'     => $isNewArrival ? 1 : 0,
                    ':trend'       => $isTrending ? 1 : 0,
                    ':fabric'      => $fabricOrMaterial,
                    ':id'          => $productId,
                ]);

                $pdo->prepare('DELETE FROM product_colors WHERE product_id = ?')->execute([$productId]);
                $pdo->prepare('DELETE FROM product_sizes WHERE product_id = ?')->execute([$productId]);
            }

            // Insert colors
            $insColor = $pdo->prepare('INSERT INTO product_colors (product_id, color_name, color_hex) VALUES (:pid, :name, :hex)');
            foreach ($colors as $c) {
                $cName = is_array($c) ? trim((string)($c['name'] ?? '')) : trim((string)$c);
                $cHex = is_array($c) ? trim((string)($c['hex'] ?? '#18181B')) : '#18181B';
                if ($cName !== '') {
                    $insColor->execute([':pid' => $productId, ':name' => $cName, ':hex' => $cHex]);
                }
            }

            // Insert sizes
            $insSize = $pdo->prepare('INSERT INTO product_sizes (product_id, size_name) VALUES (:pid, :size)');
            foreach ($sizes as $s) {
                $sName = trim((string)$s);
                if ($sName !== '') {
                    $insSize->execute([':pid' => $productId, ':size' => $sName]);
                }
            }

            $pdo->commit();

            $rowStmt = $pdo->prepare('SELECT p.*, c.name AS category_name FROM products p INNER JOIN categories c ON p.category_id = c.id WHERE p.id = ?');
            $rowStmt->execute([$productId]);
            $hydrated = hydrateProducts($pdo, $rowStmt->fetchAll());

            sendJson(['success' => true, 'product' => $hydrated[0] ?? null]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendJson(['success' => false, 'error' => 'Failed to save product: ' . $e->getMessage()], 500);
        }
    }

    if ($action === 'delete') {
        $productCode = (string)($body['id'] ?? '');
        // Deleting from products sets product_id = NULL on order_items while preserving snapshots
        $delStmt = $pdo->prepare('DELETE FROM products WHERE product_code = :code');
        $delStmt->execute([':code' => $productCode]);
        sendJson(['success' => true]);
    }

    if ($action === 'toggle_publish') {
        $productCode = (string)($body['id'] ?? '');
        $published = !empty($body['published']) ? 1 : 0;
        $stmt = $pdo->prepare('UPDATE products SET published = :pub, updated_at = NOW() WHERE product_code = :code');
        $stmt->execute([':pub' => $published, ':code' => $productCode]);
        sendJson(['success' => true]);
    }

    if ($action === 'toggle_stock') {
        $productCode = (string)($body['id'] ?? '');
        $inStock = !empty($body['inStock']) ? 'in_stock' : 'out_of_stock';
        $stmt = $pdo->prepare('UPDATE products SET stock_status = :stock, updated_at = NOW() WHERE product_code = :code');
        $stmt->execute([':stock' => $inStock, ':code' => $productCode]);
        sendJson(['success' => true]);
    }
}

sendJson(['success' => false, 'error' => 'Invalid products action.'], 400);
