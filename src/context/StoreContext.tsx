import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Product,
  CartItemType,
  Order,
  OrderCustomerDetails,
  ContactSubmission,
} from '../types';
import { BRAND_INFO, INITIAL_PRODUCTS, formatPKR } from '../data/products';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface AuthenticatedCustomer {
  id: number;
  fullName: string;
  email: string;
  role: 'customer';
}

interface StoreContextType {
  products: Product[];
  categories: string[];
  refreshCatalog: () => Promise<void>;
  customerUser: AuthenticatedCustomer | null;
  setCustomerSession: (user: AuthenticatedCustomer | null, sessionToken?: string) => void;
  refreshCustomerAuth: () => Promise<void>;
  logoutCustomer: () => Promise<void>;
  cart: CartItemType[];
  wishlist: string[];
  recentlyViewed: string[];
  orders: Order[];
  lastOrder: Order | null;
  savedCustomer: OrderCustomerDetails | null;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (product: Product | null) => void;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  addToCart: (
    product: Product,
    quantity?: number,
    selectedSize?: string,
    selectedColor?: string
  ) => boolean;
  updateCartQuantity: (
    productId: string,
    selectedSize: string | undefined,
    selectedColor: string | undefined,
    delta: number
  ) => void;
  removeFromCart: (
    productId: string,
    selectedSize?: string,
    selectedColor?: string
  ) => void;
  clearCart: () => void;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  addRecentlyViewed: (productId: string) => void;
  cartCount: number;
  cartSubtotal: number;
  cartDiscountTotal: number;
  grandTotal: number;
  placeOrder: (customer: OrderCustomerDetails) => Promise<{ order: Order; whatsappUrl: string }>;
  buildOrderWhatsAppUrl: (order: Order) => string;
  saveContactMessage: (submission: Omit<ContactSubmission, 'id' | 'createdAt'>) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CART: 'malik_g_cart_v2',
  WISHLIST: 'malik_g_wishlist_v2',
  RECENT: 'malik_g_recently_viewed_v2',
  ORDERS: 'malik_g_orders_v2',
  LAST_ORDER: 'malik_g_last_order_v2',
  CUSTOMER: 'malik_g_customer_v2',
  MESSAGES: 'malik_g_contact_messages_v2',
  SESSION_TOKEN: 'malik_g_session_token_v2',
  CUSTOMER_VAULT: 'malik_g_customer_vault_v1',
};

export function getStoredSessionToken(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN) || '';
  } catch {
    return '';
  }
}

export function setStoredSessionToken(token: string): void {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
    }
  } catch {
    // ignore storage errors
  }
}

export function getStoredCustomerVaultTokens(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMER_VAULT);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string' && Boolean(t)) : [];
  } catch {
    return [];
  }
}

export function addStoredCustomerVaultToken(token?: string): void {
  if (!token || typeof token !== 'string' || !token.startsWith('mgcv.')) return;
  try {
    const current = getStoredCustomerVaultTokens();
    if (!current.includes(token)) {
      const updated = [...current.slice(-19), token];
      localStorage.setItem(STORAGE_KEYS.CUSTOMER_VAULT, JSON.stringify(updated));
    }
  } catch {
    // ignore storage errors
  }
}

export function getAuthHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extraHeaders || {}) };
  const token = getStoredSessionToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Session-Token'] = token;
  }
  const vaultTokens = getStoredCustomerVaultTokens();
  if (vaultTokens.length > 0) {
    headers['X-Customer-Vault'] = vaultTokens.join(',');
  }
  return headers;
}

function resolveConfiguredApiBase(): string {
  const raw = String(
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || ''
  )
    .trim()
    .replace(/\/+$/, '');
  if (!raw) return '';
  const lower = raw.toLowerCase();
  // Never allow localhost, 127.0.0.1, or AI Studio preview URLs to override production API calls
  if (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('.run.app')
  ) {
    return '';
  }
  if (typeof window !== 'undefined' && window.location.hostname.toLowerCase().endsWith('.vercel.app')) {
    return '';
  }
  return raw;
}

