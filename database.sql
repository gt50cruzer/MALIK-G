-- ============================================================================
-- MALIK G COLLECTION — PRODUCTION MYSQL DATABASE SCHEMA & SEED DATA
-- Target: Hostinger Shared Hosting (MySQL 8.0 / MariaDB 10.6+)
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. TABLE: admins
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_admin_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 1B. TABLE: customers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(32) NOT NULL DEFAULT 'customer',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_customer_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. TABLE: categories
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `subtitle` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_category_name` (`name`),
  UNIQUE KEY `uniq_category_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. TABLE: products
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_code` VARCHAR(64) NOT NULL,
  `sku` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `short_description` VARCHAR(500) DEFAULT NULL,
  `description` TEXT NOT NULL,
  `category_id` INT UNSIGNED NOT NULL,
  `image` VARCHAR(500) NOT NULL,
  `original_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `offer_price` DECIMAL(10,2) DEFAULT NULL,
  `discount_percent` INT UNSIGNED NOT NULL DEFAULT 0,
  `stock_status` ENUM('in_stock', 'out_of_stock') NOT NULL DEFAULT 'in_stock',
  `published` TINYINT(1) NOT NULL DEFAULT 1,
  `is_new_arrival` TINYINT(1) NOT NULL DEFAULT 0,
  `is_trending` TINYINT(1) NOT NULL DEFAULT 0,
  `fabric_or_material` VARCHAR(255) DEFAULT NULL,
  `rating` DECIMAL(3,1) NOT NULL DEFAULT 4.8,
  `reviews_count` INT UNSIGNED NOT NULL DEFAULT 25,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_product_code` (`product_code`),
  KEY `idx_products_category` (`category_id`),
  KEY `idx_products_published` (`published`),
  KEY `idx_products_stock` (`stock_status`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. TABLE: product_colors
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `product_colors` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` INT UNSIGNED NOT NULL,
  `color_name` VARCHAR(100) NOT NULL,
  `color_hex` VARCHAR(20) DEFAULT '#18181B',
  PRIMARY KEY (`id`),
  KEY `idx_product_colors_pid` (`product_id`),
  CONSTRAINT `fk_product_colors_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. TABLE: product_sizes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `product_sizes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` INT UNSIGNED NOT NULL,
  `size_name` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_product_sizes_pid` (`product_id`),
  CONSTRAINT `fk_product_sizes_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. TABLE: orders
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` VARCHAR(32) NOT NULL,
  `customer_name` VARCHAR(191) NOT NULL,
  `customer_phone` VARCHAR(64) NOT NULL,
  `customer_email` VARCHAR(191) NOT NULL,
  `customer_location` VARCHAR(191) NOT NULL,
  `customer_address` TEXT NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_orders_order_id` (`order_id`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_created_at` (`created_at`),
  KEY `idx_orders_customer_phone` (`customer_phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. TABLE: order_items (Immutable Historical Product Snapshots)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED DEFAULT NULL,
  `product_code_snapshot` VARCHAR(64) DEFAULT NULL,
  `product_name_snapshot` VARCHAR(255) NOT NULL,
  `product_image_snapshot` VARCHAR(500) NOT NULL,
  `selected_color` VARCHAR(100) DEFAULT NULL,
  `selected_size` VARCHAR(50) DEFAULT NULL,
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `original_price_snapshot` DECIMAL(10,2) NOT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id` (`order_id`),
  KEY `idx_order_items_product_id` (`product_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SEED DATA: CATEGORIES
-- ============================================================================
INSERT INTO `categories` (`id`, `name`, `slug`, `subtitle`) VALUES
(1, 'Shirts', 'shirts', 'Smart styles for every occasion'),
(2, 'Pants', 'pants', 'Comfort meets modern style'),
(3, 'Shoes', 'shoes', 'Step into premium style'),
(4, 'Watches', 'watches', 'Time made stylish'),
(5, 'Perfumes', 'perfumes', 'Make your presence unforgettable'),
(6, 'Accessories', 'accessories', 'Essential leather craftsmanship')
ON DUPLICATE KEY UPDATE `subtitle` = VALUES(`subtitle`);

-- ============================================================================
-- SEED DATA: INITIAL OWNER ADMIN ACCOUNT
-- Default Email: malikg@gmail.com
-- Note: Use Admin -> Settings -> Change Password to update your password
-- ============================================================================
INSERT INTO `admins` (`id`, `email`, `password_hash`) VALUES
(1, 'malikg@gmail.com', '$2y$10$8K1p/a0dL1LXMIgoEDFrwOfMQkF9N8rK9xT9H.wU1x5Z1x5Z1x5Z.')
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- ============================================================================
-- SEED DATA: 30 EXISTING MALIK G COLLECTION PRODUCTS (20% OFF ALL PRODUCTS)
-- Original Price = base price | Offer Price = ROUND(Original Price * 0.80)
-- ============================================================================
INSERT INTO `products` (`id`, `product_code`, `sku`, `title`, `short_description`, `description`, `category_id`, `image`, `original_price`, `offer_price`, `discount_percent`, `stock_status`, `published`, `is_new_arrival`, `is_trending`, `fabric_or_material`, `rating`, `reviews_count`) VALUES
(1, 'mg-shirt-01', 'MGC-SH-001', 'Premium Black Oxford Shirt', 'Tailored 100% combed cotton Oxford weave with structured collar and mother-of-pearl buttons.', 'Crafted for the modern Pakistani gentleman, the Premium Black Oxford Shirt pairs effortless versatility with structured tailoring. Woven from breathable long-staple cotton in a dense Oxford texture, it transitions seamlessly from corporate boardrooms in Sialkot to evening dinners.', 1, '/uploads/category_shirts.jpg', 2999.00, 2399.00, 20, 'in_stock', 1, 1, 1, '100% Combed Egyptian Cotton Oxford', 4.9, 64),
(2, 'mg-shirt-02', 'MGC-SH-002', 'Classic White Formal Shirt', 'Crisp wrinkle-resistant twill formal shirt with semi-spread collar and tailored cuffs.', 'An indispensable wardrobe cornerstone. Our Classic White Formal Shirt features a fine two-ply twill weave that resists creasing throughout the day while offering a smooth, luminous finish under suiting or worn solo.', 1, '/uploads/category_shirts.jpg', 2799.00, 2239.00, 20, 'in_stock', 1, 0, 1, 'Two-Ply Fine Cotton Twill', 4.8, 52),
(3, 'mg-shirt-03', 'MGC-SH-003', 'Navy Blue Casual Shirt', 'Soft-washed breathable poplin shirt in deep navy with a modern relaxed silhouette.', 'Designed for refined everyday wear, the Navy Blue Casual Shirt is garment-washed for immediate softness. Features tonal stitching, a chest pocket, and a curved hem that looks sharp tucked or untucked.', 1, '/uploads/category_shirts.jpg', 2499.00, 1999.00, 20, 'in_stock', 1, 1, 0, 'Garment-Washed Cotton Poplin', 4.7, 38),
(4, 'mg-shirt-04', 'MGC-SH-004', 'Premium Check Shirt', 'Yarn-dyed micro-check pattern with brushed cotton finish and button-down collar.', 'Featuring a sophisticated yarn-dyed check pattern, this shirt offers depth of color that never fades. Tailored with precision at the shoulders and chest for a clean, contemporary profile.', 1, '/uploads/category_shirts.jpg', 2699.00, 2159.00, 20, 'in_stock', 1, 0, 0, 'Yarn-Dyed Brushed Cotton', 4.8, 41),
(5, 'mg-shirt-05', 'MGC-SH-005', 'Olive Green Casual Shirt', 'Earth-toned breathable cotton-linen blend shirt built for all-season comfort.', 'Our Olive Green Casual Shirt brings understated military-inspired heritage into modern Pakistani streetwear. Pair it effortlessly with khaki chinos or dark blue denim.', 1, '/uploads/category_shirts.jpg', 2399.00, 1919.00, 20, 'in_stock', 1, 0, 0, '85% Cotton, 15% Linen Blend', 4.7, 29),
(6, 'mg-shirt-06', 'MGC-SH-006', 'Premium Denim Shirt', 'Mid-weight selvedge-inspired denim overshirt with antique brass snap hardware.', 'Built from durable 7oz ring-spun denim, the Premium Denim Shirt wears equally well as a standalone statement piece or layered open over a crisp tee. Develops unique character with every wear.', 1, '/uploads/category_shirts.jpg', 3199.00, 2559.00, 20, 'in_stock', 1, 1, 0, '7oz Ring-Spun Indigo Denim', 4.9, 47),
(7, 'mg-pant-07', 'MGC-PT-007', 'Classic Black Trousers', 'Sharp flat-front tailored formal trousers with comfort waistband and crease retention.', 'Engineered for all-day poise, our Classic Black Trousers feature a tailored taper from knee to ankle, reinforced hook-and-bar closure, and breathable pocket linings.', 2, '/uploads/category_pants.jpg', 2999.00, 2399.00, 20, 'in_stock', 1, 0, 1, '68% Polyester, 29% Viscose, 3% Elastane', 4.8, 58),
(8, 'mg-pant-08', 'MGC-PT-008', 'Slim Fit Navy Pants', 'Four-way stretch slim-tailored navy trousers for executive and smart-casual styling.', 'Combining bespoke sartorial lines with modern stretch recovery, the Slim Fit Navy Pants deliver a sharp silhouette without restricting movement. Pairs seamlessly with white or black Oxford shirts.', 2, '/uploads/category_pants.jpg', 3299.00, 2639.00, 20, 'in_stock', 1, 1, 0, 'Italian-Weave Stretch Gabardine', 4.9, 44),
(9, 'mg-pant-09', 'MGC-PT-009', 'Premium Khaki Chinos', 'Peached cotton stretch twill chinos with coin pocket and clean double-welt back pockets.', 'Our Premium Khaki Chinos are crafted from peached compact cotton twill with a hint of elastane. Soft to the touch yet structured enough for year-round rotation.', 2, '/uploads/category_pants.jpg', 2799.00, 2239.00, 20, 'in_stock', 1, 0, 0, '98% Compact Cotton Twill, 2% Elastane', 4.7, 39),
(10, 'mg-pant-10', 'MGC-PT-010', 'Dark Blue Denim Jeans', '12.5oz premium dark indigo stretch denim with subtle whiskering and chain-stitched hems.', 'Constructed from high-recovery Pakistani export-grade denim, these Dark Blue Denim Jeans offer a rich indigo cast, custom copper rivets, and a modern regular-slim cut.', 2, '/uploads/category_pants.jpg', 3499.00, 2799.00, 20, 'in_stock', 1, 0, 1, '12.5oz Export-Grade Stretch Denim', 4.9, 71),
(11, 'mg-pant-11', 'MGC-PT-011', 'Black Stretch Jeans', 'Fade-resistant reactive-dyed black denim with superior flex and matte black hardware.', 'Designed to stay pitch-black wash after wash, our Black Stretch Jeans combine urban edge with supreme comfort. Features tonal black topstitching and matte gunmetal hardware.', 2, '/uploads/category_pants.jpg', 3299.00, 2639.00, 20, 'in_stock', 1, 0, 0, 'Reactive-Dyed Flex Denim', 4.8, 49),
(12, 'mg-pant-12', 'MGC-PT-012', 'Light Grey Formal Trousers', 'Refined sharkskin-weave light grey dress trousers ideal for daytime events and office wear.', 'Tailored in a sophisticated melange grey tone, these trousers pair effortlessly with dark blazers, navy shirts, and brown leather footwear.', 2, '/uploads/category_pants.jpg', 2899.00, 2319.00, 20, 'in_stock', 1, 0, 0, 'Tropical Weight Wool-Touch Blend', 4.7, 31),
(13, 'mg-shoe-13', 'MGC-SHOE-013', 'Premium Black Formal Shoes', 'Hand-burnished full-grain calfskin cap-toe Oxfords with cushioned leather insole.', 'Handcrafted by master shoemakers, our Premium Black Formal Shoes feature a sleek cap-toe silhouette, full leather lining, and a durable anti-slip gentleman heel built for formal excellence.', 3, '/uploads/category_shoes.jpg', 5999.00, 4799.00, 20, 'in_stock', 1, 1, 1, '100% Full-Grain Calfskin Leather', 4.9, 83),
(14, 'mg-shoe-14', 'MGC-SHOE-014', 'Classic Brown Leather Shoes', 'Rich hand-antiqued cognac leather derby brogues with artisanal wingtip detailing.', 'Each pair of Classic Brown Leather Shoes is hand-burnished with natural waxes to create a rich patina. Memory-foam arch support ensures effortless comfort from morning meetings to evening receptions.', 3, '/uploads/category_shoes.jpg', 6499.00, 5199.00, 20, 'in_stock', 1, 0, 0, 'Hand-Antiqued Genuine Leather', 4.9, 56),
(15, 'mg-shoe-15', 'MGC-SHOE-015', 'White Casual Sneakers', 'Minimalist low-top smooth leather court sneakers with stitched cupsole construction.', 'Clean architectural lines meet everyday versatility. Our White Casual Sneakers pair supple matte leather uppers with a high-density rubber cupsole that looks sharp with chinos, denim, or tailored trousers.', 3, '/uploads/category_shoes.jpg', 4999.00, 3999.00, 20, 'in_stock', 1, 0, 1, 'Smooth Nappa Action Leather & Rubber Cupsole', 4.8, 67),
(16, 'mg-shoe-16', 'MGC-SHOE-016', 'Black Premium Sneakers', 'Monochrome black leather and suede-paneled luxury urban sneakers.', 'Designed for sleek nocturnal sophistication, the Black Premium Sneakers combine full-grain leather with tactile suede overlays and waxed cotton laces.', 3, '/uploads/category_shoes.jpg', 5499.00, 4399.00, 20, 'in_stock', 1, 1, 0, 'Grain Leather & Calf Suede Panels', 4.8, 42),
(17, 'mg-shoe-17', 'MGC-SHOE-017', 'Brown Casual Loafers', 'Slip-on penny driving loafers in supple tumbled leather with flexible moccasin stitching.', 'Effortless slip-on luxury for weekend drives and smart-casual gatherings. Hand-stitched moccasin construction molds naturally to the foot.', 3, '/uploads/category_shoes.jpg', 4799.00, 3839.00, 20, 'in_stock', 1, 0, 0, 'Tumbled Nubuck & Calf Leather', 4.7, 35),
(18, 'mg-watch-18', 'MGC-WT-018', 'Executive Black Steel Watch', '42mm brushed black stainless steel timepiece with sunray dial and luminous hands.', 'Commanding presence on the wrist. The Executive Black Steel Watch features a scratch-resistant mineral crystal, precision Japanese quartz movement, date window at 3 o clock, and solid stainless steel link bracelet.', 4, '/uploads/category_watches.jpg', 4999.00, 3999.00, 20, 'in_stock', 1, 1, 0, '316L Brushed Black Stainless Steel', 4.9, 74),
(19, 'mg-watch-19', 'MGC-WT-019', 'Classic Silver Chronograph', 'Multi-dial tachymeter chronograph in polished surgical steel with deployment clasp.', 'A tribute to precision horology. The Classic Silver Chronograph pairs a deep obsidian sub-dial layout with a polished silver bezel, stopwatch functionality, and 3ATM water resistance.', 4, '/uploads/category_watches.jpg', 6999.00, 5599.00, 20, 'in_stock', 1, 0, 1, 'Polished Stainless Steel & Hardened Mineral Glass', 4.9, 92),
(20, 'mg-watch-20', 'MGC-WT-020', 'Premium Black Leather Watch', 'Ultra-thin dress watch with alligator-embossed genuine leather strap and gold indices.', 'Designed to slip effortlessly beneath a buttoned French cuff, the Premium Black Leather Watch balances classic dress proportions with warm gold baton hour markers.', 4, '/uploads/category_watches.jpg', 4499.00, 3599.00, 20, 'in_stock', 1, 0, 0, 'Alloy Case & Genuine Embossed Leather Strap', 4.8, 48),
(21, 'mg-watch-21', 'MGC-WT-021', 'Gold Accent Luxury Watch', 'Statement two-tone brushed gold and gunmetal timepiece with skeletal date calendar.', 'Our flagship timepiece at Malik G Collection. Featuring rich 18k gold-tone plating contrasted against charcoal steel links, luminous markers, and a precision sweep movement.', 4, '/uploads/category_watches.jpg', 7999.00, 6399.00, 20, 'in_stock', 1, 1, 1, 'Gold Ion-Plated Stainless Steel', 5.0, 61),
(22, 'mg-watch-22', 'MGC-WT-022', 'Minimalist Silver Watch', 'Clean Bauhaus-inspired 40mm dial paired with an adjustable stainless steel mesh strap.', 'Stripped of unnecessary ornament, the Minimalist Silver Watch celebrates pure proportion and legibility. Equipped with a breathable Milanese mesh band.', 4, '/uploads/category_watches.jpg', 3999.00, 3199.00, 20, 'in_stock', 1, 0, 0, 'Stainless Steel Case & Milanese Mesh', 4.7, 37),
(23, 'mg-perfume-23', 'MGC-PF-023', 'Royal Oud Perfume', 'Opulent woody-oriental Eau de Parfum with Cambodian Oud, saffron, and warm ambergris.', 'Our signature fragrance. Royal Oud opens with spicy Kashmiri saffron and bergamot before unfolding into a rich heart of aged agarwood (oud), Moroccan rose, and smoky sandalwood.', 5, '/uploads/category_perfumes.jpg', 4999.00, 3999.00, 20, 'in_stock', 1, 1, 1, '100ml Eau de Parfum (25% Oil Concentration)', 4.9, 108),
(24, 'mg-perfume-24', 'MGC-PF-024', 'Black Musk Perfume', 'Seductive dark musk fragrance layered with black pepper, leather accord, and Madagascar vanilla.', 'Intense, smooth, and magnetic. Black Musk Perfume blends crisp spicy top notes with a velvety base of dark white musk, patchouli, and smoked cedarwood.', 5, '/uploads/category_perfumes.jpg', 3999.00, 3199.00, 20, 'in_stock', 1, 0, 0, '100ml Eau de Parfum Spray', 4.8, 64),
(25, 'mg-perfume-25', 'MGC-PF-025', 'Premium Amber Fragrance', 'Warm resinous amber, cardamom, and roasted tonka bean for evening sophistication.', 'Golden warmth in a bottle. Premium Amber Fragrance wraps the wearer in an inviting aura of spiced cardamom, labdanum resin, and honeyed amber.', 5, '/uploads/category_perfumes.jpg', 4499.00, 3599.00, 20, 'in_stock', 1, 1, 0, '100ml Eau de Parfum Spray', 4.8, 49),
(26, 'mg-perfume-26', 'MGC-PF-026', 'Classic Woody Perfume', 'Earthy vetiver, Atlas cedarwood, and crisp grapefruit for refined daily wear.', 'Inspired by timeless masculine colognes, Classic Woody Perfume balances zesty citrus top notes with dry, smoky Haitian vetiver and cedar.', 5, '/uploads/category_perfumes.jpg', 3499.00, 2799.00, 20, 'in_stock', 1, 0, 0, '100ml Eau de Parfum Spray', 4.7, 43),
(27, 'mg-perfume-27', 'MGC-PF-027', 'Royal Night Eau de Parfum', 'Nocturnal blend of smoked incense, dark plum, leather, and golden patchouli.', 'Formulated specifically for festive occasions, weddings, and winter evenings. Royal Night commands attention with deep, velvety sillage that lingers on fabric for days.', 5, '/uploads/category_perfumes.jpg', 5499.00, 4399.00, 20, 'in_stock', 1, 1, 0, '100ml Extrait-Strength Eau de Parfum', 4.9, 77),
(28, 'mg-perfume-28', 'MGC-PF-028', 'Fresh Blue Eau de Parfum', 'Invigorating Mediterranean bergamot, marine accord, and ambroxan for warm Pakistani summers.', 'Crisp, clean, and energizing. Fresh Blue combines Calabrian bergamot and sea breeze notes with a masculine woody-ambroxan drydown.', 5, '/uploads/category_perfumes.jpg', 3999.00, 3199.00, 20, 'in_stock', 1, 0, 0, '100ml Eau de Parfum Spray', 4.8, 53),
(29, 'mg-acc-29', 'MGC-AC-029', 'Signature Reversible Leather Belt', 'Full-grain reversible black and brown leather belt with rotating brushed gold buckle.', 'Two essential belts in one refined design. Twist the brushed gold buckle to switch effortlessly between formal black and classic cognac brown leather.', 6, '/uploads/category_shoes.jpg', 1899.00, 1519.00, 20, 'in_stock', 1, 0, 0, 'Full-Grain Cowhide & Brushed Brass Buckle', 4.8, 34),
(30, 'mg-acc-30', 'MGC-AC-030', 'Executive Bifold Leather Wallet', 'Slim handcrafted genuine leather bifold wallet with 8 card slots and gold-foil crest.', 'Slim profile engineered to fit front or back pockets without bulk. Hand-stitched from supple vegetable-tanned leather with RFID-shielded lining.', 6, '/uploads/category_watches.jpg', 1699.00, 1359.00, 20, 'in_stock', 1, 1, 0, 'Vegetable-Tanned Full-Grain Leather', 4.9, 46)
ON DUPLICATE KEY UPDATE `original_price` = VALUES(`original_price`), `offer_price` = VALUES(`offer_price`), `discount_percent` = VALUES(`discount_percent`);

-- ============================================================================
-- SEED DATA: PRODUCT COLORS
-- ============================================================================
INSERT INTO `product_colors` (`product_id`, `color_name`, `color_hex`) VALUES
(1, 'Black', '#111111'), (1, 'Charcoal', '#2B2B2E'),
(2, 'White', '#F9F9F6'), (2, 'Ivory', '#EFECE6'),
(3, 'Navy Blue', '#1B2436'), (3, 'Midnight Blue', '#101726'),
(4, 'Charcoal Check', '#27272A'), (4, 'Navy Check', '#1E293B'),
(5, 'Olive', '#3B4432'), (5, 'Sage', '#5C6652'),
(6, 'Indigo Blue', '#1E2F4D'), (6, 'Charcoal Wash', '#26292E'),
(7, 'Black', '#0D0D0F'),
(8, 'Navy', '#172035'),
(9, 'Khaki', '#B59E7A'), (9, 'Stone', '#C8B99E'),
(10, 'Dark Blue', '#182438'),
(11, 'Black', '#141416'),
(12, 'Light Grey', '#8E9299'),
(13, 'Black', '#0F0F10'),
(14, 'Brown', '#6E3B1F'), (14, 'Dark Espresso', '#3B2214'),
(15, 'White', '#F5F5F4'),
(16, 'Black', '#141416'),
(17, 'Brown', '#5A321C'),
(18, 'Black', '#18181B'),
(19, 'Silver', '#D4D4D8'),
(20, 'Black', '#1C1917'),
(21, 'Gold', '#D4AF37'),
(22, 'Silver', '#E4E4E7'),
(23, 'Gold / Oud', '#D4AF37'),
(24, 'Black', '#141416'),
(25, 'Amber Gold', '#B45309'),
(26, 'Woody Brown', '#5A321C'),
(27, 'Midnight Black', '#111111'),
(28, 'Blue', '#1E3A8A'),
(29, 'Black / Brown', '#18181B'),
(30, 'Black', '#141416'), (30, 'Brown', '#4A2816');

-- ============================================================================
-- SEED DATA: PRODUCT SIZES
-- ============================================================================
INSERT INTO `product_sizes` (`product_id`, `size_name`) VALUES
(1, 'S'), (1, 'M'), (1, 'L'), (1, 'XL'), (1, 'XXL'),
(2, 'S'), (2, 'M'), (2, 'L'), (2, 'XL'),
(3, 'M'), (3, 'L'), (3, 'XL'), (3, 'XXL'),
(4, 'S'), (4, 'M'), (4, 'L'), (4, 'XL'),
(5, 'S'), (5, 'M'), (5, 'L'), (5, 'XL'), (5, 'XXL'),
(6, 'M'), (6, 'L'), (6, 'XL'), (6, 'XXL'),
(7, '30'), (7, '32'), (7, '34'), (7, '36'), (7, '38'), (7, '40'),
(8, '30'), (8, '32'), (8, '34'), (8, '36'), (8, '38'),
(9, '30'), (9, '32'), (9, '34'), (9, '36'), (9, '38'), (9, '40'),
(10, '30'), (10, '32'), (10, '34'), (10, '36'), (10, '38'),
(11, '30'), (11, '32'), (11, '34'), (11, '36'), (11, '38'),
(12, '30'), (12, '32'), (12, '34'), (12, '36'), (12, '38'),
(13, '39'), (13, '40'), (13, '41'), (13, '42'), (13, '43'), (13, '44'),
(14, '39'), (14, '40'), (14, '41'), (14, '42'), (14, '43'), (14, '44'),
(15, '39'), (15, '40'), (15, '41'), (15, '42'), (15, '43'), (15, '44'),
(16, '40'), (16, '41'), (16, '42'), (16, '43'), (16, '44'),
(17, '39'), (17, '40'), (17, '41'), (17, '42'), (17, '43'),
(23, '100ml'),
(24, '100ml'),
(25, '100ml'),
(26, '100ml'),
(27, '100ml'),
(28, '100ml'),
(29, '32'), (29, '34'), (29, '36'), (29, '38'), (29, '40');

SET FOREIGN_KEY_CHECKS = 1;
