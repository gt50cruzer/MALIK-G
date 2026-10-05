<?php
/**
 * MALIK G COLLECTION — ADD NEW PRODUCT PAGE
 * Route: /admin/product-add.php
 * Supports image upload, Original Price, Offer Price / Discount (No Offer, 20% OFF, or Custom), Colors, Sizes, Stock, and Publish status.
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/layout.php';

$pdo = getDBConnection();
$categories = $pdo->query('SELECT * FROM categories ORDER BY name ASC')->fetchAll();
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = sanitizeText($_POST['title'] ?? '');
    $description = sanitizeText($_POST['description'] ?? '');
    $categoryId = (int)($_POST['category_id'] ?? 1);
    $originalPrice = (float)($_POST['original_price'] ?? 0);
    $offerPriceRaw = trim((string)($_POST['offer_price'] ?? ''));
    $offerPrice = ($offerPriceRaw !== '' && (float)$offerPriceRaw > 0) ? (float)$offerPriceRaw : null;
    $colorsInput = trim((string)($_POST['colors'] ?? 'Black, White, Navy'));
    $sizesInput = trim((string)($_POST['sizes'] ?? 'S, M, L, XL'));
    $inStock = isset($_POST['in_stock']) ? 1 : 0;
    $isPublished = isset($_POST['is_published']) ? 1 : 0;
    $imagePath = trim((string)($_POST['image_url'] ?? '/uploads/category_shirts.jpg'));

    // Handle uploaded image file if provided
    if (!empty($_FILES['image_file']['tmp_name']) && $_FILES['image_file']['error'] === UPLOAD_ERR_OK) {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($_FILES['image_file']['tmp_name']);
        $allowedMimes = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (isset($allowedMimes[$mime])) {
            $ext = $allowedMimes[$mime];
            $filename = 'product_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
            $destDir = __DIR__ . '/../uploads/';
            if (!is_dir($destDir)) {
                mkdir($destDir, 0755, true);
            }
            if (move_uploaded_file($_FILES['image_file']['tmp_name'], $destDir . $filename)) {
                $imagePath = '/uploads/' . $filename;
            }
        }
    }

    if ($title === '' || $description === '' || $originalPrice <= 0) {
        $error = 'Product Title, Description, and a valid Original Price are required.';
    } else {
        $discountPercent = 0;
        if ($offerPrice !== null && $offerPrice < $originalPrice) {
            $discountPercent = (int)round((($originalPrice - $offerPrice) / $originalPrice) * 100);
        } else {
            $offerPrice = null;
        }

        $productCode = 'mg-prod-' . time() . '-' . random_int(100, 999);
        $sku = 'MGC-' . random_int(1000, 9999);

        $stmt = $pdo->prepare('
            INSERT INTO products (product_code, sku, title, short_description, description, category_id, image, original_price, offer_price, discount_percent, in_stock, is_published)
            VALUES (:code, :sku, :title, :short, :desc, :cat, :img, :orig, :offer, :disc, :stock, :pub)
        ');
        $stmt->execute([
            ':code'  => $productCode,
            ':sku'   => $sku,
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
        ]);
        $newId = (int)$pdo->lastInsertId();

        $cStmt = $pdo->prepare('INSERT INTO product_colors (product_id, color_name, color_hex) VALUES (?, ?, "#18181B")');
        foreach (array_filter(array_map('trim', explode(',', $colorsInput))) as $cName) {
            $cStmt->execute([$newId, $cName]);
        }

        $sStmt = $pdo->prepare('INSERT INTO product_sizes (product_id, size_label) VALUES (?, ?)');
        foreach (array_filter(array_map('trim', explode(',', $sizesInput))) as $sLabel) {
            $sStmt->execute([$newId, $sLabel]);
        }

        header('Location: /admin/products.php');
        exit;
    }
}

renderAdminHeader('Add Product', 'product-add');
?>
<div class="max-w-3xl space-y-6">
  <div class="border-b border-white/10 pb-4">
    <p class="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">Product Management</p>
    <h1 class="font-display text-3xl font-bold text-[#F5F5F0]">Add New Product</h1>
  </div>

  <?php if ($error !== ''): ?>
    <div class="p-4 bg-red-500/10 border border-red-500/40 text-xs text-red-300"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
  <?php endif; ?>

  <form method="POST" enctype="multipart/form-data" class="bg-[#121214] border border-white/10 p-6 sm:p-8 space-y-5">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div class="sm:col-span-2 space-y-1.5">
        <label class="block text-xs uppercase tracking-wider">Product Title *</label>
        <input type="text" name="title" required class="w-full bg-[#18181B] border border-white/15 px-4 py-2.5 text-sm text-[#F5F5F0]" />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs uppercase tracking-wider">Category *</label>
        <select name="category_id" class="w-full bg-[#18181B] border border-white/15 px-4 py-2.5 text-sm text-[#F5F5F0]">
          <?php foreach ($categories as $cat): ?>
            <option value="<?= (int)$cat['id'] ?>"><?= htmlspecialchars($cat['name'], ENT_QUOTES, 'UTF-8') ?></option>
          <?php endforeach; ?>
        </select>
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs uppercase tracking-wider">Upload Product Image</label>
        <input type="file" name="image_file" accept="image/jpeg,image/png,image/webp" class="w-full bg-[#18181B] border border-white/15 px-3 py-2 text-xs text-[#A1A1AA]" />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs uppercase tracking-wider">Original Price (Rs.) *</label>
        <input type="number" id="orig_price" name="original_price" value="3000" required oninput="if(document.getElementById('auto20').checked){document.getElementById('offer_price').value = Math.round(this.value * 0.8);}" class="w-full bg-[#18181B] border border-white/15 px-4 py-2.5 text-sm font-mono-num text-[#F5F5F0]" />
      </div>

      <div class="space-y-1.5">
        <div class="flex items-center justify-between">
          <label class="block text-xs uppercase tracking-wider">Offer Price (Rs.) — Leave blank for No Offer</label>
          <label class="text-[11px] text-[#D4AF37] flex items-center gap-1 cursor-pointer">
            <input type="checkbox" id="auto20" checked onchange="if(this.checked){document.getElementById('offer_price').value = Math.round(document.getElementById('orig_price').value * 0.8);}else{document.getElementById('offer_price').value='';}" />
            20% Off
          </label>
        </div>
        <input type="number" id="offer_price" name="offer_price" value="2400" class="w-full bg-[#18181B] border border-white/15 px-4 py-2.5 text-sm font-mono-num text-[#D4AF37]" />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs uppercase tracking-wider">Available Colors (comma-separated)</label>
        <input type="text" name="colors" value="Black, White, Navy Blue" class="w-full bg-[#18181B] border border-white/15 px-4 py-2.5 text-sm text-[#F5F5F0]" />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs uppercase tracking-wider">Available Sizes (comma-separated, leave blank if N/A)</label>
        <input type="text" name="sizes" value="S, M, L, XL, XXL" class="w-full bg-[#18181B] border border-white/15 px-4 py-2.5 text-sm text-[#F5F5F0]" />
      </div>

      <div class="sm:col-span-2 space-y-1.5">
        <label class="block text-xs uppercase tracking-wider">Product Description *</label>
        <textarea name="description" rows="4" required class="w-full bg-[#18181B] border border-white/15 p-4 text-sm text-[#F5F5F0]"></textarea>
      </div>

      <div class="sm:col-span-2 flex items-center gap-6 pt-2">
        <label class="flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer">
          <input type="checkbox" name="in_stock" checked /> In Stock
        </label>
        <label class="flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer">
          <input type="checkbox" name="is_published" checked /> Publish Immediately
        </label>
      </div>
    </div>

    <button type="submit" class="px-8 py-3.5 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider">Save &amp; Publish Product</button>
  </form>
</div>
<?php renderAdminFooter(); ?>