const CONFIGURED_API_BASE = resolveConfiguredApiBase();

export function buildApiUrl(
  resource: 'auth' | 'orders' | 'products' | 'categories' | 'dashboard' | 'upload',
  query?: string,
  usePhpExtension = false
): string {
  const ext = usePhpExtension ? '.php' : '';
  const pathPart = `/api/${resource}${ext}${query ? (query.startsWith('?') ? query : `?${query}`) : ''}`;
  return CONFIGURED_API_BASE ? `${CONFIGURED_API_BASE}${pathPart}` : pathPart;
}

function isPhpSourceOrHtmlFallback(rawText: string): boolean {
  const trimmed = rawText.trim();
  return (
    trimmed.startsWith('<?php') ||
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.toLowerCase().startsWith('<html')
  );
}

function isVercelHostname(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.toLowerCase().endsWith('.vercel.app');
}

/**
 * Production-safe API fetch wrapper:
 * 1. Always calls `/api/<resource>` (e.g., `/api/auth?action=register`) on Vercel and AI Studio.
 * 2. Automatically attaches session & signed customer vault headers so serverless cold starts preserve accounts.
 * 3. Only retries `/api/<resource>.php` when NOT running on `.vercel.app` and the host is a legacy PHP server.
 */
export async function apiFetch(
  resource: 'auth' | 'orders' | 'products' | 'categories' | 'dashboard' | 'upload',
  query?: string,
  init?: RequestInit
): Promise<Response> {
  const mergedHeaders: Record<string, string> = getAuthHeaders();
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((v, k) => {
        mergedHeaders[k] = v;
      });
    } else if (Array.isArray(init.headers)) {
      for (const [k, v] of init.headers) {
        mergedHeaders[k] = v;
      }
    } else {
      Object.assign(mergedHeaders, init.headers as Record<string, string>);
    }
  }

  const finalInit: RequestInit = {
    ...init,
    headers: mergedHeaders,
  };

  const primaryUrl = buildApiUrl(resource, query, false);
  const res = await fetch(primaryUrl, finalInit);

  // Never request /api/*.php on Vercel deployments
  if (isVercelHostname()) {
    return res;
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (res.status === 404 || contentType.includes('text/html')) {
    const cloneText = await res.clone().text();
    if (res.status === 404 || isPhpSourceOrHtmlFallback(cloneText)) {
      const phpFallbackUrl = buildApiUrl(resource, query, true);
      const phpRes = await fetch(phpFallbackUrl, finalInit);
      const phpCloneText = await phpRes.clone().text();
      if (!isPhpSourceOrHtmlFallback(phpCloneText)) {
        return phpRes;
      }
    }
  }

  return res;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function safeJsonParse<T = Record<string, unknown>>(response: Response): Promise<T> {
  const rawText = await response.text();
  if (!rawText || !rawText.trim()) {
    throw new Error(`Server returned an empty response (HTTP ${response.status}).`);
  }
  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new Error(`Invalid JSON response from server (HTTP ${response.status}).`);
  }
}

