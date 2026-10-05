import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { INITIAL_PRODUCTS } from './src/data/products';
import { Product, Order, OrderStatusType, OrderItemSnapshot } from './src/types';

const app = express();
const httpServer = http.createServer(app);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const DATA_DIR = path.resolve(process.cwd(), '.runtime_db');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'malik_g_mysql_mirror.json');

interface AdminAccount {
  id: number;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  updatedAt: string;
}

interface CategoryRecord {
  id: number;
  name: string;
  slug: string;
  subtitle: string;
}

interface DatabaseSchema {
  admins: AdminAccount[];
  categories: CategoryRecord[];
  products: Product[];
  orders: Order[];
}

function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { salt: actualSalt, hash };
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
        // Ensure seed products reflect the current Original Price -> 20% OFF Offer Price calculation unless custom edited by Admin
        let updated = false;
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
        return parsed;
      }
    }
  } catch {
    // initialize fresh
  }

  const defaultPass = hashPassword('MalikG@2026');
  const initialDb: DatabaseSchema = {
    admins: [
      {
        id: 1,
        email: 'abdurrehmanadil91@gmail.com',
        passwordSalt: defaultPass.salt,
        passwordHash: defaultPass.hash,
        updatedAt: new Date().toISOString(),
      },
    ],
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

function saveDatabase(db: DatabaseSchema): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// Session store for active owner sessions
interface SessionData {
  adminId: number;
  email: string;
  csrfToken: string;
  lastActivity: number;
}

const SESSIONS = new Map<string, SessionData>();
const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

function parseCookies(cookieHeader?: string): Record<string, string> {
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

function getAdminSession(req: express.Request): SessionData | null {
  const cookies = parseCookies(req.headers.cookie);
  const sid = cookies['MGC_SESSID'];
  if (!sid) return null;
  const sess = SESSIONS.get(sid);
  if (!sess) return null;
  if (Date.now() - sess.lastActivity > SESSION_TIMEOUT_MS) {
    SESSIONS.delete(sid);
    return null;
  }
  sess.lastActivity = Date.now();
  return sess;
}

// ============================================================================
// 1. /api/auth.php
// ============================================================================
app.all('/api/auth.php', (req, res) => {
  const action = (req.query.action as string) || '';
  const db = loadDatabase();

  if (req.method === 'GET' && action === 'check') {
    const sess = getAdminSession(req);
    if (sess) {
      return res.json({
        success: true,
        authenticated: true,
        admin: { id: sess.adminId, email: sess.email },
        csrfToken: sess.csrfToken,
      });
    }
    return res.json({
      success: true,
      authenticated: false,
      csrfToken: '',
    });
  }

  if (req.method === 'POST' && action === 'login') {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter both email and password.',
        error: 'Please enter both email and password.',
      });
    }

    const admin = db.admins.find((a) => a.email.toLowerCase() === email);
    if (!admin || !verifyPassword(password, admin.passwordSalt, admin.passwordHash)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        error: 'Invalid email or password.',
      });
    }

    const sid = crypto.randomBytes(24).toString('hex');
    const csrfToken = crypto.randomBytes(24).toString('hex');
    SESSIONS.set(sid, {
      adminId: admin.id,
      email: admin.email,
      csrfToken,
      lastActivity: Date.now(),
    });

    res.setHeader(
      'Set-Cookie',
      `MGC_SESSID=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7200`
    );

    return res.json({
      success: true,
      authenticated: true,
      admin: { id: admin.id, email: admin.email },
      csrfToken,
    });
  }

  if (req.method === 'POST' && action === 'logout') {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies['MGC_SESSID']) {
      SESSIONS.delete(cookies['MGC_SESSID']);
    }
    res.setHeader('Set-Cookie', 'MGC_SESSID=; Path=/; HttpOnly; Max-Age=0');
    return res.json({ success: true, authenticated: false });
  }

  if (req.method === 'POST' && action === 'change_password') {
    const sess = getAdminSession(req);
    if (!sess) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'Unauthorized. Owner authentication required.',
      });
    }

    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    const confirmPassword = String(req.body?.confirmPassword || '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'All password fields are required.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long.',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password and confirmation do not match.',
      });
    }

    const adminIdx = db.admins.findIndex((a) => a.id === sess.adminId);
    if (
      adminIdx === -1 ||
      !verifyPassword(
        currentPassword,
        db.admins[adminIdx].passwordSalt,
        db.admins[adminIdx].passwordHash
      )
    ) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect.',
      });
    }

    const updatedHash = hashPassword(newPassword);
    db.admins[adminIdx].passwordSalt = updatedHash.salt;
    db.admins[adminIdx].passwordHash = updatedHash.hash;
    db.admins[adminIdx].updatedAt = new Date().toISOString();
    saveDatabase(db);

    return res.json({
      success: true,
      message: 'Owner password updated successfully. Your old password is no longer valid.',
    });
  }

  return res.status(400).json({ success: false, error: 'Invalid auth action.' });
});

