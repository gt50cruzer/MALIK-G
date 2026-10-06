import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type Category =
  | 'Shirts'
  | 'Pants'
  | 'Shoes'
  | 'Watches'
  | 'Perfumes'
  | 'Accessories'
  | string;

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  dbId?: number;
  sku: string;
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  oldPrice?: number;
  originalPrice?: number;
  offerPrice?: number | null;
  discountPercent?: number;
  category: Category;
  image: string;
  gallery: string[];
  rating: number;
  reviewsCount: number;
  isNewArrival?: boolean;
  isTrending?: boolean;
  inStock: boolean;
  published?: boolean;
  sizes?: string[];
  colors?: ProductColor[];
  fabricOrMaterial: string;
  careOrNotes?: string;
  tags: string[];
  createdAt?: string;
}

export interface CartItemType {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface OrderCustomerDetails {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  notes?: string;
}

export type OrderStatusType =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface OrderItemSnapshot {
  id?: number;
  orderId?: number;
  productId: string;
  productNameSnapshot: string;
  productImageSnapshot: string;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  unitPrice: number;
  originalPriceSnapshot?: number;
  subtotal: number;
}

export interface Order {
  id?: number;
  orderNumber: string;
  createdAt: string;
  updatedAt?: string;
  customer: OrderCustomerDetails;
  items: CartItemType[];
  orderItems?: OrderItemSnapshot[];
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatusType;
  paymentMethod?: string;
}

const UPLOADS = {
  SHIRTS: '/uploads/category_shirts.jpg',
  PANTS: '/uploads/category_pants.jpg',
  SHOES: '/uploads/category_shoes.jpg',
  WATCHES: '/uploads/category_watches.jpg',
  PERFUMES: '/uploads/category_perfumes.jpg',
};

const RAW_SEED_PRODUCTS: Product[] = [
  {
    id: 'mg-shirt-01',
    sku: 'MGC-SH-101',
    name: 'Sialkot Reserve Oxford Button-Down',
    shortDescription: 'Tailored combed cotton Oxford shirt with mother-of-pearl buttons.',
    description:
      'Crafted for refined daily wear and formal gatherings across Pakistan. Constructed from breathable 100% two-ply combed cotton with a structured collar that holds its shape under a blazer or worn solo.',
    price: 4450,
    oldPrice: 5200,
    category: 'Shirts',
    image: UPLOADS.SHIRTS,
    gallery: [UPLOADS.SHIRTS],
    rating: 4.9,
    reviewsCount: 64,
    isNewArrival: true,
    isTrending: true,
    inStock: true,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Crisp Ivory', hex: '#F5F5F0' },
      { name: 'Midnight Navy', hex: '#1B2436' },
      { name: 'Charcoal Slate', hex: '#2D2E32' },
    ],
    fabricOrMaterial: '100% Two-Ply Combed Egyptian Cotton',
    careOrNotes: 'Machine wash cold, gentle cycle. Warm iron on reverse.',
    tags: ['oxford', 'formal shirt', 'cotton', 'white shirt', 'men'],
  },
  {
    id: 'mg-shirt-02',
    sku: 'MGC-SH-102',
    name: 'Noir Mandarin Collar Linen Shirt',
    shortDescription: 'Lightweight pure linen-cotton blend with a sharp band collar.',
    description:
      'Designed for warm Pakistani evenings and smart-casual occasions. Features a clean mandarin band collar, reinforced cuffs, and a relaxed yet tailored silhouette.',
    price: 3950,
    category: 'Shirts',
    image: UPLOADS.SHIRTS,
    gallery: [UPLOADS.SHIRTS],
    rating: 4.8,
    reviewsCount: 41,
    isTrending: true,
    inStock: true,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Obsidian Black', hex: '#111113' },
      { name: 'Olive Sand', hex: '#6E6A53' },
      { name: 'Warm Stone', hex: '#D8CFC2' },
    ],
    fabricOrMaterial: '65% European Linen, 35% Combed Cotton',
    careOrNotes: 'Hand wash or dry clean recommended.',
    tags: ['linen', 'mandarin collar', 'black shirt', 'summer', 'casual'],
  },
  {
    id: 'mg-shirt-03',
    sku: 'MGC-SH-103',
    name: 'Executive Twill French-Cuff Dress Shirt',
    shortDescription: 'Fine diagonal twill weave engineered for boardroom authority.',
    description:
      'Our signature formal dress shirt featuring a wrinkle-resistant luxury twill finish, semi-spread collar, and convertible cuffs suitable for gold cufflinks or standard buttoning.',
    price: 4800,
    oldPrice: 5600,
    category: 'Shirts',
    image: UPLOADS.SHIRTS,
    gallery: [UPLOADS.SHIRTS],
    rating: 4.9,
    reviewsCount: 38,
    isNewArrival: true,
    inStock: true,
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Sky Ice', hex: '#D6E4F0' },
      { name: 'Pure White', hex: '#FFFFFF' },
    ],
    fabricOrMaterial: '120s Two-Fold Non-Iron Luxury Cotton Twill',
    careOrNotes: 'Hang dry immediately after wash for crease-free finish.',
    tags: ['dress shirt', 'formal', 'office', 'twill'],
  },
  {
    id: 'mg-shirt-04',
    sku: 'MGC-SH-104',
    name: 'Artisan Check Brushed Flannel Overshirt',
    shortDescription: 'Mid-weight brushed cotton overshirt for layered winter styling.',
    description:
      'Versatile transitional overshirt with chest utility pockets, horn-style buttons, and a soft brushed interior ideal for Sialkot and northern winter evenings.',
    price: 4650,
    category: 'Shirts',
    image: UPLOADS.SHIRTS,
    gallery: [UPLOADS.SHIRTS],
    rating: 4.7,
    reviewsCount: 29,
    inStock: true,
    sizes: ['M', 'L', 'XL'],
    colors: [
      { name: 'Espresso Check', hex: '#3B2F2F' },
      { name: 'Forest Charcoal', hex: '#233127' },
    ],
    fabricOrMaterial: '100% Brushed Heavyweight Cotton Flannel (240 GSM)',
    careOrNotes: 'Wash with similar dark colors.',
    tags: ['overshirt', 'flannel', 'check', 'winter'],
  },
  {
    id: 'mg-pant-01',
    sku: 'MGC-PT-201',
    name: 'Savile Tailored Stretch Chino Trousers',
    shortDescription: 'Tapered smart chinos with 4-way comfort stretch and clean crease.',
    description:
      'Engineered for all-day movement without losing its crisp tailored drape. Features Italian-style side pockets, reinforced belt loops, and a modern tapered ankle.',
    price: 4250,
    oldPrice: 4950,
    category: 'Pants',
    image: UPLOADS.PANTS,
    gallery: [UPLOADS.PANTS],
    rating: 4.9,
    reviewsCount: 77,
    isTrending: true,
    inStock: true,
    sizes: ['30', '32', '34', '36', '38'],
    colors: [
      { name: 'Sandstone Khaki', hex: '#C3B091' },
      { name: 'Jet Black', hex: '#121214' },
      { name: 'Deep Navy', hex: '#1A2433' },
    ],
    fabricOrMaterial: '97% Organic Peached Cotton, 3% Elastane',
    careOrNotes: 'Turn inside out before washing.',
    tags: ['chinos', 'trousers', 'formal pants', 'khaki'],
  },
  {
    id: 'mg-pant-02',
    sku: 'MGC-PT-202',
    name: 'Selvedge-Inspired Raw Charcoal Denim',
    shortDescription: 'Structured slim-straight denim with subtle tonal stitching.',
    description:
      'A refined dark denim jean crafted from heavyweight ring-spun cotton with just enough stretch for immediate comfort. Pair with Chelsea boots or minimalist sneakers.',
    price: 4750,
    category: 'Pants',
    image: UPLOADS.PANTS,
    gallery: [UPLOADS.PANTS],
    rating: 4.8,
    reviewsCount: 52,
    isNewArrival: true,
    inStock: true,
    sizes: ['30', '32', '34', '36', '38'],
    colors: [
      { name: 'Charcoal Indigo', hex: '#1F242D' },
      { name: 'Vintage Wash Black', hex: '#222225' },
    ],
    fabricOrMaterial: '13.5 oz Ring-Spun Comfort Stretch Denim',
    careOrNotes: 'Wash cold sparingly to preserve deep dye character.',
    tags: ['jeans', 'denim', 'black jeans', 'pants'],
  },
  {
    id: 'mg-pant-03',
    sku: 'MGC-PT-203',
    name: 'Pleated Gurkha Sartorial Dress Trousers',
    shortDescription: 'High-waisted double-pleated trousers with signature extended waistband.',
    description:
      'Statement sartorial tailoring featuring an adjustable buckle Gurkha waistband that eliminates the need for a belt. Drapes effortlessly over formal loafers.',
    price: 5600,
    oldPrice: 6500,
    category: 'Pants',
    image: UPLOADS.PANTS,
    gallery: [UPLOADS.PANTS],
    rating: 4.9,
    reviewsCount: 34,
    isNewArrival: true,
    inStock: true,
    sizes: ['30', '32', '34', '36'],
    colors: [
      { name: 'Warm Taupe', hex: '#8B7D6B' },
      { name: 'Anthracite Grey', hex: '#333538' },
    ],
    fabricOrMaterial: 'Tropical Weight Wool-Blend Suiting Fabric',
    careOrNotes: 'Dry clean only to maintain sharp front pleats.',
    tags: ['gurkha', 'dress pants', 'tailored', 'luxury'],
  },
  {
    id: 'mg-shoe-01',
    sku: 'MGC-SHOE-301',
    name: 'Sialkot Hand-Burnished Calfskin Penny Loafer',
    shortDescription: 'Full-grain Pakistani leather loafers with Blake-stitched sole.',
    description:
      'Proudly handcrafted by master leather artisans in Sialkot. Cut from supple full-grain calfskin with a hand-burnished patina, breathable leather lining, and cushioned heel pad.',
    price: 8950,
    oldPrice: 10500,
    category: 'Shoes',
    image: UPLOADS.SHOES,
    gallery: [UPLOADS.SHOES],
    rating: 5.0,
    reviewsCount: 89,
    isNewArrival: true,
    isTrending: true,
    inStock: true,
    sizes: ['40', '41', '42', '43', '44', '45'],
    colors: [
      { name: 'Cognac Tan', hex: '#8A4B29' },
      { name: 'Obsidian Black', hex: '#111113' },
      { name: 'Oxblood Bordeaux', hex: '#4A191E' },
    ],
    fabricOrMaterial: '100% Full-Grain Sialkot Export-Grade Calfskin Leather',
    careOrNotes: 'Condition with neutral wax polish and use cedar shoe trees.',
    tags: ['loafers', 'leather shoes', 'formal shoes', 'sialkot leather'],
  },
  {
    id: 'mg-shoe-02',
    sku: 'MGC-SHOE-302',
    name: 'Monolith Minimalist Nappa Leather Sneaker',
    shortDescription: 'Low-profile luxury court sneaker with tonal cupsole.',
    description:
      'Clean architectural lines meet plush everyday comfort. Built from buttery smooth Nappa leather with gold-foil heel branding and high-density memory foam insoles.',
    price: 7450,
    category: 'Shoes',
    image: UPLOADS.SHOES,
    gallery: [UPLOADS.SHOES],
    rating: 4.8,
    reviewsCount: 46,
    isTrending: true,
    inStock: true,
    sizes: ['40', '41', '42', '43', '44'],
    colors: [
      { name: 'Triple Onyx & Gold', hex: '#141416' },
      { name: 'Chalk White', hex: '#F4F4F0' },
    ],
    fabricOrMaterial: 'Full-Grain Nappa Upper & Vulcanized Rubber Cupsole',
    careOrNotes: 'Wipe clean with damp microfiber cloth.',
    tags: ['sneakers', 'casual shoes', 'leather sneakers'],
  },
  {
    id: 'mg-shoe-03',
    sku: 'MGC-SHOE-303',
    name: 'Imperial Double Monk Strap Dress Shoe',
    shortDescription: 'Cap-toe leather dress shoe with brushed antique brass buckles.',
    description:
      'Commanding formal footwear for weddings, executive meetings, and black-tie events. Features a chiselled toe box and anti-slip rubber-injected leather outsole.',
    price: 9600,
    oldPrice: 11200,
    category: 'Shoes',
    image: UPLOADS.SHOES,
    gallery: [UPLOADS.SHOES],
    rating: 4.9,
    reviewsCount: 61,
    inStock: true,
    sizes: ['40', '41', '42', '43', '44', '45'],
    colors: [
      { name: 'Dark Espresso', hex: '#2E1E18' },
      { name: 'Formal Black', hex: '#0E0E10' },
    ],
    fabricOrMaterial: 'Hand-Selected Box Calf Leather & Leather/TPR Outsole',
    careOrNotes: 'Buff with horsehair brush before each wear.',
    tags: ['monk strap', 'wedding shoes', 'formal', 'leather'],
  },
  {
    id: 'mg-watch-01',
    sku: 'MGC-WT-401',
    name: 'Chronographe Royal Gold & Onyx Timepiece',
    shortDescription: 'Sapphire-coated chronograph with brushed 316L stainless steel case.',
    description:
      'A bold horological statement combining a sunray obsidian dial, luminous gold baton indices, working chronograph sub-dials, and a solid deployment clasp bracelet.',
    price: 12500,
    oldPrice: 14800,
    category: 'Watches',
    image: UPLOADS.WATCHES,
    gallery: [UPLOADS.WATCHES],
    rating: 4.9,
    reviewsCount: 112,
    isNewArrival: true,
    isTrending: true,
    inStock: true,
    sizes: ['42mm Standard'],
    colors: [
      { name: 'Gold & Obsidian', hex: '#D4AF37' },
      { name: 'Gunmetal & Navy', hex: '#2A3446' },
    ],
    fabricOrMaterial: '316L Surgical Stainless Steel, Japanese Quartz Chronograph Movement, 5ATM',
    careOrNotes: 'Includes Malik G presentation box and 1-year movement warranty.',
    tags: ['watch', 'chronograph', 'gold watch', 'luxury watch', 'gift'],
  },
  {
    id: 'mg-watch-02',
    sku: 'MGC-WT-402',
    name: 'Heritage Automatic Open-Heart Leather Watch',
    shortDescription: 'Mechanical exhibition dial paired with crocodile-embossed leather strap.',
    description:
      'Powered by the motion of your wrist. The open-heart aperture reveals the beating balance wheel against a textured guilloché dial, finished with a genuine Sialkot leather strap.',
    price: 14900,
    oldPrice: 17500,
    category: 'Watches',
    image: UPLOADS.WATCHES,
    gallery: [UPLOADS.WATCHES],
    rating: 5.0,
    reviewsCount: 58,
    isNewArrival: true,
    inStock: true,
    sizes: ['40mm Dress'],
    colors: [
      { name: 'Rose Gold & Brown Leather', hex: '#B76E59' },
      { name: 'Silver & Black Leather', hex: '#C0C0C5' },
    ],
    fabricOrMaterial: '21-Jewel Automatic Self-Winding Movement, Domed Mineral Crystal',
    careOrNotes: 'Avoid strong magnetic fields; wind crown 15 turns if unworn for 40+ hours.',
    tags: ['automatic watch', 'leather strap', 'mechanical', 'watch'],
  },
  {
    id: 'mg-watch-03',
    sku: 'MGC-WT-403',
    name: 'Stealth Matte-Black Milanese Mesh Watch',
    shortDescription: 'Ultra-thin 7mm minimalist case with magnetic woven steel mesh band.',
    description:
      'Sleek, weightless, and effortlessly modern. Slides smoothly under French cuffs while commanding attention with its murdered-out matte black PVD coating and gold hands.',
    price: 8400,
    category: 'Watches',
    image: UPLOADS.WATCHES,
    gallery: [UPLOADS.WATCHES],
    rating: 4.8,
    reviewsCount: 44,
    inStock: true,
    sizes: ['40mm Ultra-Slim'],
    colors: [{ name: 'Matte Black & Gold', hex: '#151517' }],
    fabricOrMaterial: 'Ion-Plated Matte Steel Case, Adjustable Milanese Mesh',
    careOrNotes: '3ATM splash resistant.',
    tags: ['minimalist watch', 'black watch', 'mesh strap'],
  },
  {
    id: 'mg-perf-01',
    sku: 'MGC-PF-501',
    name: 'Oud Al Malik — Extrait de Parfum (100ml)',
    shortDescription: 'Opulent Cambodian oud, saffron, smoked amber, and Damascus rose.',
    description:
      'Our crown-jewel signature fragrance. Formulated at 28% pure perfume oil concentration for 12+ hour projection. Opens with spicy royal saffron and bergamot before settling into deep resinous agarwood and warm Madagascar vanilla.',
    price: 6850,
    oldPrice: 7900,
    category: 'Perfumes',
    image: UPLOADS.PERFUMES,
    gallery: [UPLOADS.PERFUMES],
    rating: 5.0,
    reviewsCount: 134,
    isNewArrival: true,
    isTrending: true,
    inStock: true,
    sizes: ['100ml Extrait', '50ml Travel'],
    colors: [{ name: 'Royal Gold Flacon', hex: '#D4AF37' }],
    fabricOrMaterial: 'Notes: Royal Saffron, Bergamot, Cambodian Oud, Smoked Amber, Leather',
    careOrNotes: 'Apply to pulse points (wrists, neck) without rubbing. Store in a cool dark place.',
    tags: ['oud', 'perfume', 'fragrance', 'long lasting', 'extrait'],
  },
  {
    id: 'mg-perf-02',
    sku: 'MGC-PF-502',
    name: 'Velours Noir — Bergamot & Vetiver Eau de Parfum',
    shortDescription: 'Crisp Calabrian bergamot, black pepper, smoky vetiver, and ambroxan.',
    description:
      'Fresh, magnetic, and universally compliment-getting. Ideal for daytime office wear and warm Pakistani summers with a clean woody-citrus trail that lingers on fabric for days.',
    price: 5450,
    category: 'Perfumes',
    image: UPLOADS.PERFUMES,
    gallery: [UPLOADS.PERFUMES],
    rating: 4.9,
    reviewsCount: 83,
    isTrending: true,
    inStock: true,
    sizes: ['100ml EDP'],
    colors: [{ name: 'Smoked Glass Flacon', hex: '#232428' }],
    fabricOrMaterial: 'Notes: Calabrian Bergamot, Pink Pepper, Haitian Vetiver, Cedarwood, Ambroxan',
    careOrNotes: '22% Eau de Parfum concentration.',
    tags: ['fresh perfume', 'citrus', 'office scent', 'men perfume'],
  },
  {
    id: 'mg-perf-03',
    sku: 'MGC-PF-503',
    name: 'Sultan’s Amber & Tobacco Reserve (100ml)',
    shortDescription: 'Warm honeyed tobacco leaf, cardamom, tonka bean, and dark cocoa.',
    description:
      'A rich winter and evening elixir inspired by classic private-blend perfumery. Envelops the wearer in a sophisticated aura of roasted spices, sweet pipe tobacco, and creamy sandalwood.',
    price: 6200,
    oldPrice: 7200,
    category: 'Perfumes',
    image: UPLOADS.PERFUMES,
    gallery: [UPLOADS.PERFUMES],
    rating: 4.9,
    reviewsCount: 49,
    inStock: true,
    sizes: ['100ml EDP'],
    colors: [{ name: 'Amber Gold Flacon', hex: '#9A6324' }],
    fabricOrMaterial: 'Notes: Guatemalan Cardamom, Tobacco Leaf, Tonka Bean, Sandalwood',
    careOrNotes: 'Best suited for evening events and cooler weather.',
    tags: ['amber', 'tobacco', 'winter perfume', 'evening'],
  },
  {
    id: 'mg-acc-01',
    sku: 'MGC-AC-601',
    name: 'Sialkot Full-Grain Reversible Executive Belt',
    shortDescription: 'Black-to-cognac reversible leather strap with rotating gold/gunmetal buckle.',
    description:
      'Two essential formal belts in one. Crafted from vegetable-tanned Sialkot full-grain cowhide with a precision twist-buckle mechanism.',
    price: 2950,
    oldPrice: 3500,
    category: 'Accessories',
    image: UPLOADS.SHOES,
    gallery: [UPLOADS.SHOES],
    rating: 4.8,
    reviewsCount: 37,
    isNewArrival: true,
    inStock: true,
    sizes: ['32-34', '36-38', '40-42'],
    colors: [{ name: 'Reversible Black / Cognac', hex: '#1C1613' }],
    fabricOrMaterial: '100% Full-Grain Vegetable-Tanned Cowhide Leather',
    careOrNotes: 'Pull and twist buckle head to switch between black and cognac sides.',
    tags: ['belt', 'leather belt', 'accessories', 'gift'],
  },
  {
    id: 'mg-acc-02',
    sku: 'MGC-AC-602',
    name: 'RFID Bifold Saddle-Stitched Leather Wallet',
    shortDescription: 'Slim profile full-grain wallet with 8 card slots and cash divider.',
    description:
      'Hand-stitched in Sialkot with waxed linen thread and burnished edges. Built-in RFID shielding protects contactless bank cards while developing a rich patina over time.',
    price: 2650,
    category: 'Accessories',
    image: UPLOADS.WATCHES,
    gallery: [UPLOADS.WATCHES],
    rating: 4.9,
    reviewsCount: 65,
    inStock: true,
    sizes: ['One Size'],
    colors: [
      { name: 'Bourbon Brown', hex: '#5C3A21' },
      { name: 'Jet Black', hex: '#121214' },
    ],
    fabricOrMaterial: 'Full-Grain Pull-Up Leather with RFID Blocking Lining',
    careOrNotes: 'Delivered in a stamped Malik G gift box.',
    tags: ['wallet', 'leather wallet', 'accessories', 'sialkot'],
  },
];