export function buildWhatsAppOrderMessage(order: Order): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const lines: string[] = [
    'Hello Malik G Collection,',
    '',
    'I want to place an order.',
    '',
    `Order ID: ${order.orderNumber}`,
    '',
    'Customer Information:',
    `Name: ${order.customer.fullName}`,
    `Phone: ${order.customer.phone}`,
    `Email: ${order.customer.email}`,
    `Location: ${order.customer.city}`,
    `Address: ${order.customer.address}`,
  ];

  if (order.customer.notes) {
    lines.push(`Note: ${order.customer.notes}`);
  }

  lines.push('', 'Order:');

  const snapshots = order.orderItems && order.orderItems.length > 0
    ? order.orderItems
    : order.items.map((item) => ({
        productId: item.product.id,
        productNameSnapshot: item.product.name,
        productImageSnapshot: item.product.image,
        selectedColor: item.selectedColor || 'Standard',
        selectedSize: item.selectedSize || 'N/A',
        quantity: item.quantity,
        unitPrice: item.product.price,
        originalPriceSnapshot: item.product.oldPrice || item.product.price,
        subtotal: item.product.price * item.quantity,
      }));

  snapshots.forEach((item, index) => {
    const productUrl = `${origin}/product/${item.productId}`;
    lines.push(`${index + 1}. ${item.productNameSnapshot}`);
    lines.push(`Color: ${item.selectedColor || 'Standard'}`);
    lines.push(`Size: ${item.selectedSize || 'N/A'}`);
    lines.push(`Quantity: ${item.quantity}`);
    lines.push(`Price: ${formatPKR(item.unitPrice)} (Subtotal: ${formatPKR(item.subtotal)})`);
    lines.push(`Product Link: ${productUrl}`);
    lines.push('');
  });

  lines.push(`Total: ${formatPKR(order.total)}`);
  lines.push('');
  lines.push('Please confirm my order.');

  return lines.join('\n');
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<string[]>([
    'Shirts',
    'Pants',
    'Shoes',
    'Watches',
    'Perfumes',
    'Accessories',
  ]);

  const [cart, setCart] = useState<CartItemType[]>(() => loadFromStorage(STORAGE_KEYS.CART, []));
  const [wishlist, setWishlist] = useState<string[]>(() =>
    loadFromStorage(STORAGE_KEYS.WISHLIST, [])
  );
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() =>
    loadFromStorage(STORAGE_KEYS.RECENT, [])
  );
  const [orders, setOrders] = useState<Order[]>(() => loadFromStorage(STORAGE_KEYS.ORDERS, []));
  const [lastOrder, setLastOrder] = useState<Order | null>(() =>
    loadFromStorage(STORAGE_KEYS.LAST_ORDER, null)
  );
  const [savedCustomer, setSavedCustomer] = useState<OrderCustomerDetails | null>(() =>
    loadFromStorage(STORAGE_KEYS.CUSTOMER, null)
  );

  const [searchOpen, setSearchOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [customerUser, setCustomerUser] = useState<AuthenticatedCustomer | null>(null);

  const setCustomerSession = useCallback(
    (user: AuthenticatedCustomer | null, sessionToken?: string) => {
      if (typeof sessionToken === 'string') {
        setStoredSessionToken(sessionToken);
      }
      setCustomerUser(user);
    },
    []
  );

  const refreshCustomerAuth = useCallback(async () => {
    try {
      const res = await apiFetch('auth', 'action=check', {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        setCustomerUser(null);
        return;
      }
      const data = await safeJsonParse<{
        customerAuthenticated?: boolean;
        role?: string | null;
        sessionToken?: string;
        user?: { id?: number; fullName?: string; email?: string; role?: string };
      }>(res);
      if (data.customerAuthenticated && data.role === 'customer' && data.user?.email) {
        if (data.sessionToken) {
          setStoredSessionToken(data.sessionToken);
        }
        setCustomerUser({
          id: Number(data.user.id || 0),
          fullName: String(data.user.fullName || '').trim(),
          email: String(data.user.email || '').trim(),
          role: 'customer',
        });
      } else {
        setCustomerUser(null);
      }
    } catch {
      setCustomerUser(null);
    }
  }, []);

  useEffect(() => {
    refreshCustomerAuth();
  }, [refreshCustomerAuth]);

  const refreshCatalog = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        apiFetch('products', undefined, { credentials: 'include' }),
        apiFetch('categories', undefined, { credentials: 'include' }),
      ]);
      if (prodRes.ok) {
        const data = await safeJsonParse<{ success?: boolean; products?: Product[] }>(prodRes);
        if (data.success && Array.isArray(data.products) && data.products.length > 0) {
          // Map any relative /uploads/category_*.jpg paths to bundled high-res fallback if needed
          const hydrated: Product[] = data.products.map((p: Product) => {
            const seedMatch = INITIAL_PRODUCTS.find((sp) => sp.id === p.id);
            const resolvedImage =
              p.image && p.image.startsWith('/uploads/category_') && seedMatch
                ? seedMatch.image
                : p.image;
            return {
              ...p,
              image: resolvedImage,
              gallery: [resolvedImage],
            };
          });
          setProducts(hydrated);
          // Sync any existing cart items with the current product prices (Original Price -> 20% OFF Offer Price)
          setCart((prevCart) =>
            prevCart.map((item) => {
              const match = hydrated.find((hp) => hp.id === item.product.id);
              return match ? { ...item, product: match } : item;
            })
          );
        }
      }
      if (catRes.ok) {
        const catData = await safeJsonParse<{
          success?: boolean;
          categories?: { name: string }[];
        }>(catRes);
        if (catData.success && Array.isArray(catData.categories)) {
          setCategories(catData.categories.map((c: { name: string }) => c.name));
        }
      }
    } catch {
      // Fallback to INITIAL_PRODUCTS if offline
    }
  }, []);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlist));
    } catch {
      // ignore
    }
  }, [wishlist]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(recentlyViewed));
    } catch {
      // ignore
    }
  }, [recentlyViewed]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch {
      // ignore
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_ORDER, JSON.stringify(lastOrder));
    } catch {
      // ignore
    }
  }, [lastOrder]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
      setTimeout(() => {
        removeToast(id);
      }, 3400);
    },
    [removeToast]
  );

  const addToCart = useCallback(
    (
      product: Product,
      quantity = 1,
      selectedSize?: string,
      selectedColor?: string
    ): boolean => {
      if (!product.inStock) {
        showToast(`${product.name} is currently out of stock.`, 'error');
        return false;
      }

      const finalSize =
        selectedSize ||
        (product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'N/A');
      const finalColor =
        selectedColor ||
        (product.colors && product.colors.length > 0
          ? product.colors[0].name
          : 'Standard');

      setCart((prev) => {
        const existingIndex = prev.findIndex(
          (item) =>
            item.product.id === product.id &&
            item.selectedSize === finalSize &&
            item.selectedColor === finalColor
        );
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            product, // ensure current price snapshot
            quantity: updated[existingIndex].quantity + quantity,
          };
          return updated;
        }
        return [
          ...prev,
          {
            product,
            quantity,
            selectedSize: finalSize,
            selectedColor: finalColor,
          },
        ];
      });

      showToast(`${product.name} added to your cart.`, 'success');
      return true;
    },
    [showToast]
  );

  const updateCartQuantity = useCallback(
    (
      productId: string,
      selectedSize: string | undefined,
      selectedColor: string | undefined,
      delta: number
    ) => {
      setCart((prev) =>
        prev
          .map((item) => {
            if (
              item.product.id === productId &&
              item.selectedSize === selectedSize &&
              (selectedColor === undefined || item.selectedColor === selectedColor)
            ) {
              const nextQty = item.quantity + delta;
              return nextQty > 0 ? { ...item, quantity: nextQty } : null;
            }
            return item;
          })
          .filter(Boolean) as CartItemType[]
      );
    },
    []
  );

  const removeFromCart = useCallback(
    (productId: string, selectedSize?: string, selectedColor?: string) => {
      setCart((prev) =>
        prev.filter(
          (item) =>
            !(
              item.product.id === productId &&
              item.selectedSize === selectedSize &&
              (selectedColor === undefined || item.selectedColor === selectedColor)
            )
        )
      );
      showToast('Item removed from your cart.', 'info');
    },
    [showToast]
  );

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleWishlist = useCallback(
    (product: Product) => {
      setWishlist((prev) => {
        const exists = prev.includes(product.id);
        if (exists) {
          showToast(`${product.name} removed from wishlist.`, 'info');
          return prev.filter((id) => id !== product.id);
        } else {
          showToast(`${product.name} saved to your wishlist.`, 'success');
          return [...prev, product.id];
        }
      });
    },
    [showToast]
  );

  const isInWishlist = useCallback(
    (productId: string) => wishlist.includes(productId),
    [wishlist]
  );

  const addRecentlyViewed = useCallback((productId: string) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((id) => id !== productId);
      return [productId, ...filtered].slice(0, 8);
    });
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const cartDiscountTotal = cart.reduce((sum, item) => {
    if (item.product.oldPrice && item.product.oldPrice > item.product.price) {
      return sum + (item.product.oldPrice - item.product.price) * item.quantity;
    }
    return sum;
  }, 0);

  // NO delivery fee per client requirement
  const grandTotal = cartSubtotal;

  const buildOrderWhatsAppUrl = useCallback((order: Order): string => {
    const msg = buildWhatsAppOrderMessage(order);
    return `${BRAND_INFO.whatsappUrl}?text=${encodeURIComponent(msg)}`;
  }, []);

  const placeOrder = useCallback(
    async (
      customer: OrderCustomerDetails
    ): Promise<{ order: Order; whatsappUrl: string }> => {
      // 1. Send order to backend /api/orders FIRST so it is saved in database BEFORE WhatsApp opens
      const response = await apiFetch('orders', undefined, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customer,
          items: cart,
        }),
      });

      const data = await safeJsonParse<{
        success?: boolean;
        message?: string;
        error?: string;
        order_id?: string;
        order?: Order;
      }>(response);

      if (!response.ok || !data.success || !data.order) {
        throw new Error(
          data.message || data.error || 'Unable to create order. Please verify your information.'
        );
      }

      const savedOrder: Order = {
        ...data.order,
        orderNumber: data.order.orderNumber || data.order_id || 'MGC-000000',
        items: [...cart],
      };

      setOrders((prev) => [savedOrder, ...prev]);
      setLastOrder(savedOrder);
      setSavedCustomer(customer);
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOMER, JSON.stringify(customer));
      } catch {
        // ignore
      }

      const whatsappUrl = buildOrderWhatsAppUrl(savedOrder);
      clearCart();
      showToast(`Order ${savedOrder.orderNumber} saved! Redirecting to WhatsApp...`, 'success');

      return { order: savedOrder, whatsappUrl };
    },
    [cart, clearCart, showToast, buildOrderWhatsAppUrl]
  );

  const saveContactMessage = useCallback(
    (submission: Omit<ContactSubmission, 'id' | 'createdAt'>) => {
      const existing = loadFromStorage<ContactSubmission[]>(STORAGE_KEYS.MESSAGES, []);
      const entry: ContactSubmission = {
        ...submission,
        id: `MSG-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify([entry, ...existing]));
      } catch {
        // ignore
      }
    },
    []
  );

  const logoutCustomer = useCallback(async () => {
    try {
      await apiFetch('auth', 'action=logout', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
    } catch {
      // ignore network error
    }
    setStoredSessionToken('');
    setCustomerUser(null);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        products,
        categories,
        refreshCatalog,
        customerUser,
        setCustomerSession,
        refreshCustomerAuth,
        logoutCustomer,
        cart,
        wishlist,
        recentlyViewed,
        orders,
        lastOrder,
        savedCustomer,
        searchOpen,
        setSearchOpen,
        quickViewProduct,
        setQuickViewProduct,
        toasts,
        showToast,
        removeToast,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        toggleWishlist,
        isInWishlist,
        addRecentlyViewed,
        cartCount,
        cartSubtotal,
        cartDiscountTotal,
        grandTotal,
        placeOrder,
        buildOrderWhatsAppUrl,
        saveContactMessage,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return ctx;
}
