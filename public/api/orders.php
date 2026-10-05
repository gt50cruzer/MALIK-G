<?php
/**
 * MALIK G COLLECTION — ORDERS API ENDPOINT
 * - POST (public): Validates customer & cart, generates unique MGC-XXXXXX Order ID,
 *   saves order + immutable product snapshots in order_items BEFORE WhatsApp opens.
 * - GET (admin): Lists all orders with search/status filter or single order details.
 * - POST ?action=update_status (admin): Updates order status (Pending, Confirmed, Processing, Shipped, Delivered, Cancelled).
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$pdo = getDBConnection();
$action = $_GET['action'] ?? '';

/**
 * Generates a guaranteed unique Order ID in format MGC-XXXXXX
 */
function generateUniqueOrderId(PDO $pdo): string
{
    $stmt = $pdo->prepare('SELECT id FROM orders WHERE order_id = :order_id LIMIT 1');
    for ($attempt = 0; $attempt < 20; $attempt++) {
        $candidate = 'MGC-' . random_int(100000, 999999);
        $stmt->execute([':order_id' => $candidate]);
        if (!$stmt->fetch()) {
            return $candidate;
        }
    }
    return 'MGC-' . substr((string)time(), -6);
}

/**
 * Hydrates orders with their immutable order_items snapshots
 */
function hydrateOrders(PDO $pdo, array $orderRows): array
{
    if (empty($orderRows)) {
        return [];
    }

    $ids = array_map(fn($r) => (int)$r['id'], $orderRows);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));

    $itemStmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id IN ($placeholders) ORDER BY id ASC");
    $itemStmt->execute($ids);
    $itemsByOrder = [];
    foreach ($itemStmt->fetchAll() as $item) {
        $oid = (int)$item['order_id'];
        $itemsByOrder[$oid][] = [
            'id'                    => (int)$item['id'],
            'productId'             => $item['product_code_snapshot'] ?: (string)$item['product_id'],
            'productNameSnapshot'   => $item['product_name_snapshot'],
            'productImageSnapshot'  => $item['product_image_snapshot'],
            'selectedColor'         => $item['selected_color'] ?: 'Standard',
            'selectedSize'          => $item['selected_size'] ?: 'N/A',
            'quantity'              => (int)$item['quantity'],
            'unitPrice'             => (float)$item['unit_price'],
            'originalPriceSnapshot' => (float)$item['original_price_snapshot'],
            'subtotal'              => (float)$item['subtotal'],
        ];
    }

    $result = [];
    foreach ($orderRows as $row) {
        $oid = (int)$row['id'];
        $result[] = [
            'id'            => $oid,
            'orderNumber'   => $row['order_id'],
            'createdAt'     => $row['created_at'],
            'updatedAt'     => $row['updated_at'],
            'status'        => $row['status'],
            'paymentMethod' => 'WhatsApp Order',
            'total'         => (float)$row['total_amount'],
            'subtotal'      => (float)$row['total_amount'],
            'customer'      => [
                'fullName' => $row['customer_name'],
                'phone'    => $row['customer_phone'],
                'email'    => $row['customer_email'],
                'city'     => $row['customer_location'],
                'address'  => $row['customer_address'],
                'notes'    => $row['notes'] ?: '',
            ],
            'orderItems'    => $itemsByOrder[$oid] ?? [],
        ];
    }

    return $result;
}

// ============================================================================
// GET: ADMIN ORDER LIST OR SINGLE ORDER
// ============================================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    requireAdminAuth();

    $singleOrderId = trim((string)($_GET['order_id'] ?? $_GET['orderNumber'] ?? ''));
    if ($singleOrderId !== '') {
        $stmt = $pdo->prepare('SELECT * FROM orders WHERE order_id = :order_id LIMIT 1');
        $stmt->execute([':order_id' => $singleOrderId]);
        $rows = $stmt->fetchAll();
        if (empty($rows)) {
            sendJson(['success' => false, 'error' => 'Order not found.'], 404);
        }
        $hydrated = hydrateOrders($pdo, $rows);
        sendJson([
            'success' => true,
            'order'   => $hydrated[0],
        ]);
    }

    $statusFilter = trim((string)($_GET['status'] ?? ''));
    $search = trim((string)($_GET['search'] ?? ''));

    $sql = 'SELECT * FROM orders WHERE 1=1';
    $params = [];

    if ($statusFilter !== '' && $statusFilter !== 'All') {
        $sql .= ' AND status = :status';
        $params[':status'] = $statusFilter;
    }

    if ($search !== '') {
        $sql .= ' AND (order_id LIKE :q OR customer_name LIKE :q OR customer_phone LIKE :q)';
        $params[':q'] = '%' . $search . '%';
    }

    $sql .= ' ORDER BY created_at DESC, id DESC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    sendJson([
        'success' => true,
        'orders'  => hydrateOrders($pdo, $rows),
    ]);
}