// ============================================================================
// 2. /api/categories.php
// ============================================================================
app.all('/api/categories.php', (req, res) => {
  const db = loadDatabase();

  if (req.method === 'GET') {
    return res.json({ success: true, categories: db.categories });
  }

  if (req.method === 'POST') {
    const sess = getAdminSession(req);
    if (!sess) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const name = String(req.body?.name || '').trim();
    const subtitle = String(req.body?.subtitle || 'Curated collection at Malik G Collection').trim();
    if (!name) {
      return res.status(400).json({ success: false, error: 'Category name is required.' });
    }

    if (db.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Category already exists.' });
    }

    const newCat: CategoryRecord = {
      id: db.categories.length + 1,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      subtitle,
    };
    db.categories.push(newCat);
    saveDatabase(db);
    return res.json({ success: true, category: newCat });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed.' });
});

// ============================================================================
// 3. /api/products.php
// ============================================================================
app.all('/api/products.php', (req, res) => {
  const db = loadDatabase();
  const action = (req.query.action as string) || 'list';

  if (req.method === 'GET') {
    const isAdminReq = req.query.admin === '1';
    if (isAdminReq && !getAdminSession(req)) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'Unauthorized. Owner authentication required.',
      });
    }

    const list = isAdminReq
      ? db.products
      : db.products.filter((p) => p.published !== false);

    return res.json({ success: true, products: list });
  }

  if (req.method === 'POST') {
    const sess = getAdminSession(req);
    if (!sess) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'Unauthorized. Owner authentication required.',
      });
    }

    const body = req.body || {};

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
        return res.status(400).json({
          success: false,
          error: 'Title, description, image, and valid original price are required.',
        });
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

      // Ensure category exists
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
          sku: `MGC-${category.slice(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
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
        return res.json({ success: true, product: newProd });
      } else {
        const idx = db.products.findIndex((p) => p.id === body.id);
        if (idx === -1) {
          return res.status(404).json({ success: false, error: 'Product not found.' });
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
        return res.json({ success: true, product: updated });
      }
    }

    if (action === 'delete') {
      const id = String(body.id || '');
      db.products = db.products.filter((p) => p.id !== id);
      saveDatabase(db);
      return res.json({ success: true });
    }

    if (action === 'toggle_publish') {
      const id = String(body.id || '');
      const idx = db.products.findIndex((p) => p.id === id);
      if (idx !== -1) {
        db.products[idx].published = Boolean(body.published);
        saveDatabase(db);
      }
      return res.json({ success: true });
    }

    if (action === 'toggle_stock') {
      const id = String(body.id || '');
      const idx = db.products.findIndex((p) => p.id === id);
      if (idx !== -1) {
        db.products[idx].inStock = Boolean(body.inStock);
        saveDatabase(db);
      }
      return res.json({ success: true });
    }
  }

  return res.status(400).json({ success: false, error: 'Invalid products action.' });
});

// ============================================================================
// 4. /api/orders.php
// ============================================================================
app.all('/api/orders.php', (req, res) => {
  const db = loadDatabase();
  const action = (req.query.action as string) || '';

  if (req.method === 'GET') {
    if (!getAdminSession(req)) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'Unauthorized. Owner authentication required.',
      });
    }

    const statusFilter = String(req.query.status || '').trim();
    const search = String(req.query.search || '').trim().toLowerCase();

    let list = [...db.orders];
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

    return res.json({ success: true, orders: list });
  }

  if (req.method === 'POST') {
    const body = req.body || {};

    if (action === 'update_status') {
      if (!getAdminSession(req)) {
        return res.status(401).json({ success: false, error: 'Unauthorized.' });
      }
      const orderNumber = String(body.orderNumber || '');
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
        return res.status(400).json({ success: false, error: 'Invalid status.' });
      }

      const idx = db.orders.findIndex((o) => o.orderNumber === orderNumber);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Order not found.' });
      }
      db.orders[idx].status = status;
      db.orders[idx].updatedAt = new Date().toISOString();
      saveDatabase(db);
      return res.json({ success: true, orderNumber, status });
    }

    // PUBLIC ORDER PLACEMENT
    const customer = body.customer || {};
    const items = Array.isArray(body.items) ? body.items : [];

    const fullName = String(customer.fullName || '').trim();
    const phone = String(customer.phone || '').trim();
    const email = String(customer.email || '').trim();
    const city = String(customer.city || '').trim();
    const address = String(customer.address || '').trim();
    const notes = String(customer.notes || '').trim();

    if (!fullName || !phone || !email || !city || !address) {
      return res.status(400).json({
        success: false,
        error:
          'Full Name, Phone Number, Gmail/Email, Location/City, and Full Address are all required.',
      });
    }

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Your shopping cart cannot be empty.',
      });
    }

    // Generate unique MGC-XXXXXX
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
    };

    db.orders.unshift(newOrder);
    saveDatabase(db);

    return res.json({
      success: true,
      message: 'Order created successfully',
      order_id: orderNumber,
      order: newOrder,
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed.', error: 'Method not allowed.' });
});

// ============================================================================
// 4B. /api/upload.php
// ============================================================================
app.post('/api/upload.php', (req, res) => {
  if (!getAdminSession(req)) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      message: 'Unauthorized. Owner authentication required.',
      error: 'Unauthorized. Owner authentication required.',
    });
  }
  const dataUrl = String(req.body?.dataUrl || '');
  if (dataUrl.startsWith('data:image/')) {
    return res.json({ success: true, url: dataUrl });
  }
  return res.json({ success: true, url: '/uploads/category_shirts.jpg' });
});

// ============================================================================
// 5. /api/dashboard.php
// ============================================================================
app.get('/api/dashboard.php', (req, res) => {
  if (!getAdminSession(req)) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: 'Unauthorized. Owner authentication required.',
    });
  }

  const db = loadDatabase();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Start of current week (Monday)
  const dayOfWeek = now.getDay() || 7;
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - dayOfWeek + 1);

  // Start of current month
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

  return res.json({
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
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  // In the AI Studio preview environment, rewrite /admin/*.php to /admin so React Router renders the interactive Owner Admin Portal instead of serving raw .php files
  app.use((req, _res, next) => {
    if (req.path.startsWith('/admin/') && req.path.endsWith('.php')) {
      req.url = req.path.replace(/\.php$/, '') + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
    }
    next();
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr:
          process.env.DISABLE_HMR === 'true'
            ? false
            : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Malik G Collection Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
