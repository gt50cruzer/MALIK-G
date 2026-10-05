import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, CartItemType, Order, OrderCustomerDetails, ContactSubmission } from '../types';
import { BRAND_INFO } from '../data/products';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface StoreContextType {
  cart: CartItemType[];
  wishlist: string[]; // Product IDs
  recentlyViewed: string[]; // Product IDs
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
  addToCart: (product: Product, quantity?: number, selectedSize?: string, selectedColor?: string) => boolean;
  updateCartQuantity: (productId: string, selectedSize: string | undefined, delta: number) => void;
  removeFromCart: (productId: string, selectedSize?: string) => void;
  clearCart: () => void;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  addRecentlyViewed: (productId: string) => void;
  cartCount: number;
  cartSubtotal: number;
  cartDiscountTotal: number;
  deliveryFee: number;
  grandTotal: number;
  placeOrder: (
    customer: OrderCustomerDetails,
    paymentMethod: 'Cash on Delivery' | 'Bank Transfer / WhatsApp'
  ) => Order;
  saveContactMessage: (submission: Omit<ContactSubmission, 'id' | 'createdAt'>) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CART: 'malik_g_cart_v1',
  WISHLIST: 'malik_g_wishlist_v1',
  RECENT: 'malik_g_recently_viewed_v1',
  ORDERS: 'malik_g_orders_v1',
  LAST_ORDER: 'malik_g_last_order_v1',
  CUSTOMER: 'malik_g_customer_v1',
  MESSAGES: 'malik_g_contact_messages_v1',
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

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItemType[]>(() => loadFromStorage(STORAGE_KEYS.CART, []));
  const [wishlist, setWishlist] = useState<string[]>(() => loadFromStorage(STORAGE_KEYS.WISHLIST, []));
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch {
      // ignore storage errors
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
    (product: Product, quantity = 1, selectedSize?: string, selectedColor?: string): boolean => {
      if (!product.inStock) {
        showToast(`${product.name} is currently out of stock.`, 'error');
        return false;
      }

      const finalSize =
        selectedSize || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined);
      const finalColor =
        selectedColor || (product.colors && product.colors.length > 0 ? product.colors[0].name : undefined);

      setCart((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.product.id === product.id && item.selectedSize === finalSize
        );
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
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
    (productId: string, selectedSize: string | undefined, delta: number) => {
      setCart((prev) =>
        prev
          .map((item) => {
            if (item.product.id === productId && item.selectedSize === selectedSize) {
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
    (productId: string, selectedSize?: string) => {
      setCart((prev) =>
        prev.filter((item) => !(item.product.id === productId && item.selectedSize === selectedSize))
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

  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const cartDiscountTotal = cart.reduce((sum, item) => {
    if (item.product.oldPrice && item.product.oldPrice > item.product.price) {
      return sum + (item.product.oldPrice - item.product.price) * item.quantity;
    }
    return sum;
  }, 0);

  const deliveryFee =
    cartSubtotal === 0
      ? 0
      : cartSubtotal >= BRAND_INFO.freeDeliveryThreshold
      ? 0
      : BRAND_INFO.standardDeliveryFee;

  const grandTotal = cartSubtotal + deliveryFee;

  const placeOrder = useCallback(
    (
      customer: OrderCustomerDetails,
      paymentMethod: 'Cash on Delivery' | 'Bank Transfer / WhatsApp'
    ): Order => {
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      const orderNumber = `MGC-${randomNum}`;
      const newOrder: Order = {
        orderNumber,
        createdAt: new Date().toISOString(),
        customer,
        items: [...cart],
        subtotal: cartSubtotal,
        delivery: deliveryFee,
        discount: cartDiscountTotal,
        total: grandTotal,
        paymentMethod,
      };

      setOrders((prev) => [newOrder, ...prev]);
      setLastOrder(newOrder);
      setSavedCustomer(customer);
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOMER, JSON.stringify(customer));
      } catch {
        // ignore
      }
      clearCart();
      showToast(`Order ${orderNumber} placed successfully!`, 'success');
      return newOrder;
    },
    [cart, cartSubtotal, deliveryFee, cartDiscountTotal, grandTotal, clearCart, showToast]
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
        deliveryFee,
        grandTotal,
        placeOrder,
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
