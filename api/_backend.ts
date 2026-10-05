import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { INITIAL_PRODUCTS } from '../src/data/products';
import { Product, Order, OrderStatusType, OrderItemSnapshot } from '../src/types';

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
  const action = String(req.query?.action || '').trim();
  const body = (req.body || {}) as Record<string, unknown>;
  const db = loadDatabase();
  if (!Array.isArray(db.customers)) {
    db.customers = [];
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