export const INITIAL_PRODUCTS: Product[] = RAW_SEED_PRODUCTS.map((product) => {
  const originalPrice = product.price;
  const offerPrice = Math.round(originalPrice * 0.8);
  return {
    ...product,
    price: offerPrice,
    oldPrice: originalPrice,
    originalPrice,
    offerPrice,
    discountPercent: 20,
  };
});

export interface AdminAccount {
  id: number;
  email: string;
  role: 'admin';
  passwordSalt: string;
  passwordHash: string;
  updatedAt: string;
}

export interface CustomerAccount {
  id: number;
  fullName: string;
  email: string;
  role: 'customer';
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
}

export interface CategoryRecord {
  id: number;
  name: string;
  slug: string;
  subtitle: string;
}

export interface SessionData {
  userId: number;
  adminId?: number;
  fullName?: string;
  email: string;
  role: 'admin' | 'customer';
  csrfToken: string;
  lastActivity: number;
}

export interface DatabaseSchema {
  admins: AdminAccount[];
  customers?: CustomerAccount[];
  sessions?: Record<string, SessionData>;
  categories: CategoryRecord[];
  products: Product[];
  orders: Order[];
}

export const OWNER_ADMIN_EMAIL = 'malikg@gmail.com';
export const INITIAL_OWNER_PASSWORD = 'malikgcollection';
export const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

