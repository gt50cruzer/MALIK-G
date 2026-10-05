<?php
/**
 * MALIK G COLLECTION — ADMIN PANEL SHARED LAYOUT & NAVIGATION HELPERS
 * Upload to: /public_html/admin/includes/layout.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../../api/bootstrap.php';

// Enforce strict session authentication for all PHP admin pages except login.php
if (basename($_SERVER['PHP_SELF']) !== 'login.php') {
    if (!isAdminAuthenticated()) {
        header('Location: /admin/login.php');
        exit;
    }
}

$adminEmail = $_SESSION['admin_email'] ?? 'Owner';
$csrfToken = ensureCsrfToken();

function renderAdminHeader(string $pageTitle, string $activeNav = 'dashboard'): void
{
    global $adminEmail, $csrfToken;
    $navItems = [
        'dashboard'       => ['label' => 'Dashboard', 'href' => '/admin/index.php'],
        'orders'          => ['label' => 'Orders', 'href' => '/admin/orders.php'],
        'products'        => ['label' => 'Products', 'href' => '/admin/products.php'],
        'product-add'     => ['label' => 'Add Product', 'href' => '/admin/product-add.php'],
        'categories'      => ['label' => 'Categories', 'href' => '/admin/categories.php'],
        'customers'       => ['label' => 'Customers / Order Customers', 'href' => '/admin/orders.php#customers'],
        'sales'           => ['label' => 'Sales', 'href' => '/admin/index.php#sales'],
        'change-password' => ['label' => 'Change Password', 'href' => '/admin/change-password.php'],
    ];
    ?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?> | Malik G Collection</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=JetBrains+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0B0B0C; color: #F5F5F0; }
    .font-display { font-family: 'Cormorant Garamond', Georgia, serif; }
    .font-mono-num { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-screen flex flex-col lg:flex-row bg-[#0B0B0C] text-[#F5F5F0]">
  <aside class="w-full lg:w-64 bg-[#121214] border-b lg:border-b-0 lg:border-r border-white/10 shrink-0 flex flex-col justify-between">
    <div>
      <div class="p-6 border-b border-white/10">
        <a href="/admin/index.php" class="block font-display text-xl font-bold tracking-[0.12em] text-[#D4AF37]">
          MALIK G COLLECTION
        </a>
        <p class="text-[11px] text-[#A1A1AA] truncate mt-1"><?= htmlspecialchars($adminEmail, ENT_QUOTES, 'UTF-8') ?></p>
      </div>
      <nav class="p-3 space-y-1 flex lg:flex-col overflow-x-auto">
        <?php foreach ($navItems as $key => $item): ?>
          <a href="<?= $item['href'] ?>"
             class="flex items-center gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors <?= $activeNav === $key ? 'bg-[#D4AF37] text-[#0B0B0C]' : 'text-[#A1A1AA] hover:text-[#F5F5F0] hover:bg-white/5' ?>">
            <?= htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8') ?>
          </a>
        <?php endforeach; ?>
      </nav>
    </div>
    <div class="p-4 border-t border-white/10 space-y-3 hidden lg:block">
      <div class="px-3 py-2 bg-[#18181B] border border-white/5">
        <p class="text-[10px] uppercase tracking-wider text-[#A1A1AA]">Signed in as Owner</p>
        <p class="text-xs font-medium text-[#F5F5F0] truncate mt-0.5"><?= htmlspecialchars($adminEmail, ENT_QUOTES, 'UTF-8') ?></p>
      </div>
      <div class="flex items-center gap-2">
        <a href="/" class="flex-1 text-center py-2.5 px-3 border border-white/15 hover:border-[#D4AF37] text-xs uppercase tracking-wider text-[#F5F5F0]">Storefront</a>
        <a href="/admin/logout.php" class="py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs uppercase tracking-wider text-red-300">Logout</a>
      </div>
    </div>
  </aside>
  <main class="flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto">
    <?php
}

function renderAdminFooter(): void
{
    ?>
  </main>
</body>
</html>
    <?php
}
