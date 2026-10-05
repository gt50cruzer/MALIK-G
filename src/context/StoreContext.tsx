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

interface StoreContextType {
  products: Product[];
  categories: string[];
  refreshCatalog: () => Promise<void>;
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
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
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

  const refreshCatalog = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/products.php', { credentials: 'include' }),
        fetch('/api/categories.php', { credentials: 'include' }),
      ]);
      if (prodRes.ok) {
        const data = await prodRes.json();
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
        }
      }
      if (catRes.ok) {
        const catData = await catRes.json();
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
      // 1. Send order to backend /api/orders.php FIRST so it is saved in MySQL BEFORE WhatsApp opens
      const response = await fetch('/api/orders.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customer,
          items: cart,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success || !data.order) {
        throw new Error(data.error || 'Could not save order. Please check your details.');
      }

      const savedOrder: Order = {
        ...data.order,
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

  return (
    <StoreContext.Provider
      value={{
        products,
        categories,
        refreshCatalog,
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