const TOKEN_SECRET =
  process.env.AUTH_TOKEN_SECRET ||
  process.env.SESSION_SECRET ||
  'malik-g-collection-production-token-secret-v1';

// Resolve writable runtime directory (supports both AI Studio workspace and Vercel /tmp)
function resolveDbFilePath(): string {
  const localDir = path.resolve(process.cwd(), '.runtime_db');
  const localFile = path.join(localDir, 'malik_g_mysql_mirror.json');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    fs.accessSync(localDir, fs.constants.W_OK);
    return localFile;
  } catch {
    const tmpDir = path.join('/tmp', 'malik_g_runtime_db');
    const tmpFile = path.join(tmpDir, 'malik_g_mysql_mirror.json');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      if (!fs.existsSync(tmpFile) && fs.existsSync(localFile)) {
        fs.copyFileSync(localFile, tmpFile);
      }
    } catch {
      // ignore copy errors
    }
    return tmpFile;
  }
}

export function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { salt: actualSalt, hash };
}

export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  try {
    const { hash } = hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

function signHmac(data: string): string {
  return crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
}

/**
 * Creates a self-contained signed session token that also works across stateless
 * Vercel serverless function invocations while remaining a valid session ID key.
 */
export function createSignedSessionToken(session: SessionData): string {
  const payload = {
    u: session.userId,
    a: session.adminId,
    n: session.fullName || '',
    e: session.email,
    r: session.role,
    c: session.csrfToken,
    t: session.lastActivity,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = signHmac(encoded);
  return `mgc.${encoded}.${sig}`;
}

export function verifySignedSessionToken(token: string): SessionData | null {
  if (!token || !token.startsWith('mgc.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, encoded, sig] = parts;
  const expectedSig = signHmac(encoded);
  try {
    if (
      sig.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
    ) {
      return null;
    }
    const raw = Buffer.from(encoded, 'base64url').toString('utf-8');
    const parsed = JSON.parse(raw) as {
      u: number;
      a?: number;
      n?: string;
      e: string;
      r: 'admin' | 'customer';
      c: string;
      t: number;
    };
    if (!parsed || !parsed.e || (parsed.r !== 'admin' && parsed.r !== 'customer')) {
      return null;
    }
    if (Date.now() - Number(parsed.t || 0) > SESSION_TIMEOUT_MS) {
      return null;
    }
    return {
      userId: Number(parsed.u || 1),
      adminId: parsed.a !== undefined ? Number(parsed.a) : undefined,
      fullName: parsed.n || '',
      email: String(parsed.e),
      role: parsed.r,
      csrfToken: String(parsed.c || ''),
      lastActivity: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Creates a server-signed, tamper-proof customer credential record so that even if a
 * Vercel serverless cold start clears /tmp between registration and a later sign-in,
 * the server can cryptographically verify the customer's hashed credentials and re-hydrate
 * the customer record into its runtime database.
 */
export function createSignedCustomerVaultToken(customer: CustomerAccount): string {
  const payload = {
    i: customer.id,
    n: customer.fullName,
    e: customer.email.toLowerCase(),
    s: customer.passwordSalt,
    h: customer.passwordHash,
    c: customer.createdAt,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = signHmac(`vault.${encoded}`);
  return `mgcv.${encoded}.${sig}`;
}

export function verifySignedCustomerVaultToken(token: string): CustomerAccount | null {
  if (!token || !token.startsWith('mgcv.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, encoded, sig] = parts;
  const expectedSig = signHmac(`vault.${encoded}`);
  try {
    if (
      sig.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
    ) {
      return null;
    }
    const raw = Buffer.from(encoded, 'base64url').toString('utf-8');
    const parsed = JSON.parse(raw) as {
      i: number;
      n: string;
      e: string;
      s: string;
      h: string;
      c: string;
    };
    if (!parsed || !parsed.e || !parsed.s || !parsed.h) return null;
    return {
      id: Number(parsed.i || 1),
      fullName: String(parsed.n || ''),
      email: String(parsed.e).toLowerCase(),
      role: 'customer',
      passwordSalt: String(parsed.s),
      passwordHash: String(parsed.h),
      createdAt: String(parsed.c || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export function ensureAuthorizedOwnerAdmin(
  admins: AdminAccount[]
): { admins: AdminAccount[]; changed: boolean } {
  let changed = false;
  const normalizedList: AdminAccount[] = Array.isArray(admins) ? [...admins] : [];

  const matchingIndices: number[] = [];
  normalizedList.forEach((a, idx) => {
    if (a.email && a.email.trim().toLowerCase() === OWNER_ADMIN_EMAIL) {
      matchingIndices.push(idx);
    }
  });

  if (matchingIndices.length > 1) {
    for (let i = matchingIndices.length - 1; i >= 1; i--) {
      normalizedList.splice(matchingIndices[i], 1);
    }
    changed = true;
  }

  const ownerIdx = normalizedList.findIndex(
    (a) => a.email && a.email.trim().toLowerCase() === OWNER_ADMIN_EMAIL
  );

  if (ownerIdx === -1) {
    const initialPass = hashPassword(INITIAL_OWNER_PASSWORD);
    const ownerAccount: AdminAccount = {
      id: 1,
      email: OWNER_ADMIN_EMAIL,
      role: 'admin',
      passwordSalt: initialPass.salt,
      passwordHash: initialPass.hash,
      updatedAt: new Date().toISOString(),
    };
    return { admins: [ownerAccount], changed: true };
  }

  const existing = normalizedList[ownerIdx];
  if (existing.role !== 'admin' || existing.email !== OWNER_ADMIN_EMAIL) {
    normalizedList[ownerIdx] = {
      ...existing,
      email: OWNER_ADMIN_EMAIL,
      role: 'admin',
    };
    changed = true;
  }

  if (normalizedList.length > 1) {
    return { admins: [normalizedList[ownerIdx]], changed: true };
  }

  return { admins: normalizedList, changed };
}

let memoryDbFallback: DatabaseSchema | null = null;

export function saveDatabase(db: DatabaseSchema): void {
  memoryDbFallback = db;
  try {
    const dbFile = resolveDbFilePath();
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf-8');
  } catch {
    // Kept in memoryDbFallback if filesystem is read-only
  }
}

export function loadDatabase(): DatabaseSchema {
  try {
    const dbFile = resolveDbFilePath();
    const bundledSeedFile = path.resolve(process.cwd(), '.runtime_db', 'malik_g_mysql_mirror.json');
    const targetToRead = fs.existsSync(dbFile)
      ? dbFile
      : fs.existsSync(bundledSeedFile)
      ? bundledSeedFile
      : '';

    if (targetToRead) {
      const raw = fs.readFileSync(targetToRead, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
        let updated = false;
        if (!Array.isArray(parsed.customers)) {
          parsed.customers = [];
          updated = true;
        }
        if (!parsed.sessions || typeof parsed.sessions !== 'object') {
          parsed.sessions = {};
          updated = true;
        }
        const ensuredAdmins = ensureAuthorizedOwnerAdmin(parsed.admins || []);
        if (ensuredAdmins.changed) {
          parsed.admins = ensuredAdmins.admins;
          updated = true;
        }
        parsed.products = parsed.products.map((p) => {
          const seed = INITIAL_PRODUCTS.find((sp) => sp.id === p.id);
          if (seed && p.price === seed.originalPrice) {
            updated = true;
            return {
              ...p,
              price: seed.price,
              oldPrice: seed.oldPrice,
              originalPrice: seed.originalPrice,
              offerPrice: seed.offerPrice,
              discountPercent: seed.discountPercent,
            };
          }
          return p;
        });
        if (updated) {
          saveDatabase(parsed);
        }
        memoryDbFallback = parsed;
        return parsed;
      }
    }
  } catch {
    if (memoryDbFallback) return memoryDbFallback;
  }

  if (memoryDbFallback) {
    return memoryDbFallback;
  }

  const defaultPass = hashPassword(INITIAL_OWNER_PASSWORD);
  const initialDb: DatabaseSchema = {
    admins: [
      {
        id: 1,
        email: OWNER_ADMIN_EMAIL,
        role: 'admin',
        passwordSalt: defaultPass.salt,
        passwordHash: defaultPass.hash,
        updatedAt: new Date().toISOString(),
      },
    ],
    customers: [],
    sessions: {},
    categories: [
      { id: 1, name: 'Shirts', slug: 'shirts', subtitle: 'Smart styles for every occasion' },
      { id: 2, name: 'Pants', slug: 'pants', subtitle: 'Comfort meets modern style' },
      { id: 3, name: 'Shoes', slug: 'shoes', subtitle: 'Step into premium style' },
      { id: 4, name: 'Watches', slug: 'watches', subtitle: 'Time made stylish' },
      { id: 5, name: 'Perfumes', slug: 'perfumes', subtitle: 'Make your presence unforgettable' },
      { id: 6, name: 'Accessories', slug: 'accessories', subtitle: 'Essential leather craftsmanship' },
    ],
    products: INITIAL_PRODUCTS.map((p, idx) => ({
      ...p,
      dbId: idx + 1,
      published: true,
    })),
    orders: [],
  };

  saveDatabase(initialDb);
  return initialDb;
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const key = parts.shift()?.trim();
    if (key) {
      list[key] = decodeURI(parts.join('='));
    }
  });
  return list;
}

export interface IncomingAuthRequest {
  method?: string;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
  protocol?: string;
}

function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string {
  const val = headers[name.toLowerCase()] ?? headers[name];
  if (Array.isArray(val)) return val[0] || '';
  return typeof val === 'string' ? val : '';
}

export function extractSessionId(req: IncomingAuthRequest): string | null {
  const authHeader = getHeader(req.headers, 'authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const customToken = getHeader(req.headers, 'x-session-token');
  if (customToken && customToken.trim()) {
    return customToken.trim();
  }
  const cookies = parseCookies(getHeader(req.headers, 'cookie'));
  if (cookies['MGC_SESSID']) {
    return cookies['MGC_SESSID'];
  }
  return null;
}

export function buildSessionCookieHeader(
  req: IncomingAuthRequest,
  sid: string,
  maxAgeSeconds: number
): string {
  const proto = getHeader(req.headers, 'x-forwarded-proto') || req.protocol || '';
  const host = getHeader(req.headers, 'host').toLowerCase();
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const isHttps = proto.includes('https') || !isLocalhost;

  if (maxAgeSeconds <= 0) {
    if (isHttps) {
      return 'MGC_SESSID=; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=0';
    }
    return 'MGC_SESSID=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
  }

  if (isHttps) {
    return `MGC_SESSID=${sid}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${maxAgeSeconds}`;
  }
  return `MGC_SESSID=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function saveSession(sid: string, sessionData: SessionData): void {
  const db = loadDatabase();
  if (!db.sessions || typeof db.sessions !== 'object') {
    db.sessions = {};
  }
  db.sessions[sid] = sessionData;
  saveDatabase(db);
}

export function deleteSession(sid: string): void {
  const db = loadDatabase();
  if (db.sessions && db.sessions[sid]) {
    delete db.sessions[sid];
    saveDatabase(db);
  }
}

export function getActiveSession(req: IncomingAuthRequest): SessionData | null {
  const sid = extractSessionId(req);
  if (!sid) return null;
  const db = loadDatabase();
  const sess = db.sessions?.[sid];
  if (sess) {
    if (Date.now() - sess.lastActivity > SESSION_TIMEOUT_MS) {
      deleteSession(sid);
      return null;
    }
    sess.lastActivity = Date.now();
    return sess;
  }
  // Fallback to signed stateless token verification (essential for Vercel serverless instances)
  const verified = verifySignedSessionToken(sid);
  if (verified) {
    return verified;
  }
  return null;
}

export function getAdminSession(req: IncomingAuthRequest): SessionData | null {
  const sess = getActiveSession(req);
  if (!sess || sess.role !== 'admin') return null;
  return sess;
}

export interface ApiHandlerResult {
  status: number;
  headers?: Record<string, string>;
  body: Record<string, unknown>;
}

/**
 * Portable request processor for /api/auth.php & /api/auth
 */
export function processAuthRequest(req: IncomingAuthRequest): ApiHandlerResult {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') {
    return {
      status: 200,
      headers: {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token, X-Customer-Vault, X-CSRF-Token',
      },
      body: { success: true },
    };
  }

  const action = String(req.query?.action || '').trim();
  const body = (req.body || {}) as Record<string, unknown>;
  const db = loadDatabase();
  if (!Array.isArray(db.customers)) {
    db.customers = [];
  }

  // Hydrate any server-signed customer vault tokens provided by the client or cookie
  // so cold-started Vercel serverless containers remain in sync with registered customers
  const vaultHeader = getHeader(req.headers, 'x-customer-vault');
  const cookies = parseCookies(getHeader(req.headers, 'cookie'));
  const vaultCookie = cookies['MGC_CVAULT'] || '';
  const bodyVaultTokens = Array.isArray(body.customerVaultTokens)
    ? (body.customerVaultTokens as unknown[]).map((t) => String(t || ''))
    : [];
  const candidateVaultTokens = [
    ...vaultHeader.split(',').map((s) => s.trim()),
    vaultCookie.trim(),
    ...bodyVaultTokens,
  ].filter(Boolean);

  let vaultHydrated = false;
  for (const vToken of candidateVaultTokens) {
    const verifiedCustomer = verifySignedCustomerVaultToken(vToken);
    if (
      verifiedCustomer &&
      !db.customers.some((c) => c.email.toLowerCase() === verifiedCustomer.email.toLowerCase())
    ) {
      db.customers.push(verifiedCustomer);
      vaultHydrated = true;
    }
  }
  if (vaultHydrated) {
    saveDatabase(db);
  }

  if (method === 'GET' && action === 'check') {
    const sess = getActiveSession(req);
    const activeSid = extractSessionId(req) || '';
    if (sess && sess.role === 'admin') {
      return {
        status: 200,
        body: {
          success: true,
          authenticated: true,
          role: 'admin',
          admin: { id: sess.userId, email: sess.email },
          user: { id: sess.userId, email: sess.email, role: 'admin' },
          csrfToken: sess.csrfToken,
          sessionToken: activeSid,
        },
      };
    }
    if (sess && sess.role === 'customer') {
      return {
        status: 200,
        body: {
          success: true,
          authenticated: false,
          customerAuthenticated: true,
          role: 'customer',
          user: {
            id: sess.userId,
            fullName: sess.fullName || '',
            email: sess.email,
            role: 'customer',
          },
          csrfToken: sess.csrfToken,
          sessionToken: activeSid,
        },
      };
    }
    return {
      status: 200,
      body: {
        success: true,
        authenticated: false,
        customerAuthenticated: false,
        role: null,
        csrfToken: '',
      },
    };
  }

  if (method === 'POST' && action === 'register') {
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const confirmPassword = String(body.confirmPassword || '');

    if (!fullName) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'Please enter your full name.',
          error: 'Please enter your full name.',
        },
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'Please enter a valid email address.',
          error: 'Please enter a valid email address.',
        },
      };
    }

    if (!password) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'Please enter a password.',
          error: 'Please enter a password.',
        },
      };
    }

    if (password.length < 6) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'Password must be at least 6 characters long.',
          error: 'Password must be at least 6 characters long.',
        },
      };
    }

    if (password !== confirmPassword) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'Passwords do not match.',
          error: 'Passwords do not match.',
        },
      };
    }

    const emailExistsInCustomers = db.customers.some((c) => c.email.toLowerCase() === email);
    const emailExistsInAdmins = db.admins.some((a) => a.email.toLowerCase() === email);

    if (emailExistsInCustomers || emailExistsInAdmins) {
      return {
        status: 409,
        body: {
          success: false,
          message: 'An account with this email already exists.',
          error: 'An account with this email already exists.',
        },
      };
    }

    const passData = hashPassword(password);
    const nextId =
      db.customers.length > 0 ? Math.max(...db.customers.map((c) => c.id)) + 1 : 1;

    const newCustomer: CustomerAccount = {
      id: nextId,
      fullName,
      email,
      role: 'customer',
      passwordSalt: passData.salt,
      passwordHash: passData.hash,
      createdAt: new Date().toISOString(),
    };

    db.customers.push(newCustomer);
    saveDatabase(db);

    const csrfToken = crypto.randomBytes(24).toString('hex');
    const sessionPayload: SessionData = {
      userId: newCustomer.id,
      fullName: newCustomer.fullName,
      email: newCustomer.email,
      role: 'customer',
      csrfToken,
      lastActivity: Date.now(),
    };
    const sid = createSignedSessionToken(sessionPayload);
    const customerVaultToken = createSignedCustomerVaultToken(newCustomer);
    saveSession(sid, sessionPayload);

    return {
      status: 200,
      headers: {
        'Set-Cookie': buildSessionCookieHeader(req, sid, 86400),
      },
      body: {
        success: true,
        message: 'Account created successfully.',
        authenticated: false,
        customerAuthenticated: true,
        role: 'customer',
        user: {
          id: newCustomer.id,
          fullName: newCustomer.fullName,
          email: newCustomer.email,
          role: 'customer',
        },
        csrfToken,
        sessionToken: sid,
        customerVaultToken,
      },
    };
  }

  if (method === 'POST' && action === 'login') {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'Please enter both email and password.',
          error: 'Please enter both email and password.',
        },
      };
    }

    // 1. Check if credentials belong to an authorized admin
    const admin = db.admins.find((a) => a.email.toLowerCase() === email);
    if (admin && verifyPassword(password, admin.passwordSalt, admin.passwordHash)) {
      const csrfToken = crypto.randomBytes(24).toString('hex');
      const sessionPayload: SessionData = {
        userId: admin.id,
        adminId: admin.id,
        email: admin.email,
        role: 'admin',
        csrfToken,
        lastActivity: Date.now(),
      };
      const sid = createSignedSessionToken(sessionPayload);
      saveSession(sid, sessionPayload);

      return {
        status: 200,
        headers: {
          'Set-Cookie': buildSessionCookieHeader(req, sid, 86400),
        },
        body: {
          success: true,
          authenticated: true,
          role: 'admin',
          admin: { id: admin.id, email: admin.email },
          user: { id: admin.id, email: admin.email, role: 'admin' },
          csrfToken,
          sessionToken: sid,
        },
      };
    }

    // 2. Check if credentials belong to a registered customer
    const customer = db.customers.find((c) => c.email.toLowerCase() === email);
    if (customer && verifyPassword(password, customer.passwordSalt, customer.passwordHash)) {
      const csrfToken = crypto.randomBytes(24).toString('hex');
      const sessionPayload: SessionData = {
        userId: customer.id,
        fullName: customer.fullName,
        email: customer.email,
        role: 'customer',
        csrfToken,
        lastActivity: Date.now(),
      };
      const sid = createSignedSessionToken(sessionPayload);
      const customerVaultToken = createSignedCustomerVaultToken(customer);
      saveSession(sid, sessionPayload);

      return {
        status: 200,
        headers: {
          'Set-Cookie': buildSessionCookieHeader(req, sid, 86400),
        },
        body: {
          success: true,
          authenticated: false,
          customerAuthenticated: true,
          role: 'customer',
          user: {
            id: customer.id,
            fullName: customer.fullName,
            email: customer.email,
            role: 'customer',
          },
          csrfToken,
          sessionToken: sid,
          customerVaultToken,
        },
      };
    }

    return {
      status: 401,
      body: {
        success: false,
        message: 'Invalid email or password.',
        error: 'Invalid email or password.',
      },
    };
  }

  if (method === 'POST' && action === 'logout') {
    const sid = extractSessionId(req);
    if (sid) {
      deleteSession(sid);
    }
    return {
      status: 200,
      headers: {
        'Set-Cookie': buildSessionCookieHeader(req, '', 0),
      },
      body: {
        success: true,
        authenticated: false,
        customerAuthenticated: false,
      },
    };
  }

  if (method === 'POST' && action === 'change_password') {
    const sess = getAdminSession(req);
    if (!sess) {
      return {
        status: 401,
        body: {
          success: false,
          authenticated: false,
          message: 'Unauthorized. Admin authentication required.',
          error: 'Unauthorized. Admin authentication required.',
        },
      };
    }

    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    const confirmPassword = String(
      body.confirmNewPassword ?? body.confirmPassword ?? ''
    );

    if (!currentPassword) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'Please enter your current password.',
          error: 'Please enter your current password.',
        },
      };
    }

    if (!newPassword) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'Please enter a new password.',
          error: 'Please enter a new password.',
        },
      };
    }

    if (newPassword.length < 6) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'New password must be at least 6 characters long.',
          error: 'New password must be at least 6 characters long.',
        },
      };
    }

    if (newPassword !== confirmPassword) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'New passwords do not match.',
          error: 'New passwords do not match.',
        },
      };
    }

    const adminIdx = db.admins.findIndex(
      (a) =>
        a.id === (sess.adminId ?? sess.userId) ||
        a.email.toLowerCase() === sess.email.toLowerCase()
    );
    if (
      adminIdx === -1 ||
      !verifyPassword(
        currentPassword,
        db.admins[adminIdx].passwordSalt,
        db.admins[adminIdx].passwordHash
      )
    ) {
      return {
        status: 401,
        body: {
          success: false,
          message: 'Current password is incorrect.',
          error: 'Current password is incorrect.',
        },
      };
    }

    const updatedHash = hashPassword(newPassword);
    db.admins[adminIdx].passwordSalt = updatedHash.salt;
    db.admins[adminIdx].passwordHash = updatedHash.hash;
    db.admins[adminIdx].updatedAt = new Date().toISOString();
    saveDatabase(db);

    return {
      status: 200,
      body: {
        success: true,
        message: 'Password updated successfully.',
      },
    };
  }

  return {
    status: 400,
    body: {
      success: false,
      message: 'Invalid auth action.',
      error: 'Invalid auth action.',
    },
  };
}

/**
 * Portable request processor for /api/categories.php & /api/categories
 */
export function processCategoriesRequest(req: IncomingAuthRequest): ApiHandlerResult {
  const method = (req.method || 'GET').toUpperCase();
  const body = (req.body || {}) as Record<string, unknown>;
  const db = loadDatabase();

  if (method === 'GET') {
    return { status: 200, body: { success: true, categories: db.categories } };
  }

  if (method === 'POST') {
    const sess = getAdminSession(req);
    if (!sess) {
      return { status: 401, body: { success: false, error: 'Unauthorized.' } };
    }

    const name = String(body.name || '').trim();
    const subtitle = String(
      body.subtitle || 'Curated collection at Malik G Collection'
    ).trim();
    if (!name) {
      return { status: 400, body: { success: false, error: 'Category name is required.' } };
    }

    if (db.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return { status: 400, body: { success: false, error: 'Category already exists.' } };
    }

    const newCat: CategoryRecord = {
      id: db.categories.length + 1,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      subtitle,
    };
    db.categories.push(newCat);
    saveDatabase(db);
    return { status: 200, body: { success: true, category: newCat } };
  }

  return { status: 405, body: { success: false, error: 'Method not allowed.' } };
}

/**
 * Portable request processor for /api/products.php & /api/products
 */
export function processProductsRequest(req: IncomingAuthRequest): ApiHandlerResult {
  const method = (req.method || 'GET').toUpperCase();
  const action = String(req.query?.action || 'list').trim();
  const body = (req.body || {}) as Record<string, unknown>;
  const db = loadDatabase();

  if (method === 'GET') {
    const isAdminReq = String(req.query?.admin || '') === '1';
    if (isAdminReq && !getAdminSession(req)) {
      return {
        status: 401,
        body: {
          success: false,
          authenticated: false,
          error: 'Unauthorized. Owner authentication required.',
        },
      };
    }

    const list = isAdminReq
      ? db.products
      : db.products.filter((p) => p.published !== false);

    return { status: 200, body: { success: true, products: list } };
  }

  if (method === 'POST') {
    const sess = getAdminSession(req);
    if (!sess) {
      return {
        status: 401,
        body: {
          success: false,
          authenticated: false,
          error: 'Unauthorized. Owner authentication required.',
        },
      };
    }

    if (action === 'create' || action === 'update') {
      const name = String(body.name || body.title || '').trim();
      const description = String(body.description || '').trim();
      const shortDescription =
        String(body.shortDescription || '').trim() || description.slice(0, 140);
      const category = String(body.category || 'Shirts').trim();
      const image = String(body.image || '').trim();
      const originalPrice = Number(body.originalPrice || 0);
      const rawOffer = body.offerPrice;
      const offerPrice =
        rawOffer !== null && rawOffer !== undefined && rawOffer !== '' && Number(rawOffer) > 0
          ? Number(rawOffer)
          : null;

      if (!name || !description || !image || originalPrice <= 0) {
        return {
          status: 400,
          body: {
            success: false,
            error: 'Title, description, image, and valid original price are required.',
          },
        };
      }

      const effectivePrice =
        offerPrice !== null && offerPrice < originalPrice ? offerPrice : originalPrice;
      const oldPrice =
        offerPrice !== null && offerPrice < originalPrice ? originalPrice : undefined;
      const discountPercent =
        oldPrice && oldPrice > effectivePrice
          ? Math.round(((oldPrice - effectivePrice) / oldPrice) * 100)
          : 0;

      const colors: { name: string; hex: string }[] = Array.isArray(body.colors)
        ? body.colors
            .map((c: unknown) => {
              if (typeof c === 'string') return { name: c.trim(), hex: '#18181B' };
              if (c && typeof c === 'object' && 'name' in c) {
                return {
                  name: String((c as { name: string }).name).trim(),
                  hex: String((c as { hex?: string }).hex || '#18181B'),
                };
              }
              return null;
            })
            .filter((c): c is { name: string; hex: string } => Boolean(c && c.name))
        : [];

      const sizes: string[] = Array.isArray(body.sizes)
        ? body.sizes.map((s: unknown) => String(s).trim()).filter(Boolean)
        : [];

      const inStock = body.inStock !== undefined ? Boolean(body.inStock) : true;
      const published = body.published !== undefined ? Boolean(body.published) : true;
      const isNewArrival = body.isNewArrival !== undefined ? Boolean(body.isNewArrival) : true;
      const isTrending = body.isTrending !== undefined ? Boolean(body.isTrending) : false;
      const fabricOrMaterial =
        String(body.fabricOrMaterial || '').trim() || 'Premium Malik G Selection';

      if (!db.categories.some((c) => c.name.toLowerCase() === category.toLowerCase())) {
        db.categories.push({
          id: db.categories.length + 1,
          name: category,
          slug: category.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          subtitle: 'Curated collection at Malik G Collection',
        });
      }

      if (action === 'create') {
        const newProd: Product = {
          dbId: db.products.length + 1,
          id: `mg-prod-${Date.now()}`,
          sku: `MGC-${category.slice(0, 2).toUpperCase()}-${Math.floor(
            1000 + Math.random() * 9000
          )}`,
          name,
          shortDescription,
          description,
          category,
          image,
          gallery: [image],
          price: effectivePrice,
          oldPrice,
          originalPrice,
          offerPrice,
          discountPercent,
          colors,
          sizes,
          inStock,
          published,
          isNewArrival,
          isTrending,
          fabricOrMaterial,
          rating: 4.9,
          reviewsCount: 18,
          tags: [category.toLowerCase(), name.toLowerCase()],
          createdAt: new Date().toISOString(),
        };
        db.products.unshift(newProd);
        saveDatabase(db);
        return { status: 200, body: { success: true, product: newProd } };
      } else {
        const idx = db.products.findIndex((p) => p.id === body.id);
        if (idx === -1) {
          return { status: 404, body: { success: false, error: 'Product not found.' } };
        }
        const updated: Product = {
          ...db.products[idx],
          name,
          shortDescription,
          description,
          category,
          image,
          gallery: [image],
          price: effectivePrice,
          oldPrice,
          originalPrice,
          offerPrice,
          discountPercent,
          colors,
          sizes,
          inStock,
          published,
          isNewArrival,
          isTrending,
          fabricOrMaterial,
        };
        db.products[idx] = updated;
        saveDatabase(db);
        return { status: 200, body: { success: true, product: updated } };
      }
    }

    if (action === 'delete') {
      const id = String(body.id || '');
      db.products = db.products.filter((p) => p.id !== id);
      saveDatabase(db);
      return { status: 200, body: { success: true } };
    }

    if (action === 'toggle_publish') {
      const id = String(body.id || '');
      const idx = db.products.findIndex((p) => p.id === id);
      if (idx !== -1) {
        db.products[idx].published = Boolean(body.published);
        saveDatabase(db);
      }
      return { status: 200, body: { success: true } };
    }

    if (action === 'toggle_stock') {
      const id = String(body.id || '');
      const idx = db.products.findIndex((p) => p.id === id);
      if (idx !== -1) {
        db.products[idx].inStock = Boolean(body.inStock);
        saveDatabase(db);
      }
      return { status: 200, body: { success: true } };
    }
  }

  return { status: 400, body: { success: false, error: 'Invalid products action.' } };
}

/**
 * Portable request processor for /api/orders.php & /api/orders
 */
export function processOrdersRequest(req: IncomingAuthRequest): ApiHandlerResult {
  const method = (req.method || 'GET').toUpperCase();
  const action = String(req.query?.action || '').trim();
  const body = (req.body || {}) as Record<string, unknown>;
  const db = loadDatabase();

  if (method === 'GET') {
    if (!getAdminSession(req)) {
      return {
        status: 401,
        body: {
          success: false,
          authenticated: false,
          message: 'Unauthorized. Owner authentication required.',
          error: 'Unauthorized. Owner authentication required.',
        },
      };
    }

    const singleOrderId = String(
      req.query?.order_id || req.query?.orderNumber || ''
    ).trim();
    if (singleOrderId) {
      const found = db.orders.find(
        (o) => o.orderNumber.toLowerCase() === singleOrderId.toLowerCase()
      );
      if (!found) {
        return {
          status: 404,
          body: {
            success: false,
            message: 'Order not found.',
            error: 'Order not found.',
          },
        };
      }
      return {
        status: 200,
        body: {
          success: true,
          order: {
            ...found,
            paymentMethod: found.paymentMethod || 'WhatsApp Order',
          },
        },
      };
    }

    const statusFilter = String(req.query?.status || '').trim();
    const search = String(req.query?.search || '').trim().toLowerCase();

    let list = db.orders.map((o) => ({
      ...o,
      paymentMethod: o.paymentMethod || 'WhatsApp Order',
    }));

    if (statusFilter && statusFilter !== 'All') {
      list = list.filter((o) => o.status === statusFilter);
    }
    if (search) {
      list = list.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(search) ||
          o.customer.fullName.toLowerCase().includes(search) ||
          o.customer.phone.toLowerCase().includes(search)
      );
    }

    return { status: 200, body: { success: true, orders: list } };
  }

  if (method === 'POST') {
    if (action === 'update_status') {
      if (!getAdminSession(req)) {
        return {
          status: 401,
          body: {
            success: false,
            message: 'Unauthorized. Owner authentication required.',
            error: 'Unauthorized. Owner authentication required.',
          },
        };
      }
      const orderNumber = String(body.orderNumber || body.order_id || '').trim();
      const status = body.status as OrderStatusType;
      const allowed: OrderStatusType[] = [
        'Pending',
        'Confirmed',
        'Processing',
        'Shipped',
        'Delivered',
        'Cancelled',
      ];
      if (!orderNumber || !allowed.includes(status)) {
        return {
          status: 400,
          body: {
            success: false,
            message: 'Invalid order number or status.',
            error: 'Invalid order number or status.',
          },
        };
      }

      const idx = db.orders.findIndex((o) => o.orderNumber === orderNumber);
      if (idx === -1) {
        return {
          status: 404,
          body: {
            success: false,
            message: 'Order not found.',
            error: 'Order not found.',
          },
        };
      }
      db.orders[idx].status = status;
      db.orders[idx].updatedAt = new Date().toISOString();
      if (!db.orders[idx].paymentMethod) {
        db.orders[idx].paymentMethod = 'WhatsApp Order';
      }
      saveDatabase(db);
      return {
        status: 200,
        body: {
          success: true,
          message: `Order ${orderNumber} status updated to ${status}.`,
          orderNumber,
          status,
          order: db.orders[idx],
        },
      };
    }

    const customer = (body.customer || {}) as Record<string, unknown>;
    const items = Array.isArray(body.items) ? body.items : [];

    const fullName = String(customer.fullName || '').trim();
    const phone = String(customer.phone || '').trim();
    const email = String(customer.email || '').trim();
    const city = String(customer.city || '').trim();
    const address = String(customer.address || '').trim();
    const notes = String(customer.notes || '').trim();

    if (!fullName || !phone || !email || !city || !address) {
      return {
        status: 400,
        body: {
          success: false,
          error:
            'Full Name, Phone Number, Gmail/Email, Location/City, and Full Address are all required.',
        },
      };
    }

    if (items.length === 0) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Your shopping cart cannot be empty.',
        },
      };
    }

    let orderNumber = `MGC-${Math.floor(100000 + Math.random() * 900000)}`;
    while (db.orders.some((o) => o.orderNumber === orderNumber)) {
      orderNumber = `MGC-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    const orderItems: OrderItemSnapshot[] = [];
    let totalAmount = 0;
    let totalDiscount = 0;

    for (const item of items) {
      const prod = item.product || {};
      const dbProd = db.products.find((p) => p.id === prod.id);
      const qty = Math.max(1, Number(item.quantity || 1));

      const unitPrice = dbProd ? Number(dbProd.price) : Number(prod.price || 0);
      const origPrice = dbProd
        ? Number(dbProd.oldPrice || dbProd.originalPrice || unitPrice)
        : Number(prod.oldPrice || prod.originalPrice || unitPrice);
      const lineSubtotal = unitPrice * qty;
      totalAmount += lineSubtotal;
      if (origPrice > unitPrice) {
        totalDiscount += (origPrice - unitPrice) * qty;
      }

      orderItems.push({
        productId: dbProd ? dbProd.id : String(prod.id || ''),
        productNameSnapshot: dbProd ? dbProd.name : String(prod.name || 'Malik G Product'),
        productImageSnapshot: dbProd ? dbProd.image : String(prod.image || ''),
        selectedColor: String(item.selectedColor || 'Standard'),
        selectedSize: String(item.selectedSize || 'N/A'),
        quantity: qty,
        unitPrice,
        originalPriceSnapshot: origPrice,
        subtotal: lineSubtotal,
      });
    }

    const nowIso = new Date().toISOString();
    const newOrder: Order = {
      id: db.orders.length + 1,
      orderNumber,
      createdAt: nowIso,
      updatedAt: nowIso,
      customer: {
        fullName,
        phone,
        email,
        city,
        address,
        notes: notes || undefined,
      },
      items,
      orderItems,
      subtotal: totalAmount,
      discount: totalDiscount,
      total: totalAmount,
      status: 'Pending',
      paymentMethod: 'WhatsApp Order',
    };

    db.orders.unshift(newOrder);
    saveDatabase(db);

    return {
      status: 200,
      body: {
        success: true,
        message: 'Order created successfully',
        order_id: orderNumber,
        order: newOrder,
      },
    };
  }

  return {
    status: 405,
    body: {
      success: false,
      message: 'Method not allowed.',
      error: 'Method not allowed.',
    },
  };
}

/**
 * Portable request processor for /api/upload.php & /api/upload
 */
export function processUploadRequest(req: IncomingAuthRequest): ApiHandlerResult {
  if (!getAdminSession(req)) {
    return {
      status: 401,
      body: {
        success: false,
        authenticated: false,
        message: 'Unauthorized. Owner authentication required.',
        error: 'Unauthorized. Owner authentication required.',
      },
    };
  }
  const body = (req.body || {}) as Record<string, unknown>;
  const dataUrl = String(body.dataUrl || '');
  if (dataUrl.startsWith('data:image/')) {
    return { status: 200, body: { success: true, url: dataUrl } };
  }
  return { status: 200, body: { success: true, url: '/uploads/category_shirts.jpg' } };
}

/**
 * Portable request processor for /api/dashboard.php & /api/dashboard
 */
export function processDashboardRequest(req: IncomingAuthRequest): ApiHandlerResult {
  if (!getAdminSession(req)) {
    return {
      status: 401,
      body: {
        success: false,
        authenticated: false,
        error: 'Unauthorized. Owner authentication required.',
      },
    };
  }

  const db = loadDatabase();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const dayOfWeek = now.getDay() || 7;
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - dayOfWeek + 1);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let pendingOrders = 0;
  let confirmedOrders = 0;
  let processingOrders = 0;
  let shippedOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let totalRevenue = 0;
  let deliveredRevenue = 0;
  let pendingOrderValue = 0;

  let todaySales = 0;
  let todayOrders = 0;
  let weekSales = 0;
  let weekOrders = 0;
  let monthSales = 0;
  let monthOrders = 0;

  for (const o of db.orders) {
    const amt = Number(o.total || 0);
    const createdDate = new Date(o.createdAt);

    if (o.status === 'Pending') {
      pendingOrders++;
      pendingOrderValue += amt;
    } else if (o.status === 'Confirmed') {
      confirmedOrders++;
    } else if (o.status === 'Processing') {
      processingOrders++;
    } else if (o.status === 'Shipped') {
      shippedOrders++;
    } else if (o.status === 'Delivered') {
      deliveredOrders++;
      deliveredRevenue += amt;
    } else if (o.status === 'Cancelled') {
      cancelledOrders++;
    }

    if (o.status !== 'Cancelled') {
      totalRevenue += amt;

      if (o.createdAt.slice(0, 10) === todayStr) {
        todaySales += amt;
        todayOrders++;
      }
      if (createdDate >= startOfWeek) {
        weekSales += amt;
        weekOrders++;
      }
      if (createdDate >= startOfMonth) {
        monthSales += amt;
        monthOrders++;
      }
    }
  }

  const totalProducts = db.products.length;
  const outOfStockProducts = db.products.filter((p) => !p.inStock).length;
  const publishedProducts = db.products.filter((p) => p.published !== false).length;

  return {
    status: 200,
    body: {
      success: true,
      stats: {
        totalOrders: db.orders.length,
        pendingOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalProducts,
        outOfStockProducts,
        publishedProducts,
        totalRevenue,
        deliveredRevenue,
        pendingOrderValue,
        periods: {
          today: { sales: todaySales, orders: todayOrders },
          thisWeek: { sales: weekSales, orders: weekOrders },
          thisMonth: { sales: monthSales, orders: monthOrders },
          allTime: { sales: totalRevenue, orders: db.orders.length },
        },
      },
    },
  };
}
