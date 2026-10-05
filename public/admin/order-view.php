<?php
/**
 * MALIK G COLLECTION — VIEW SINGLE ORDER & CHANGE STATUS
 * Route: /admin/order-view.php?order_id=MGC-XXXXXX
 * Shows full customer details and immutable product snapshots (Image, Name, Color, Size, Qty, Price, Total).
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/layout.php';

$pdo = getDBConnection();
$orderIdParam = trim((string)($_GET['order_id'] ?? ''));
$message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['status'], $_POST['order_id'])) {
    $orderIdParam = trim((string)$_POST['order_id']);
    $newStatus = trim((string)$_POST['status']);
    $allowed = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (in_array($newStatus, $allowed, true)) {
        $upd = $pdo->prepare('UPDATE orders SET status = :status, updated_at = NOW() WHERE order_id = :order_id');
        $upd->execute([':status' => $newStatus, ':order_id' => $orderIdParam]);
        $message = "Order status updated to {$newStatus}.";
    }
}

$stmt = $pdo->prepare('SELECT * FROM orders WHERE order_id = :order_id LIMIT 1');
$stmt->execute([':order_id' => $orderIdParam]);
$order = $stmt->fetch();

if (!$order) {
    renderAdminHeader('Order Not Found', 'orders');
    echo '<div class="p-8 bg-[#121214] border border-white/10"><p class="text-sm text-red-400">Order not found.</p><a href="/admin/orders.php" class="inline-block mt-4 text-xs text-[#D4AF37] uppercase">&larr; Back to Orders</a></div>';
    renderAdminFooter();
    exit;
}

$itemStmt = $pdo->prepare('SELECT * FROM order_items WHERE order_id = :oid ORDER BY id ASC');
$itemStmt->execute([':oid' => (int)$order['id']]);
$items = $itemStmt->fetchAll();

$statuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

renderAdminHeader('Order ' . $order['order_id'], 'orders');
?>
<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
    <div>
      <a href="/admin/orders.php" class="text-xs text-[#A1A1AA] hover:text-[#D4AF37] uppercase tracking-wider">&larr; Back to All Orders</a>
      <h1 class="font-display text-3xl font-bold text-[#F5F5F0] mt-1">
        Order <span class="font-mono-num text-[#D4AF37]"><?= htmlspecialchars($order['order_id'], ENT_QUOTES, 'UTF-8') ?></span>
      </h1>
      <p class="text-xs text-[#A1A1AA] mt-1">Placed on <?= htmlspecialchars((string)$order['created_at'], ENT_QUOTES, 'UTF-8') ?></p>
    </div>

    <form method="POST" action="/admin/order-view.php?order_id=<?= urlencode($order['order_id']) ?>" class="flex items-center gap-3">
      <input type="hidden" name="order_id" value="<?= htmlspecialchars($order['order_id'], ENT_QUOTES, 'UTF-8') ?>" />
      <label class="text-xs uppercase tracking-wider text-[#A1A1AA]">Status:</label>
      <select name="status" class="bg-[#18181B] border border-white/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#F5F5F0]">
        <?php foreach ($statuses as $st): ?>
          <option value="<?= $st ?>" <?= $order['status'] === $st ? 'selected' : '' ?>><?= $st ?></option>
        <?php endforeach; ?>
      </select>
      <button type="submit" class="px-4 py-2.5 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider">Update Status</button>
    </form>
  </div>

  <?php if ($message !== ''): ?>
    <div class="p-4 bg-emerald-500/10 border border-emerald-500/40 text-xs text-emerald-300">
      <?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?>
    </div>
  <?php endif; ?>

  <!-- Customer Details -->
  <div class="bg-[#121214] border border-white/10 p-6 space-y-4">
    <h2 class="font-display text-xl font-bold text-[#F5F5F0] border-b border-white/10 pb-3">Customer Information</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
      <div>
        <p class="text-[11px] uppercase tracking-wider text-[#A1A1AA]">Customer Name</p>
        <p class="font-semibold text-[#F5F5F0] mt-1"><?= htmlspecialchars($order['customer_name'], ENT_QUOTES, 'UTF-8') ?></p>
      </div>
      <div>
        <p class="text-[11px] uppercase tracking-wider text-[#A1A1AA]">Phone Number</p>
        <p class="font-mono-num text-[#D4AF37] mt-1"><?= htmlspecialchars($order['customer_phone'], ENT_QUOTES, 'UTF-8') ?></p>
      </div>
      <div>
        <p class="text-[11px] uppercase tracking-wider text-[#A1A1AA]">Gmail / Email</p>
        <p class="text-[#F5F5F0] mt-1"><?= htmlspecialchars($order['customer_email'], ENT_QUOTES, 'UTF-8') ?></p>
      </div>
      <div>
        <p class="text-[11px] uppercase tracking-wider text-[#A1A1AA]">City / Location</p>
        <p class="text-[#F5F5F0] mt-1"><?= htmlspecialchars($order['customer_location'], ENT_QUOTES, 'UTF-8') ?></p>
      </div>
      <div class="sm:col-span-2">
        <p class="text-[11px] uppercase tracking-wider text-[#A1A1AA]">Full Delivery Address</p>
        <p class="text-[#F5F5F0] mt-1"><?= htmlspecialchars($order['customer_address'], ENT_QUOTES, 'UTF-8') ?></p>
      </div>
      <?php if (!empty($order['notes'])): ?>
        <div class="sm:col-span-3">
          <p class="text-[11px] uppercase tracking-wider text-[#A1A1AA]">Customer Order Note</p>
          <p class="text-[#D4AF37] mt-1"><?= htmlspecialchars((string)$order['notes'], ENT_QUOTES, 'UTF-8') ?></p>
        </div>
      <?php endif; ?>
    </div>
  </div>

  <!-- Ordered Products Snapshot -->
  <div class="bg-[#121214] border border-white/10 p-6 space-y-4">
    <h2 class="font-display text-xl font-bold text-[#F5F5F0] border-b border-white/10 pb-3">Ordered Products (Immutable Snapshot)</h2>
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="border-b border-white/10 text-[11px] uppercase tracking-wider text-[#A1A1AA]">
            <th class="py-3 px-3">Product</th>
            <th class="py-3 px-3">Selected Color</th>
            <th class="py-3 px-3">Selected Size</th>
            <th class="py-3 px-3">Quantity</th>
            <th class="py-3 px-3">Unit Price</th>
            <th class="py-3 px-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          <?php foreach ($items as $item): ?>
            <tr>
              <td class="py-4 px-3">
                <div class="flex items-center gap-3">
                  <?php if (!empty($item['product_image_snapshot'])): ?>
                    <img src="<?= htmlspecialchars($item['product_image_snapshot'], ENT_QUOTES, 'UTF-8') ?>"
                         alt="<?= htmlspecialchars($item['product_name_snapshot'], ENT_QUOTES, 'UTF-8') ?>"
                         class="w-12 h-14 object-cover border border-white/10 bg-[#18181B]" />
                  <?php endif; ?>
                  <span class="font-semibold text-[#F5F5F0]"><?= htmlspecialchars($item['product_name_snapshot'], ENT_QUOTES, 'UTF-8') ?></span>
                </div>
              </td>
              <td class="py-4 px-3 text-xs"><?= htmlspecialchars((string)$item['selected_color'], ENT_QUOTES, 'UTF-8') ?></td>
              <td class="py-4 px-3 text-xs font-mono-num"><?= htmlspecialchars((string)$item['selected_size'], ENT_QUOTES, 'UTF-8') ?></td>
              <td class="py-4 px-3 font-mono-num"><?= (int)$item['quantity'] ?></td>
              <td class="py-4 px-3 font-mono-num">Rs. <?= number_format((float)$item['unit_price']) ?></td>
              <td class="py-4 px-3 font-mono-num font-bold text-[#D4AF37] text-right">Rs. <?= number_format((float)$item['subtotal']) ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>

    <div class="pt-4 border-t border-white/10 flex justify-end">
      <div class="text-right">
        <p class="text-xs uppercase tracking-wider text-[#A1A1AA]">Final Order Total</p>
        <p class="font-mono-num text-2xl font-bold text-[#D4AF37] mt-1">Rs. <?= number_format((float)$order['total_amount']) ?></p>
      </div>
    </div>
  </div>
</div>
<?php renderAdminFooter(); ?>
