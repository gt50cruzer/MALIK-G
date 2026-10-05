<?php
/**
 * MALIK G COLLECTION — ADMIN CATEGORIES MANAGEMENT
 * Route: /admin/categories.php
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/layout.php';

$pdo = getDBConnection();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['name'])) {
    $name = sanitizeText($_POST['name']);
    $subtitle = sanitizeText($_POST['subtitle'] ?? 'Curated collection at Malik G Collection');
    $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $name));
    $stmt = $pdo->prepare('INSERT IGNORE INTO categories (name, slug, subtitle) VALUES (?, ?, ?)');
    $stmt->execute([$name, $slug, $subtitle]);
    header('Location: /admin/categories.php');
    exit;
}

$categories = $pdo->query('SELECT * FROM categories ORDER BY id ASC')->fetchAll();

renderAdminHeader('Categories', 'categories');
?>
<div class="max-w-4xl space-y-6">
  <div class="border-b border-white/10 pb-4">
    <p class="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">Store Taxonomy</p>
    <h1 class="font-display text-3xl font-bold text-[#F5F5F0]">Categories</h1>
  </div>

  <form method="POST" class="bg-[#121214] border border-white/10 p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
    <input type="text" name="name" required placeholder="Category Name (e.g. Waistcoats)" class="bg-[#18181B] border border-white/15 px-4 py-2.5 text-sm text-[#F5F5F0]" />
    <input type="text" name="subtitle" placeholder="Tagline / Subtitle" class="bg-[#18181B] border border-white/15 px-4 py-2.5 text-sm text-[#F5F5F0]" />
    <button type="submit" class="bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider py-2.5 px-4">+ Add Category</button>
  </form>

  <div class="bg-[#121214] border border-white/10 divide-y divide-white/5">
    <?php foreach ($categories as $c): ?>
      <div class="p-4 flex items-center justify-between">
        <div>
          <p class="font-semibold text-[#F5F5F0]"><?= htmlspecialchars($c['name'], ENT_QUOTES, 'UTF-8') ?></p>
          <p class="text-xs text-[#A1A1AA]"><?= htmlspecialchars((string)$c['subtitle'], ENT_QUOTES, 'UTF-8') ?></p>
        </div>
        <span class="text-xs font-mono-num text-[#D4AF37]">/<?= htmlspecialchars($c['slug'], ENT_QUOTES, 'UTF-8') ?></span>
      </div>
    <?php endforeach; ?>
  </div>
</div>
<?php renderAdminFooter(); ?>
