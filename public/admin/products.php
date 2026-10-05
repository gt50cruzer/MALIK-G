<?php
/**
 * MALIK G COLLECTION — ADMIN PRODUCTS LIST
 * Route: /admin/products.php
 * Allows Owner to view, search, publish/unpublish, toggle stock, edit, or delete products.
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/layout.php';

$pdo = getDBConnection();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $pid = (int)($_POST['product_id'] ?? 0);

    if ($action === 'delete' && $pid > 0) {
        $stmt = $pdo->prepare('DELETE FROM products WHERE id = ?');
        $stmt->execute([$pid]);
    } elseif ($action === 'toggle_publish' && $pid > 0) {
        $stmt = $pdo->prepare('UPDATE products SET is_published = NOT is_published WHERE id = ?');
        $stmt->execute([$pid]);
    } elseif ($action === 'toggle_stock' && $pid > 0) {
        $stmt = $pdo->prepare('UPDATE products SET in_stock = NOT in_stock WHERE id = ?');
        $stmt->execute([$pid]);
    }
    header('Location: /admin/products.php');
    exit;
}

$stmt = $pdo->query("
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ORDER BY p.id DESC
");
$products = $stmt->fetchAll();

renderAdminHeader('Products', 'products');
?>
<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
    <div>
      <p class="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">Catalog &amp; Inventory</p>
      <h1 class="font-display text-3xl font-bold text-[#F5F5F0]">Products (<?= count($products) ?>)</h1>
    </div>
    <a href="/admin/product-add.php" class="px-5 py-3 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider">+ Add New Product</a>
  </div>

  <div class="bg-[#121214] border border-white/10 overflow-x-auto">
    <table class="w-full text-left border-collapse text-sm">
      <thead>
        <tr class="border-b border-white/10 text-[11px] uppercase tracking-wider text-[#A1A1AA]">
          <th class="py-3.5 px-4">Product</th>
          <th class="py-3.5 px-4">Category</th>
          <th class="py-3.5 px-4">Original Price</th>
          <th class="py-3.5 px-4">Offer Price</th>
          <th class="py-3.5 px-4">Discount</th>
          <th class="py-3.5 px-4">Stock</th>
          <th class="py-3.5 px-4">Published</th>
          <th class="py-3.5 px-4 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-white/5">
        <?php foreach ($products as $p): ?>
          <tr class="hover:bg-white/[0.02]">
            <td class="py-3.5 px-4">
              <div class="flex items-center gap-3">
                <img src="<?= htmlspecialchars($p['image'], ENT_QUOTES, 'UTF-8') ?>" alt="" class="w-11 h-13 object-cover bg-[#18181B] border border-white/10" />
                <div>
                  <p class="font-semibold text-[#F5F5F0]"><?= htmlspecialchars($p['title'], ENT_QUOTES, 'UTF-8') ?></p>
                  <p class="text-[11px] font-mono-num text-[#A1A1AA]"><?= htmlspecialchars($p['product_code'], ENT_QUOTES, 'UTF-8') ?></p>
                </div>
              </div>
            </td>
            <td class="py-3.5 px-4 text-xs"><?= htmlspecialchars((string)$p['category_name'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="py-3.5 px-4 font-mono-num text-xs text-[#A1A1AA]">Rs. <?= number_format((float)$p['original_price']) ?></td>
            <td class="py-3.5 px-4 font-mono-num font-bold text-[#D4AF37]">
              <?= $p['offer_price'] !== null ? 'Rs. ' . number_format((float)$p['offer_price']) : 'No Offer' ?>
            </td>
            <td class="py-3.5 px-4 font-mono-num text-xs"><?= (int)$p['discount_percent'] ?>% OFF</td>
            <td class="py-3.5 px-4">
              <form method="POST" action="/admin/products.php" class="inline">
                <input type="hidden" name="action" value="toggle_stock" />
                <input type="hidden" name="product_id" value="<?= (int)$p['id'] ?>" />
                <button type="submit" class="px-2.5 py-1 text-[11px] font-semibold uppercase <?= (int)$p['in_stock'] === 1 ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/15 text-red-300 border border-red-500/30' ?>">
                  <?= (int)$p['in_stock'] === 1 ? 'In Stock' : 'Out of Stock' ?>
                </button>
              </form>
            </td>
            <td class="py-3.5 px-4">
              <form method="POST" action="/admin/products.php" class="inline">
                <input type="hidden" name="action" value="toggle_publish" />
                <input type="hidden" name="product_id" value="<?= (int)$p['id'] ?>" />
                <button type="submit" class="px-2.5 py-1 text-[11px] font-semibold uppercase <?= (int)$p['is_published'] === 1 ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40' : 'bg-white/5 text-[#A1A1AA] border border-white/10' ?>">
                  <?= (int)$p['is_published'] === 1 ? 'Published' : 'Unpublished' ?>
                </button>
              </form>
            </td>
            <td class="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
              <a href="/admin/product-edit.php?id=<?= (int)$p['id'] ?>" class="inline-block px-3 py-1.5 border border-white/20 hover:border-[#D4AF37] text-xs uppercase">Edit</a>
              <form method="POST" action="/admin/products.php" class="inline" onsubmit="return confirm('Delete this product?');">
                <input type="hidden" name="action" value="delete" />
                <input type="hidden" name="product_id" value="<?= (int)$p['id'] ?>" />
                <button type="submit" class="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-300 text-xs uppercase">Delete</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
<?php renderAdminFooter(); ?>