// ============================================================================
// POST: UPDATE ORDER STATUS (ADMIN) OR CREATE NEW CUSTOMER ORDER (PUBLIC)
// ============================================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = getJsonBody();

    if ($action === 'update_status') {
        requireAdminAuth();
        verifyCsrfToken();

        $orderNumber = trim((string)($body['orderNumber'] ?? $body['order_id'] ?? ''));
        $status = trim((string)($body['status'] ?? ''));
        $allowedStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

        if ($orderNumber === '' || !in_array($status, $allowedStatuses, true)) {
            sendJson(['success' => false, 'error' => 'Invalid order number or status.'], 400);
        }

        $chkStmt = $pdo->prepare('SELECT id FROM orders WHERE order_id = :order_id LIMIT 1');
        $chkStmt->execute([':order_id' => $orderNumber]);
        if (!$chkStmt->fetch()) {
            sendJson(['success' => false, 'error' => 'Order not found.'], 404);
        }

        $stmt = $pdo->prepare('UPDATE orders SET status = :status, updated_at = NOW() WHERE order_id = :order_id');
        $stmt->execute([
            ':status'   => $status,
            ':order_id' => $orderNumber,
        ]);

        $fetchStmt = $pdo->prepare('SELECT * FROM orders WHERE order_id = :order_id LIMIT 1');
        $fetchStmt->execute([':order_id' => $orderNumber]);
        $hydrated = hydrateOrders($pdo, $fetchStmt->fetchAll());

        sendJson([
            'success'     => true,
            'message'     => "Order {$orderNumber} status updated to {$status}.",
            'orderNumber' => $orderNumber,
            'status'      => $status,
            'order'       => $hydrated[0] ?? null,
        ]);
    }

    // PUBLIC CUSTOMER ORDER PLACEMENT (Saved to MySQL BEFORE WhatsApp redirect)
    $customer = $body['customer'] ?? [];
    $items = $body['items'] ?? [];

    $fullName = sanitizeText((string)($customer['fullName'] ?? ''));
    $phone = sanitizeText((string)($customer['phone'] ?? ''));
    $email = sanitizeText((string)($customer['email'] ?? ''));
    $city = sanitizeText((string)($customer['city'] ?? ''));
    $address = sanitizeText((string)($customer['address'] ?? ''));
    $notes = sanitizeText((string)($customer['notes'] ?? ''));

    if ($fullName === '' || $phone === '' || $email === '' || $city === '' || $address === '') {
        sendJson([
            'success' => false,
            'error'   => 'Full Name, Phone Number, Gmail/Email, Location/City, and Full Address are required.',
        ], 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJson(['success' => false, 'error' => 'Please provide a valid Gmail/email address.'], 400);
    }

    if (empty($items) || !is_array($items)) {
        sendJson(['success' => false, 'error' => 'Your shopping cart cannot be empty.'], 400);
    }

    $orderNumber = generateUniqueOrderId($pdo);
    $totalAmount = 0.0;
    $preparedItems = [];

    $findProdStmt = $pdo->prepare('SELECT id, product_code, title, image, original_price, offer_price FROM products WHERE product_code = :code LIMIT 1');

    foreach ($items as $item) {
        $prodData = $item['product'] ?? [];
        $productCode = (string)($prodData['id'] ?? $item['productId'] ?? '');
        $qty = max(1, (int)($item['quantity'] ?? 1));
        $selectedColor = sanitizeText((string)($item['selectedColor'] ?? 'Standard'));
        $selectedSize = sanitizeText((string)($item['selectedSize'] ?? 'N/A'));

        $findProdStmt->execute([':code' => $productCode]);
        $dbProd = $findProdStmt->fetch();

        if ($dbProd) {
            $dbProductId = (int)$dbProd['id'];
            $nameSnapshot = $dbProd['title'];
            $imageSnapshot = $dbProd['image'];
            $origSnapshot = (float)$dbProd['original_price'];
            $offerVal = $dbProd['offer_price'] !== null ? (float)$dbProd['offer_price'] : null;
            $unitPrice = ($offerVal !== null && $offerVal > 0 && $offerVal < $origSnapshot)
                ? $offerVal
                : $origSnapshot;
        } else {
            $dbProductId = null;
            $nameSnapshot = sanitizeText((string)($prodData['name'] ?? 'Malik G Product'));
            $imageSnapshot = (string)($prodData['image'] ?? '');
            $unitPrice = (float)($prodData['price'] ?? 0);
            $origSnapshot = (float)($prodData['oldPrice'] ?? $prodData['originalPrice'] ?? $unitPrice);
        }

        $lineSubtotal = round($unitPrice * $qty, 2);
        $totalAmount += $lineSubtotal;

        $preparedItems[] = [
            'product_id'              => $dbProductId,
            'product_code_snapshot'   => $productCode,
            'product_name_snapshot'   => $nameSnapshot,
            'product_image_snapshot'  => $imageSnapshot,
            'selected_color'          => $selectedColor,
            'selected_size'           => $selectedSize,
            'quantity'                => $qty,
            'unit_price'              => $unitPrice,
            'original_price_snapshot' => $origSnapshot,
            'subtotal'                => $lineSubtotal,
        ];
    }

    $pdo->beginTransaction();
    try {
        $insOrder = $pdo->prepare(
            'INSERT INTO orders
            (order_id, customer_name, customer_phone, customer_email, customer_location, customer_address, notes, total_amount, status)
            VALUES (:order_id, :name, :phone, :email, :city, :address, :notes, :total, "Pending")'
        );
        $insOrder->execute([
            ':order_id' => $orderNumber,
            ':name'     => $fullName,
            ':phone'    => $phone,
            ':email'    => $email,
            ':city'     => $city,
            ':address'  => $address,
            ':notes'    => $notes ?: null,
            ':total'    => $totalAmount,
        ]);

        $orderDbId = (int)$pdo->lastInsertId();

        $insItem = $pdo->prepare(
            'INSERT INTO order_items
            (order_id, product_id, product_code_snapshot, product_name_snapshot, product_image_snapshot, selected_color, selected_size, quantity, unit_price, original_price_snapshot, subtotal)
            VALUES (:order_id, :pid, :pcode, :pname, :pimg, :color, :size, :qty, :uprice, :oprice, :sub)'
        );

        foreach ($preparedItems as $pi) {
            $insItem->execute([
                ':order_id' => $orderDbId,
                ':pid'      => $pi['product_id'],
                ':pcode'    => $pi['product_code_snapshot'],
                ':pname'    => $pi['product_name_snapshot'],
                ':pimg'     => $pi['product_image_snapshot'],
                ':color'    => $pi['selected_color'],
                ':size'     => $pi['selected_size'],
                ':qty'      => $pi['quantity'],
                ':uprice'   => $pi['unit_price'],
                ':oprice'   => $pi['original_price_snapshot'],
                ':sub'      => $pi['subtotal'],
            ]);
        }

        $pdo->commit();

        $fetchStmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
        $fetchStmt->execute([$orderDbId]);
        $hydrated = hydrateOrders($pdo, $fetchStmt->fetchAll());

        sendJson([
            'success'  => true,
            'message'  => 'Order created successfully',
            'order_id' => $orderNumber,
            'order'    => $hydrated[0] ?? null,
        ]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        sendJson(['success' => false, 'error' => 'Could not save order to database.'], 500);
    }
}

sendJson(['success' => false, 'error' => 'Method not allowed.'], 405);
