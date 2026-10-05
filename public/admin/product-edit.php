<?php
/**
 * MALIK G COLLECTION — EDIT PRODUCT PAGE
 * Route: /admin/product-edit.php?id=XX
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/layout.php';

$pdo = getDBConnection();
$id = (int)($_GET['id'] ?? $_POST['id'] ?? 0);

$stmt = $pdo->prepare('SELECT * FROM products WHERE id = ? LIMIT 1');
$stmt->execute([$id]);
$product = $stmt->fetch();

if (!$product) {
    header('Location: /admin/products.php');
    exit;
}

$categories = $pdo->query('SELECT * FROM categories ORDER BY name ASC')->fetchAll();

$cStmt = $pdo->prepare('SELECT color_name FROM product_colors WHERE product_id = ?');
$cStmt->execute([$id]);
$existingColors = implode(', ', array_column($cStmt->fetchAll(), 'color_name'));

$sStmt = $pdo->prepare('SELECT size_label FROM product_sizes WHERE product_id = ?');
$sStmt->execute([$id]);
$existingSizes = implode(', ', array_column($sStmt->fetchAll(), 'size_label'));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = sanitizeText($_POST['title'] ?? '');
    $description = sanitizeText($_POST['description'] ?? '');
    $categoryId = (int)($_POST['category_id'] ?? $product['category_id']);
    $originalPrice = (float)($_POST['original_price'] ?? $product['original_price']);
    $offerPriceRaw = trim((string)($_POST['offer_price'] ?? ''));
    $offerPrice = ($offerPriceRaw !== '' && (float)$offerPriceRaw > 0) ? (float)$offerPriceRaw : null;
    $colorsInput = trim((string)($_POST['colors'] ?? ''));
    $sizesInput = trim((string)($_POST['sizes'] ?? ''));
    $inStock = isset($_POST['in_stock']) ? 1 : 0;
    $isPublished = isset($_POST['is_published']) ? 1 : 0;
    $imagePath = $product['image'];

    if (!empty($_FILES['image_file']['tmp_name']) && $_FILES['image_file']['error'] === UPLOAD_ERR_OK) {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($_FILES['image_file']['tmp_name']);
        $allowedMimes = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (isset($allowedMimes[$mime])) {
            $ext = $allowedMimes[$mime];
            $filename = 'product_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
            $destDir = __DIR__ . '/../uploads/';
            if (move_uploaded_file($_FILES['image_file']['tmp_name'], $destDir . $filename)) {
                $imagePath = '/uploads/' . $filename;
            }
        }
    }

    $discountPercent = 0;
    if ($offerPrice !== null && $offerPrice < $originalPrice) {
        $discountPercent = (int)round((($originalPrice - $offerPrice) / $originalPrice) * 100);
    } else {
        $offerPrice = null;
    }

    $upd = $pdo->prepare('
        UPDATE products
        SET title = :title, short_description = :short, description = :desc, category_id = :cat,
            image = :img, original_price = :orig, offer_price = :offer, discount_percent = :disc,
            in_stock = :stock, is_published = :pub
        WHERE id = :id
    ');
    $upd->execute([
        ':title' => $title,
        ':short' => mb_substr($description, 0, 140),
        ':desc'  => $description,
        ':cat'   => $categoryId,
        ':img'   => $imagePath,
        ':orig'  => $originalPrice,
        ':offer' => $offerPrice,
        ':disc'  => $discountPercent,
        ':stock' => $inStock,
        ':pub'   => $isPublished,
        ':id'    => $id,
    ]);

    $pdo->prepare('DELETE FROM product_colors WHERE product_id = ?')->execute([$id]);
    $insC = $pdo->prepare('INSERT INTO product_colors (product_id, color_name, color_hex) VALUES (?, ?, "#18181B")');
    foreach (array_filter(array_map('trim', explode(',', $colorsInput))) as $cName) {
        $insC->execute([$id, $cName]);
    }

    $pdo->prepare('DELETE FROM product_sizes WHERE product_id = ?')->execute([$id]);
    $insS = $pdo->prepare('INSERT INTO product_sizes (product_id, size_label) VALUES (?, ?)');
    foreach (array_filter(array_map('trim', explode(',', $sizesInput))) as $sLabel) {
        $insS->execute([$id, $sLabel]);
    }

    header('Location: /admin/products.php');
    exit;
}

renderAdminHeader('Edit Product', 'products');
?>
<div class="max-w-3xl space-y-6">
  <div class="border-b border-white/10 pb-4">
    <a href="/admin/products.php" class="text-xs text-[#A1A1AA] hover:text-[#D4AF37] uppercase">&larr; Back to Products</a>
    <h1 class="font-display text-3xl font-bold text-[#F5F5F0] mt-1">Edit Product: <?= htmlspecialchars($product['title'], ENT_QUOTES, 'UTF-8') ?></h1>
  </div>

  <form method="POST" enctype="multipart/form-data" class="bg-[#121214] border border-white/10 p-6 sm:p-8 space-y-5">
    <input type="hidden" name="id" value="<?= (int)$product['id'] ?>" />
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div class="sm:col-span-2 space-y-1.5">
        <label class="block text-xs uppercase tracking-wider">Product Title *</label>
        <input type="text" name="title" required value="<?= htmlspecialchars($product['title'], ENT_QUOTES, 'UTF-8') ?>" class="w-full bg-[#18181B] border border-white/15 px-4 py-2.5 text-sm text-[#F5F5F0]" />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs uppercase tracking-wider">Category *</label>
        <select name="category_id" class="w-full bg-[#18181B] border border-white/15 px-4 py-2.5 text-sm text-[#F5F5F0]">
          <?php foreach ($categories as $cat): ?>
            <option value="<?= (int)$cat['id'] ?>" <?= (int)$product['category_id'] === (int)$cat['id'] ? 'selected' : '' ?>><?= htmlspecialchars($cat['name'], ENT_QUOTES, 'UTF-8') ?></option>
          <?php endforeach; ?>
        </select>
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs uppercase tracking-wider">Replace Image (Optional)</label>
        <input type="file" name="image_file" accept="image/jpeg,image/png,image/webp" class="w-full bg-[#18181B] border border-white/15 px-3 py-2 text-xs text-[#A1A1AA]" />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs uppercase tracking-wider">Original Price (Rs.) *</label>
        <input type="number" name="original_price" required value="<?= (float)$product['original_price'] ?>" class="w-full bg-[#18181B] border border-white/15 px-4 py-2.5 text-sm font-mono-num text-[#F5F5F0]" />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs uppercase tracking-wider">Offer Price (Rs.) — Blank for No Offer</label>
        <input type="number" name="offer_price" value="<?= $product['offer_price'] !== null ? (float)$product['offer_price'] : '' ?>" class="w-full bg-[#18181B] border border-white/15 px-4 py-2.5 text-sm font-mono-num text-[#D4AF37]" />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs uppercase tracking-wider">Available Colors (comma-separated)</label>
        <input type="text" name="colors" value="<?= htmlspecialchars($existingColors, ENT_QUOTES, 'UTF-8') ?>" class="w-full bg-[#18181B] border border-white/15 px-4 py-2.5 text-sm text-[#F5F5F0]" />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs uppercase tracking-wider">Available Sizes (comma-separated)</label>
        <input type="text" name="sizes" value="<?= htmlspecialchars($existingSizes, ENT_QUOTES, 'UTF-8') ?>" class="w-full bg-[#18181B] border border-white/15 px-4 py-2.5 text-sm text-[#F5F5F0]" />
      </div>

      <div class="sm:col-span-2 space-y-1.5">
        <label class="block text-xs uppercase tracking-wider">Product Description *</label>
        <textarea name="description" rows="4" required class="w-full bg-[#18181B] border border-white/15 p-4 text-sm text-[#F5F5F0]"><?= htmlspecialchars($product['description'], ENT_QUOTES, 'UTF-8') ?></textarea>
      </div>

      <div class="sm:col-span-2 flex items-center gap-6 pt-2">
        <label class="flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer">
          <input type="checkbox" name="in_stock" <?= (int)$product['in_stock'] === 1 ? 'checked' : '' ?> /> In Stock
        </label>
        <label class="flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer">
          <input type="checkbox" name="is_published" <?= (int)$product['is_published'] === 1 ? 'checked' : '' ?> /> Published
        </label>
      </div>
    </div>

    <button type="submit" class="px-8 py-3.5 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider">Update Product</button>
  </form>
</div>
<?php renderAdminFooter(); ?>
