<?php
/**
 * MALIK G COLLECTION — OWNER ADMIN DASHBOARD
 * Route: /admin/index.php
 * Displays real-time MySQL sales, order status counts, product counts, and recent orders.
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/layout.php';

$pdo = getDBConnection();

$statusSummaryStmt = $pdo->query("
    SELECT
        COUNT(*) AS total_orders,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_orders,
        SUM(CASE WHEN status = 'Confirmed' THEN 1 ELSE 0 END) AS confirmed_orders,
        SUM(CASE WHEN status = 'Processing' THEN 1 ELSE 0 END) AS processing_orders,
        SUM(CASE WHEN status = 'Shipped' THEN 1 ELSE 0 END) AS shipped_orders,
        SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) AS delivered_orders,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,
        COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN total_amount ELSE 0 END), 0) AS total_revenue
    FROM orders
");
$summary = $statusSummaryStmt->fetch() ?: [];

$prodStmt = $pdo->query("
    SELECT
        COUNT(*) AS total_products,
        SUM(CASE WHEN in_stock = 0 THEN 1 ELSE 0 END) AS out_of_stock_products
    FROM products
");
$prodSummary = $prodStmt->fetch() ?: [];

$todayStmt = $pdo->query("SELECT COUNT(*) AS cnt, COALESCE(SUM(total_amount),0) AS rev FROM orders WHERE status != 'Cancelled' AND DATE(created_at) = CURDATE()");
$today = $todayStmt->fetch();

$weekStmt = $pdo->query("SELECT COUNT(*) AS cnt, COALESCE(SUM(total_amount),0) AS rev FROM orders WHERE status != 'Cancelled' AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)");
$week = $weekStmt->fetch();

$monthStmt = $pdo->query("SELECT COUNT(*) AS cnt, COALESCE(SUM(total_amount),0) AS rev FROM orders WHERE status != 'Cancelled' AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())");
$month = $monthStmt->fetch();

$recentStmt = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 8");
$recentOrders = $recentStmt->fetchAll();

renderAdminHeader('Dashboard', 'dashboard');
?>
<div class="space-y-8">
  <div class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
    <div>
      <p class="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">Real-Time MySQL Overview</p>
      <h1 class="font-display text-3xl sm:text-4xl font-bold text-[#F5F5F0]">Owner Sales &amp; Store Dashboard</h1>
    </div>
    <div class="flex items-center gap-3">
      <a href="/admin/product-add.php" class="px-5 py-2.5 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider">+ Add Product</a>
      <a href="/admin/orders.php" class="px-5 py-2.5 border border-white/20 text-[#F5F5F0] hover:border-[#D4AF37] text-xs font-semibold uppercase tracking-wider">Manage Orders</a>
    </div>
  </div>

  <!-- Period Revenue Breakdown -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="bg-[#121214] border border-white/10 p-5">
      <p class="text-xs uppercase tracking-wider text-[#A1A1AA]">Today's Sales</p>
      <p class="font-mono-num text-2xl font-bold text-[#D4AF37] mt-2">Rs. <?= number_format((float)$today['rev']) ?></p>
      <p class="text-xs text-[#A1A1AA] mt-1"><?= (int)$today['cnt'] ?> orders today</p>
    </div>
    <div class="bg-[#121214] border border-white/10 p-5">
      <p class="text-xs uppercase tracking-wider text-[#A1A1AA]">This Week</p>
      <p class="font-mono-num text-2xl font-bold text-[#F5F5F0] mt-2">Rs. <?= number_format((float)$week['rev']) ?></p>
      <p class="text-xs text-[#A1A1AA] mt-1"><?= (int)$week['cnt'] ?> orders this week</p>
    </div>
    <div class="bg-[#121214] border border-white/10 p-5">
      <p class="text-xs uppercase tracking-wider text-[#A1A1AA]">This Month</p>
      <p class="font-mono-num text-2xl font-bold text-[#F5F5F0] mt-2">Rs. <?= number_format((float)$month['rev']) ?></p>
      <p class="text-xs text-[#A1A1AA] mt-1"><?= (int)$month['cnt'] ?> orders this month</p>
    </div>
    <div class="bg-[#121214] border border-[#D4AF37]/40 p-5">
      <p class="text-xs uppercase tracking-wider text-[#D4AF37]">All-Time Revenue</p>
      <p class="font-mono-num text-2xl font-bold text-[#D4AF37] mt-2">Rs. <?= number_format((float)($summary['total_revenue'] ?? 0)) ?></p>
      <p class="text-xs text-[#A1A1AA] mt-1"><?= (int)($summary['total_orders'] ?? 0) ?> total orders</p>
    </div>
  </div>

  <!-- Order Status & Inventory KPIs -->
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
    <div class="bg-[#121214] border border-white/10 p-4">
      <p class="text-[11px] uppercase tracking-wider text-[#A1A1AA]">Total Orders</p>
      <p class="font-mono-num text-xl font-bold text-[#F5F5F0] mt-1"><?= (int)($summary['total_orders'] ?? 0) ?></p>
    </div>
    <div class="bg-[#121214] border border-amber-500/30 p-4">
      <p class="text-[11px] uppercase tracking-wider text-amber-300">Pending Orders</p>
      <p class="font-mono-num text-xl font-bold text-amber-300 mt-1"><?= (int)($summary['pending_orders'] ?? 0) ?></p>
    </div>
    <div class="bg-[#121214] border border-blue-500/30 p-4">
      <p class="text-[11px] uppercase tracking-wider text-blue-300">Confirmed</p>
      <p class="font-mono-num text-xl font-bold text-blue-300 mt-1"><?= (int)($summary['confirmed_orders'] ?? 0) ?></p>
    </div>
    <div class="bg-[#121214] border border-purple-500/30 p-4">
      <p class="text-[11px] uppercase tracking-wider text-purple-300">Processing</p>
      <p class="font-mono-num text-xl font-bold text-purple-300 mt-1"><?= (int)($summary['processing_orders'] ?? 0) ?></p>
    </div>
    <div class="bg-[#121214] border border-cyan-500/30 p-4">
      <p class="text-[11px] uppercase tracking-wider text-cyan-300">Shipped</p>
      <p class="font-mono-num text-xl font-bold text-cyan-300 mt-1"><?= (int)($summary['shipped_orders'] ?? 0) ?></p>
    </div>
    <div class="bg-[#121214] border border-emerald-500/30 p-4">
      <p class="text-[11px] uppercase tracking-wider text-emerald-300">Delivered</p>
      <p class="font-mono-num text-xl font-bold text-emerald-300 mt-1"><?= (int)($summary['delivered_orders'] ?? 0) ?></p>
    </div>
    <div class="bg-[#121214] border border-red-500/30 p-4">
      <p class="text-[11px] uppercase tracking-wider text-red-300">Cancelled</p>
      <p class="font-mono-num text-xl font-bold text-red-300 mt-1"><?= (int)($summary['cancelled_orders'] ?? 0) ?></p>
    </div>
    <div class="bg-[#121214] border border-white/10 p-4">
      <p class="text-[11px] uppercase tracking-wider text-[#A1A1AA]">Total Products</p>
      <p class="font-mono-num text-xl font-bold text-[#F5F5F0] mt-1"><?= (int)($prodSummary['total_products'] ?? 0) ?></p>
    </div>
    <div class="bg-[#121214] border border-red-500/30 p-4">
      <p class="text-[11px] uppercase tracking-wider text-red-300">Out of Stock</p>
      <p class="font-mono-num text-xl font-bold text-red-300 mt-1"><?= (int)($prodSummary['out_of_stock_products'] ?? 0) ?></p>
    </div>
  </div>

  <!-- Recent Orders Table -->
  <div class="bg-[#121214] border border-white/10 p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="font-display text-2xl font-bold text-[#F5F5F0]">Recent Customer Orders</h2>
      <a href="/admin/orders.php" class="text-xs text-[#D4AF37] uppercase tracking-wider hover:underline">View All Orders &rarr;</a>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="border-b border-white/10 text-[11px] uppercase tracking-wider text-[#A1A1AA]">
            <th class="py-3 px-3">Order ID</th>
            <th class="py-3 px-3">Customer Name</th>
            <th class="py-3 px-3">Phone</th>
            <th class="py-3 px-3">Date</th>
            <th class="py-3 px-3">Total</th>
            <th class="py-3 px-3">Status</th>
            <th class="py-3 px-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          <?php if (empty($recentOrders)): ?>
            <tr><td colspan="7" class="py-8 text-center text-xs text-[#A1A1AA]">No customer orders recorded yet.</td></tr>
          <?php else: ?>
            <?php foreach ($recentOrders as $ord): ?>
              <tr class="hover:bg-white/[0.02]">
                <td class="py-3.5 px-3 font-mono-num font-bold text-[#D4AF37]"><?= htmlspecialchars($ord['order_id'], ENT_QUOTES, 'UTF-8') ?></td>
                <td class="py-3.5 px-3"><?= htmlspecialchars($ord['customer_name'], ENT_QUOTES, 'UTF-8') ?></td>
                <td class="py-3.5 px-3 font-mono-num text-xs"><?= htmlspecialchars($ord['customer_phone'], ENT_QUOTES, 'UTF-8') ?></td>
                <td class="py-3.5 px-3 text-xs text-[#A1A1AA]"><?= htmlspecialchars((string)$ord['created_at'], ENT_QUOTES, 'UTF-8') ?></td>
                <td class="py-3.5 px-3 font-mono-num font-semibold">Rs. <?= number_format((float)$ord['total_amount']) ?></td>
                <td class="py-3.5 px-3 text-xs font-semibold"><?= htmlspecialchars($ord['status'], ENT_QUOTES, 'UTF-8') ?></td>
                <td class="py-3.5 px-3 text-right">
                  <a href="/admin/order-view.php?order_id=<?= urlencode($ord['order_id']) ?>"
                     class="inline-block px-3 py-1.5 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider">
                    VIEW ORDER
                  </a>
                </td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>
<?php renderAdminFooter(); ?>
