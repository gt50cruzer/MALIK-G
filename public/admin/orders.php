<?php
/**
 * MALIK G COLLECTION — ADMIN ORDERS LIST
 * Route: /admin/orders.php
 * Shows compact summary: Order ID, Customer Name, Phone, Date, Total, Status, View Order.
 * Supports Search by Order ID, Customer Name, Phone, and Filter by Status.
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/layout.php';

$pdo = getDBConnection();

$actionMessage = '';
$actionMessageType = 'success';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['order_id'], $_POST['status'])) {
    $targetOrderId = trim((string)$_POST['order_id']);
    $newStatus = trim((string)$_POST['status']);
    $allowed = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if ($targetOrderId !== '' && in_array($newStatus, $allowed, true)) {
        $upd = $pdo->prepare('UPDATE orders SET status = :status, updated_at = NOW() WHERE order_id = :order_id');
        $upd->execute([':status' => $newStatus, ':order_id' => $targetOrderId]);
        $actionMessage = "Order {$targetOrderId} status updated to {$newStatus}.";
    } else {
        $actionMessage = 'Invalid order status update request.';
        $actionMessageType = 'error';
    }
}

$statusFilter = trim((string)($_GET['status'] ?? 'All'));
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
$orders = $stmt->fetchAll();

$statuses = ['All', 'Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

renderAdminHeader('Orders', 'orders');
?>
<div class="space-y-6">
  <div class="border-b border-white/10 pb-5 flex flex-wrap items-center justify-between gap-4">
    <div>
      <p class="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">Order Management</p>
      <h1 class="font-display text-3xl font-bold text-[#F5F5F0]">Customer Orders (<?= count($orders) ?>)</h1>
    </div>
    <a href="/admin/orders.php" class="px-4 py-2 bg-[#121214] border border-white/15 hover:border-[#D4AF37] text-xs uppercase tracking-wider text-[#F5F5F0]">Refresh</a>
  </div>

  <?php if ($actionMessage !== ''): ?>
    <div class="p-4 border text-xs <?= $actionMessageType === 'success' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-red-500/10 border-red-500/40 text-red-300' ?>">
      <?= htmlspecialchars($actionMessage, ENT_QUOTES, 'UTF-8') ?>
    </div>
  <?php endif; ?>

  <!-- Search & Status Filter Bar -->
  <form method="GET" action="/admin/orders.php" class="bg-[#121214] border border-white/10 p-4 grid grid-cols-1 sm:grid-cols-12 gap-4">
    <div class="sm:col-span-6">
      <input type="text" name="search" value="<?= htmlspecialchars($search, ENT_QUOTES, 'UTF-8') ?>"
             placeholder="Search by Order ID (e.g. MGC-418848), Customer Name, or Phone..."
             class="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-[#F5F5F0] focus:outline-none" />
    </div>
    <div class="sm:col-span-4">
      <select name="status" class="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-[#F5F5F0] focus:outline-none">
        <?php foreach ($statuses as $st): ?>
          <option value="<?= $st ?>" <?= $statusFilter === $st ? 'selected' : '' ?>>Status: <?= $st ?></option>
        <?php endforeach; ?>
      </select>
    </div>
    <div class="sm:col-span-2 flex gap-2">
      <button type="submit" class="flex-1 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider py-2.5 px-4">Filter</button>
    </div>
  </form>

  <!-- Compact Summary Table -->
  <div class="bg-[#121214] border border-white/10 overflow-x-auto">
    <table class="w-full text-left border-collapse text-sm">
      <thead>
        <tr class="border-b border-white/10 text-[11px] uppercase tracking-wider text-[#A1A1AA]">
          <th class="py-3.5 px-4">Order ID</th>
          <th class="py-3.5 px-4">Customer Name</th>
          <th class="py-3.5 px-4">Phone</th>
          <th class="py-3.5 px-4">Date</th>
          <th class="py-3.5 px-4">Total Amount</th>
          <th class="py-3.5 px-4">Order Method</th>
          <th class="py-3.5 px-4">Current Status</th>
          <th class="py-3.5 px-4 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-white/5">
        <?php if (empty($orders)): ?>
          <tr><td colspan="8" class="py-12 text-center text-xs text-[#A1A1AA]">No matching orders found.</td></tr>
        <?php else: ?>
          <?php foreach ($orders as $o): ?>
            <tr class="hover:bg-white/[0.02]">
              <td class="py-4 px-4 font-mono-num font-bold text-[#D4AF37]"><?= htmlspecialchars($o['order_id'], ENT_QUOTES, 'UTF-8') ?></td>
              <td class="py-4 px-4 font-medium text-[#F5F5F0]"><?= htmlspecialchars($o['customer_name'], ENT_QUOTES, 'UTF-8') ?></td>
              <td class="py-4 px-4 font-mono-num text-xs text-[#A1A1AA]"><?= htmlspecialchars($o['customer_phone'], ENT_QUOTES, 'UTF-8') ?></td>
              <td class="py-4 px-4 text-xs text-[#A1A1AA]"><?= htmlspecialchars((string)$o['created_at'], ENT_QUOTES, 'UTF-8') ?></td>
              <td class="py-4 px-4 font-mono-num font-semibold text-[#F5F5F0]">Rs. <?= number_format((float)$o['total_amount']) ?></td>
              <td class="py-4 px-4 text-xs text-[#A1A1AA]">WhatsApp Order</td>
              <td class="py-4 px-4 text-xs font-semibold text-[#D4AF37]"><?= htmlspecialchars($o['status'], ENT_QUOTES, 'UTF-8') ?></td>
              <td class="py-4 px-4 text-right">
                <div class="inline-flex flex-wrap items-center justify-end gap-2">
                  <a href="/admin/order-view.php?order_id=<?= urlencode($o['order_id']) ?>"
                     class="inline-block px-3 py-1.5 bg-[#D4AF37] hover:bg-[#e3be42] text-[#0B0B0C] text-[11px] font-bold uppercase tracking-wider">
                    VIEW ORDER
                  </a>
                  <?php if ($o['status'] === 'Pending'): ?>
                    <form method="POST" action="/admin/orders.php" class="inline">
                      <input type="hidden" name="order_id" value="<?= htmlspecialchars($o['order_id'], ENT_QUOTES, 'UTF-8') ?>" />
                      <input type="hidden" name="status" value="Confirmed" />
                      <button type="submit" class="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-bold uppercase tracking-wider">
                        CONFIRM ORDER
                      </button>
                    </form>
                    <form method="POST" action="/admin/orders.php" class="inline" onsubmit="return confirm('Are you sure you want to reject and cancel order <?= htmlspecialchars($o['order_id'], ENT_QUOTES, 'UTF-8') ?>?');">
                      <input type="hidden" name="order_id" value="<?= htmlspecialchars($o['order_id'], ENT_QUOTES, 'UTF-8') ?>" />
                      <input type="hidden" name="status" value="Cancelled" />
                      <button type="submit" class="px-3 py-1.5 bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 text-[11px] font-bold uppercase tracking-wider">
                        REJECT ORDER
                      </button>
                    </form>
                  <?php endif; ?>
                </div>
              </td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>
<?php renderAdminFooter(); ?>
