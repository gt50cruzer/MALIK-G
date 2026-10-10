import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  TrendingUp,
  Boxes,
  Settings,
  LogOut,
  Menu,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Check,
  Ban,
  Plus,
  Edit3,
  Trash2,
  Upload,
  ExternalLink,
} from 'lucide-react';
import {
  Product,
  Order,
  OrderStatusType,
  OrderItemSnapshot,
  DashboardStats,
  CategoryRecord,
} from '../types';
import { INITIAL_PRODUCTS, formatPKR } from '../data/products';
import { SafeImage } from '../components/SafeImage';
import {
  useStore,
  safeJsonParse,
  getAuthHeaders,
  setStoredSessionToken,
  addStoredCustomerVaultToken,
  apiFetch,
} from '../context/StoreContext';

type AdminSection =
  | 'dashboard'
  | 'orders'
  | 'products'
  | 'categories'
  | 'sales'
  | 'stock'
  | 'settings';

const NAV_ITEMS: { id: AdminSection; label: string; path: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/admin/', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', path: '/admin/orders', icon: ShoppingCart },
  { id: 'products', label: 'Products', path: '/admin/products', icon: Package },
  { id: 'categories', label: 'Categories', path: '/admin/categories', icon: FolderTree },
  { id: 'sales', label: 'Sales', path: '/admin/sales', icon: TrendingUp },
  { id: 'stock', label: 'Stock', path: '/admin/stock', icon: Boxes },
  { id: 'settings', label: 'Settings', path: '/admin/settings', icon: Settings },
];

const ORDER_STATUS_FILTERS: ('All' | OrderStatusType)[] = [
  'All',
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
];

const ORDER_STATUS_OPTIONS: OrderStatusType[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
];

const DETAIL_STATUS_UPDATE_OPTIONS: OrderStatusType[] = [
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
];

function getStatusBadgeClasses(status: OrderStatusType): string {
  switch (status) {
    case 'Pending':
      return 'bg-amber-500/15 border-amber-500/40 text-amber-300';
    case 'Confirmed':
      return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
    case 'Processing':
      return 'bg-sky-500/15 border-sky-500/40 text-sky-300';
    case 'Shipped':
      return 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300';
    case 'Delivered':
      return 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]';
    case 'Cancelled':
      return 'bg-red-500/15 border-red-500/40 text-red-300';
    default:
      return 'bg-white/10 border-white/20 text-[#F5F5F0]';
  }
}

function resolveSnapshotImage(rawUrl: string | undefined, productId: string | undefined): string {
  if (rawUrl && rawUrl.startsWith('/uploads/category_') && productId) {
    const seed = INITIAL_PRODUCTS.find((p) => p.id === productId);
    if (seed) return seed.image;
  }
  if (!rawUrl && productId) {
    const seed = INITIAL_PRODUCTS.find((p) => p.id === productId);
    if (seed) return seed.image;
  }
  return rawUrl || '';
}

const COLOR_HEX_MAP: Record<string, string> = {
  black: '#121214',
  'jet black': '#121214',
  'obsidian black': '#111113',
  white: '#F5F5F0',
  'pure white': '#FFFFFF',
  ivory: '#F5F5F0',
  blue: '#1E3A8A',
  navy: '#1B2436',
  'midnight navy': '#1B2436',
  brown: '#5C3A21',
  cognac: '#8A4B29',
  tan: '#8A4B29',
  gold: '#D4AF37',
  silver: '#C0C0C5',
  grey: '#4B5563',
  gray: '#4B5563',
  charcoal: '#2D2E32',
  green: '#233127',
  olive: '#6E6A53',
  red: '#7F1D1D',
  burgundy: '#4A191E',
  beige: '#D8CFC2',
  khaki: '#C3B091',
};

function getColorHexForName(colorName: string, existingHex?: string): string {
  if (existingHex && existingHex !== '#18181B') return existingHex;
  const key = colorName.trim().toLowerCase();
  return COLOR_HEX_MAP[key] || existingHex || '#18181B';
}

const COMMON_SIZE_PRESETS = ['S', 'M', 'L', 'XL', 'XXL'];
const COMMON_COLOR_PRESETS = ['Black', 'White', 'Blue', 'Brown', 'Navy', 'Charcoal', 'Gold'];

function getOrderSnapshotItems(order: Order): OrderItemSnapshot[] {
  if (Array.isArray(order.orderItems) && order.orderItems.length > 0) {
    return order.orderItems;
  }
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.map((item) => ({
      productId: item.product?.id || '',
      productNameSnapshot: item.product?.name || 'Malik G Product',
      productImageSnapshot: item.product?.image || '',
      selectedColor: item.selectedColor || 'Standard',
      selectedSize: item.selectedSize || 'N/A',
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.product?.price || 0),
      originalPriceSnapshot: Number(item.product?.oldPrice || item.product?.price || 0),
      subtotal: Number(item.product?.price || 0) * Number(item.quantity || 1),
    }));
  }
  return [];
}

function formatOrderDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sanitizeDiagnosticBody(rawBody: string): string {
  if (!rawBody) return '(empty response body)';
  // Redact any accidental token/password fields if present in raw text
  const redacted = rawBody
    .replace(/"(password|confirmPassword|sessionToken|customerVaultToken|csrfToken)"\s*:\s*"[^"]*"/gi, '"$1":"[REDACTED]"')
    .trim();
  return redacted.slice(0, 500);
}

function formatAuthDiagnosticError(
  requestedUrl: string,
  status: number | string,
  contentType: string,
  bodySnippet: string
): string {
  return [
    'Authentication API failed',
    `URL: ${requestedUrl}`,
    `HTTP: ${status}`,
    `Content-Type: ${contentType || 'none'}`,
    `Message: ${sanitizeDiagnosticBody(bodySnippet)}`,
  ].join('\n');
}

const DEFAULT_STATS: DashboardStats = {
  totalOrders: 0,
  pendingOrders: 0,
  confirmedOrders: 0,
  processingOrders: 0,
  shippedOrders: 0,
  deliveredOrders: 0,
  cancelledOrders: 0,
  totalProducts: 0,
  outOfStockProducts: 0,
  publishedProducts: 0,
  totalRevenue: 0,
  deliveredRevenue: 0,
  pendingOrderValue: 0,
  periods: {
    today: { sales: 0, orders: 0 },
    thisWeek: { sales: 0, orders: 0 },
    thisMonth: { sales: 0, orders: 0 },
    allTime: { sales: 0, orders: 0 },
  },
};

export const AdminPanel: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    showToast,
    setCustomerSession,
    setAdminSession,
    refreshCustomerAuth,
    refreshCatalog,
  } = useStore();

  // Authentication State
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [customerAuthenticated, setCustomerAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [csrfToken, setCsrfToken] = useState('');

  // Sign-In Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Create Account Form State (/create-account)
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Responsive Mobile Drawer State
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Dashboard & Recent Orders State (fetched from real backend API, defaults to 0 / empty)
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  // Orders Management State (/admin/orders)
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'All' | OrderStatusType>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailStatusSelection, setDetailStatusSelection] = useState<OrderStatusType>('Confirmed');
  const [rejectConfirmOrder, setRejectConfirmOrder] = useState<Order | null>(null);
  const [updatingOrderIds, setUpdatingOrderIds] = useState<Record<string, boolean>>({});
  const [ordersActionFeedback, setOrdersActionFeedback] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Sales Management State (/admin/sales)
  const [salesSearchQuery, setSalesSearchQuery] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState<'All' | OrderStatusType>('All');
  const [salesDateFilter, setSalesDateFilter] = useState<'all' | 'today' | 'last7days' | 'month'>('all');

  // Products Management State (/admin/products)
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminCategories, setAdminCategories] = useState<string[]>([]);
  const [adminCategoryRecords, setAdminCategoryRecords] = useState<CategoryRecord[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [categoriesActionFeedback, setCategoriesActionFeedback] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [togglingCategoryIds, setTogglingCategoryIds] = useState<Record<number, boolean>>({});
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<CategoryRecord | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
  const [deleteCategoryModalError, setDeleteCategoryModalError] = useState('');

  // Add / Edit Category Modal State (/admin/categories)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catActive, setCatActive] = useState(true);
  const [catFormError, setCatFormError] = useState('');
  const [catSaving, setCatSaving] = useState(false);

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  const [productPublishFilter, setProductPublishFilter] = useState<'All' | 'Published' | 'Unpublished'>('All');
  const [productStockFilter, setProductStockFilter] = useState<'All' | 'In Stock' | 'Out of Stock'>('All');
  const [productsActionFeedback, setProductsActionFeedback] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [togglingProductIds, setTogglingProductIds] = useState<Record<string, boolean>>({});
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Add / Edit Product Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodTitle, setProdTitle] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodCategory, setProdCategory] = useState('Shirts');
  const [prodImage, setProdImage] = useState('');
  const [prodImageUploading, setProdImageUploading] = useState(false);
  const [prodOriginalPrice, setProdOriginalPrice] = useState('');
  const [prodOfferType, setProdOfferType] = useState<'none' | 'percentage' | 'price'>('none');
  const [prodDiscountPercent, setProdDiscountPercent] = useState('');
  const [prodOfferPrice, setProdOfferPrice] = useState('');
  const [prodColors, setProdColors] = useState<{ name: string; hex: string }[]>([]);
  const [prodColorInput, setProdColorInput] = useState('');
  const [prodSizes, setProdSizes] = useState<string[]>([]);
  const [prodSizeInput, setProdSizeInput] = useState('');
  const [prodInStock, setProdInStock] = useState(true);
  const [prodStockQuantity, setProdStockQuantity] = useState('25');
  const [prodPublished, setProdPublished] = useState(true);
  const [prodFormError, setProdFormError] = useState('');
  const [prodSaving, setProdSaving] = useState(false);

  // Change Password Form State (/admin/settings)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const isCreateAccountRoute = location.pathname === '/create-account';
  const isSignInRoute =
    location.pathname === '/sign-in' ||
    location.pathname === '/signin' ||
    location.pathname === '/admin/login' ||
    location.pathname === '/admin/login.php';
  const isPublicAuthRoute = isSignInRoute || isCreateAccountRoute;

  // Determine current section from URL path
  const getActiveSection = (pathname: string): AdminSection => {
    const clean = pathname.replace(/\.php$/, '').replace(/\/+$/, '');
    if (clean.endsWith('/orders') || clean.endsWith('/order-view')) return 'orders';
    if (clean.endsWith('/products')) return 'products';
    if (clean.endsWith('/categories')) return 'categories';
    if (clean.endsWith('/sales')) return 'sales';
    if (clean.endsWith('/stock')) return 'stock';
    if (clean.endsWith('/settings') || clean.endsWith('/change-password')) return 'settings';
    return 'dashboard';
  };

  const activeSection = getActiveSection(location.pathname);

  // Close mobile drawer and clear form errors on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
    setLoginError('');
    setRegError('');
    setRegSuccess('');
  }, [location.pathname]);

  // Verify server-side session
  const checkAuth = useCallback(async () => {
    setAuthChecking(true);
    try {
      const res = await apiFetch('auth', 'action=check', {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const data = await safeJsonParse<{
        authenticated?: boolean;
        customerAuthenticated?: boolean;
        role?: string | null;
        admin?: { email?: string };
        user?: { id?: number; fullName?: string; email?: string; role?: string };
        csrfToken?: string;
        sessionToken?: string;
      }>(res);
      if (data.authenticated && data.role === 'admin') {
        if (data.sessionToken) setStoredSessionToken(data.sessionToken);
        const resolvedEmail = data.admin?.email || data.user?.email || '';
        setAuthenticated(true);
        setCustomerAuthenticated(false);
        setAdminEmail(resolvedEmail);
        setCsrfToken(data.csrfToken || '');
        setAdminSession(
          {
            id: Number(data.user?.id || 1),
            email: resolvedEmail,
            role: 'admin',
          },
          data.sessionToken
        );
      } else if (data.customerAuthenticated || data.role === 'customer') {
        if (data.sessionToken) setStoredSessionToken(data.sessionToken);
        setAuthenticated(false);
        setCustomerAuthenticated(true);
        setAdminEmail('');
        setCsrfToken(data.csrfToken || '');
        setAdminSession(null);
        if (data.user?.email) {
          setCustomerSession(
            {
              id: Number(data.user.id || 0),
              fullName: String(data.user.fullName || '').trim(),
              email: String(data.user.email || '').trim(),
              role: 'customer',
            },
            data.sessionToken
          );
        }
      } else {
        setAuthenticated(false);
        setCustomerAuthenticated(false);
        setAdminEmail('');
        setCsrfToken('');
        setAdminSession(null);
      }
    } catch {
      setAuthenticated(false);
      setCustomerAuthenticated(false);
      setAdminSession(null);
    } finally {
      setAuthChecking(false);
    }
  }, [setCustomerSession, setAdminSession]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Enforce route redirects based on authentication & role status
  useEffect(() => {
    if (authChecking) return;
    if (!authenticated && !isPublicAuthRoute) {
      // If a registered customer tries to access /admin/*, redirect them away from the admin area to the store
      if (customerAuthenticated) {
        navigate('/', { replace: true });
      } else {
        navigate('/sign-in', { replace: true });
      }
    } else if (authenticated && isPublicAuthRoute) {
      navigate('/admin/', { replace: true });
    }
  }, [authChecking, authenticated, customerAuthenticated, isPublicAuthRoute, navigate]);

  // Fetch real dashboard statistics & orders when authenticated
  const fetchDashboardFoundation = useCallback(async () => {
    if (!authenticated) return;
    setLoadingDashboard(true);
    setOrdersError('');
    try {
      const [dashRes, ordRes] = await Promise.all([
        apiFetch('dashboard', undefined, {
          credentials: 'include',
          headers: getAuthHeaders(),
        }),
        apiFetch('orders', undefined, {
          credentials: 'include',
          headers: getAuthHeaders(),
        }),
      ]);

      if (dashRes.status === 401 || ordRes.status === 401) {
        setAuthenticated(false);
        navigate('/sign-in', { replace: true });
        return;
      }

      if (dashRes.ok) {
        const dashData = await safeJsonParse<{
          success?: boolean;
          stats?: DashboardStats;
        }>(dashRes);
        if (dashData.success && dashData.stats) {
          setStats(dashData.stats);
        }
      }

      if (ordRes.ok) {
        const ordData = await safeJsonParse<{
          success?: boolean;
          orders?: Order[];
          error?: string;
          message?: string;
        }>(ordRes);
        if (ordData.success && Array.isArray(ordData.orders)) {
          setRecentOrders(ordData.orders);
          setSelectedOrder((prev) => {
            if (!prev) return null;
            const refreshed = ordData.orders?.find((o) => o.orderNumber === prev.orderNumber);
            return refreshed || prev;
          });
        } else {
          setOrdersError(ordData.message || ordData.error || 'Unable to load orders.');
        }
      } else {
        setOrdersError(`Failed to load orders from server (HTTP ${ordRes.status}).`);
      }
    } catch (err) {
      setOrdersError(
        err instanceof Error ? err.message : 'Unable to connect to server to load orders.'
      );
    } finally {
      setLoadingDashboard(false);
    }
  }, [authenticated, navigate]);

  useEffect(() => {
    if (authenticated) {
      fetchDashboardFoundation();
    }
  }, [authenticated, fetchDashboardFoundation]);

  // If URL has ?order_id=MGC-XXXXXX, automatically open that order in the details modal
  useEffect(() => {
    if (!authenticated || recentOrders.length === 0) return;
    const params = new URLSearchParams(location.search);
    const orderIdParam = params.get('order_id');
    if (orderIdParam) {
      const match = recentOrders.find(
        (o) => o.orderNumber.toLowerCase() === orderIdParam.trim().toLowerCase()
      );
      if (match) {
        setSelectedOrder(match);
        setDetailStatusSelection(
          match.status === 'Pending' ? 'Confirmed' : match.status
        );
      }
    }
  }, [authenticated, recentOrders, location.search]);

  const handleOpenOrderDetails = (order: Order) => {
    setOrdersActionFeedback(null);
    setSelectedOrder(order);
    setDetailStatusSelection(order.status === 'Pending' ? 'Confirmed' : order.status);
  };

  // Fetch all categories (active + inactive) with product counts for Admin Categories Management
  const fetchAdminCategories = useCallback(async () => {
    if (!authenticated) return;
    setLoadingCategories(true);
    setCategoriesError('');
    try {
      const catRes = await apiFetch('categories', 'admin=1', {
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (catRes.status === 401) {
        setAuthenticated(false);
        navigate('/sign-in', { replace: true });
        return;
      }

      if (catRes.ok) {
        const catData = await safeJsonParse<{
          success?: boolean;
          categories?: CategoryRecord[];
          error?: string;
          message?: string;
        }>(catRes);
        if (catData.success && Array.isArray(catData.categories)) {
          setAdminCategoryRecords(catData.categories);
          setAdminCategories(
            catData.categories
              .filter((c) => c.active !== false)
              .map((c) => c.name)
          );
        } else {
          setCategoriesError(
            catData.message || catData.error || 'Unable to load categories.'
          );
        }
      } else {
        setCategoriesError(`Failed to load categories from server (HTTP ${catRes.status}).`);
      }
    } catch (err) {
      setCategoriesError(
        err instanceof Error ? err.message : 'Unable to connect to server to load categories.'
      );
    } finally {
      setLoadingCategories(false);
    }
  }, [authenticated, navigate]);

  // Fetch all products (published + unpublished) and categories for Admin Products Management
  const fetchAdminProducts = useCallback(async () => {
    if (!authenticated) return;
    setLoadingProducts(true);
    setProductsError('');
    try {
      const [prodRes, catRes] = await Promise.all([
        apiFetch('products', 'admin=1', {
          credentials: 'include',
          headers: getAuthHeaders(),
        }),
        apiFetch('categories', 'admin=1', {
          credentials: 'include',
          headers: getAuthHeaders(),
        }),
      ]);

      if (prodRes.status === 401 || catRes.status === 401) {
        setAuthenticated(false);
        navigate('/sign-in', { replace: true });
        return;
      }

      if (prodRes.ok) {
        const prodData = await safeJsonParse<{
          success?: boolean;
          products?: Product[];
          error?: string;
          message?: string;
        }>(prodRes);
        if (prodData.success && Array.isArray(prodData.products)) {
          setAdminProducts(prodData.products);
        } else {
          setProductsError(
            prodData.message || prodData.error || 'Unable to load products.'
          );
        }
      } else {
        setProductsError(`Failed to load products from server (HTTP ${prodRes.status}).`);
      }

      if (catRes.ok) {
        const catData = await safeJsonParse<{
          success?: boolean;
          categories?: CategoryRecord[];
        }>(catRes);
        if (catData.success && Array.isArray(catData.categories)) {
          setAdminCategoryRecords(catData.categories);
          setAdminCategories(
            catData.categories
              .filter((c) => c.active !== false)
              .map((c) => c.name)
          );
        }
      }
    } catch (err) {
      setProductsError(
        err instanceof Error ? err.message : 'Unable to connect to server to load products.'
      );
    } finally {
      setLoadingProducts(false);
    }
  }, [authenticated, navigate]);

  useEffect(() => {
    if (authenticated) {
      fetchAdminProducts();
      fetchAdminCategories();
    }
  }, [authenticated, fetchAdminProducts, fetchAdminCategories]);

  // Open Add Category Modal
  const handleOpenAddCategoryModal = () => {
    setEditingCategory(null);
    setCatName('');
    setCatDescription('');
    setCatActive(true);
    setCatFormError('');
    setCategoryModalOpen(true);
  };

  // Open Edit Category Modal populated with existing category data
  const handleOpenEditCategoryModal = (cat: CategoryRecord) => {
    setEditingCategory(cat);
    setCatName(cat.name || '');
    setCatDescription(cat.description ?? cat.subtitle ?? '');
    setCatActive(cat.active !== false);
    setCatFormError('');
    setCategoryModalOpen(true);
  };

  // Save Add / Edit Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (catSaving) return;
    setCatFormError('');

    const cleanedName = catName.trim().replace(/\s+/g, ' ');
    const cleanedDesc = catDescription.trim();

    if (!cleanedName) {
      setCatFormError('Category name is required.');
      return;
    }

    const normalizedTarget = cleanedName.toLowerCase();
    const isDuplicate = adminCategoryRecords.some(
      (c) =>
        (!editingCategory || c.id !== editingCategory.id) &&
        c.name.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedTarget
    );
    if (isDuplicate) {
      setCatFormError(`A category named "${cleanedName}" already exists.`);
      return;
    }

    setCatSaving(true);
    try {
      const action = editingCategory ? 'update' : 'create';
      const res = await apiFetch('categories', `action=${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        }),
        body: JSON.stringify({
          id: editingCategory?.id,
          name: cleanedName,
          description: cleanedDesc,
          subtitle: cleanedDesc || 'Curated collection at Malik G Collection',
          active: catActive,
        }),
      });

      if (res.status === 401) {
        setAuthenticated(false);
        navigate('/sign-in', { replace: true });
        return;
      }

      const data = await safeJsonParse<{
        success?: boolean;
        category?: CategoryRecord;
        message?: string;
        error?: string;
      }>(res);

      if (!res.ok || !data.success || !data.category) {
        setCatFormError(data.message || data.error || 'Failed to save category.');
        return;
      }

      const successText =
        data.message ||
        (editingCategory
          ? `Category "${data.category.name}" updated successfully.`
          : `Category "${data.category.name}" created successfully.`);

      setCategoriesActionFeedback({ text: successText, type: 'success' });
      showToast(successText, 'success');
      setCategoryModalOpen(false);
      setEditingCategory(null);

      await Promise.all([
        fetchAdminCategories(),
        fetchAdminProducts(),
        fetchDashboardFoundation(),
        refreshCatalog(),
      ]);
    } catch (err) {
      setCatFormError(
        err instanceof Error ? err.message : 'Network error while saving category.'
      );
    } finally {
      setCatSaving(false);
    }
  };

  // Toggle Active / Inactive status directly from Categories table
  const handleToggleCategoryActive = async (cat: CategoryRecord) => {
    if (togglingCategoryIds[cat.id]) return;
    const nextActive = cat.active === false;
    setCategoriesActionFeedback(null);
    setTogglingCategoryIds((prev) => ({ ...prev, [cat.id]: true }));

    try {
      const res = await apiFetch('categories', 'action=toggle_active', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        }),
        body: JSON.stringify({
          id: cat.id,
          active: nextActive,
        }),
      });

      if (res.status === 401) {
        setAuthenticated(false);
        navigate('/sign-in', { replace: true });
        return;
      }

      const data = await safeJsonParse<{
        success?: boolean;
        category?: CategoryRecord;
        message?: string;
        error?: string;
      }>(res);

      if (!res.ok || !data.success) {
        const errMsg = data.message || data.error || 'Failed to update category status.';
        setCategoriesActionFeedback({ text: errMsg, type: 'error' });
        showToast(errMsg, 'error');
        return;
      }

      const msg =
        data.message ||
        `Category "${cat.name}" is now ${nextActive ? 'Active' : 'Inactive'}.`;
      setCategoriesActionFeedback({ text: msg, type: 'success' });
      showToast(msg, 'success');

      await Promise.all([
        fetchAdminCategories(),
        fetchAdminProducts(),
        refreshCatalog(),
      ]);
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Unable to update category status.';
      setCategoriesActionFeedback({ text: errMsg, type: 'error' });
      showToast(errMsg, 'error');
    } finally {
      setTogglingCategoryIds((prev) => {
        const next = { ...prev };
        delete next[cat.id];
        return next;
      });
    }
  };

  // Confirm & Delete Category
  const handleConfirmDeleteCategory = async () => {
    if (!deleteConfirmCategory || deletingCategoryId !== null) return;
    const target = deleteConfirmCategory;
    setDeletingCategoryId(target.id);
    setDeleteCategoryModalError('');
    setCategoriesActionFeedback(null);

    try {
      const res = await apiFetch('categories', 'action=delete', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        }),
        body: JSON.stringify({ id: target.id }),
      });

      if (res.status === 401) {
        setAuthenticated(false);
        navigate('/sign-in', { replace: true });
        return;
      }

      const data = await safeJsonParse<{
        success?: boolean;
        message?: string;
        error?: string;
      }>(res);

      if (!res.ok || !data.success) {
        const errMsg =
          data.message ||
          data.error ||
          'This category contains products. Please move or remove those products before deleting the category.';
        setDeleteCategoryModalError(errMsg);
        setCategoriesActionFeedback({ text: errMsg, type: 'error' });
        showToast(errMsg, 'error');
        return;
      }

      const msg = data.message || `Category "${target.name}" deleted successfully.`;
      setCategoriesActionFeedback({ text: msg, type: 'success' });
      showToast(msg, 'success');
      setDeleteConfirmCategory(null);
      setDeleteCategoryModalError('');

      await Promise.all([
        fetchAdminCategories(),
        fetchAdminProducts(),
        fetchDashboardFoundation(),
        refreshCatalog(),
      ]);
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Unable to delete category.';
      setDeleteCategoryModalError(errMsg);
      setCategoriesActionFeedback({ text: errMsg, type: 'error' });
      showToast(errMsg, 'error');
    } finally {
      setDeletingCategoryId(null);
    }
  };

  // Open Add Product Modal
  const handleOpenAddProductModal = () => {
    setEditingProduct(null);
    setProdTitle('');
    setProdDescription('');
    setProdCategory(adminCategories[0] || 'Shirts');
    setProdImage('');
    setProdOriginalPrice('');
    setProdOfferType('none');
    setProdDiscountPercent('');
    setProdOfferPrice('');
    setProdColors([
      { name: 'Black', hex: '#121214' },
      { name: 'White', hex: '#F5F5F0' },
    ]);
    setProdColorInput('');
    setProdSizes(['M', 'L', 'XL']);
    setProdSizeInput('');
    setProdInStock(true);
    setProdStockQuantity('25');
    setProdPublished(true);
    setProdFormError('');
    setProductModalOpen(true);
  };

  // Open Edit Product Modal populated with existing product data
  const handleOpenEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setProdTitle(product.name || '');
    setProdDescription(product.description || product.shortDescription || '');
    setProdCategory(product.category || adminCategories[0] || 'Shirts');
    const resolvedImg = resolveSnapshotImage(product.image, product.id);
    setProdImage(resolvedImg || product.image || '');

    const origPrice = Number(product.originalPrice ?? product.oldPrice ?? product.price ?? 0);
    setProdOriginalPrice(origPrice > 0 ? String(origPrice) : '');

    const hasActiveOffer =
      (product.offerPrice !== null &&
        product.offerPrice !== undefined &&
        Number(product.offerPrice) > 0 &&
        Number(product.offerPrice) < origPrice) ||
      (Number(product.price) > 0 && Number(product.price) < origPrice);

    const activeOfferVal =
      product.offerPrice !== null && product.offerPrice !== undefined && Number(product.offerPrice) > 0
        ? Number(product.offerPrice)
        : Number(product.price) < origPrice
        ? Number(product.price)
        : 0;

    const activeDiscPct =
      product.discountPercent && product.discountPercent > 0
        ? product.discountPercent
        : hasActiveOffer && origPrice > 0
        ? Math.round(((origPrice - activeOfferVal) / origPrice) * 100)
        : 0;

    if (!hasActiveOffer || product.offerType === 'none') {
      setProdOfferType('none');
      setProdDiscountPercent('');
      setProdOfferPrice('');
    } else if (product.offerType === 'price') {
      setProdOfferType('price');
      setProdOfferPrice(String(activeOfferVal));
      setProdDiscountPercent(String(activeDiscPct));
    } else {
      setProdOfferType('percentage');
      setProdDiscountPercent(String(activeDiscPct));
      setProdOfferPrice(String(activeOfferVal));
    }

    setProdColors(
      Array.isArray(product.colors) && product.colors.length > 0
        ? product.colors.map((c) => ({
            name: c.name,
            hex: getColorHexForName(c.name, c.hex),
          }))
        : []
    );
    setProdColorInput('');
    setProdSizes(Array.isArray(product.sizes) ? [...product.sizes] : []);
    setProdSizeInput('');
    setProdInStock(product.inStock !== false);
    setProdStockQuantity(
      String(
        typeof product.stockQuantity === 'number'
          ? product.stockQuantity
          : product.inStock === false
          ? 0
          : 25
      )
    );
    setProdPublished(product.published !== false);
    setProdFormError('');
    setProductModalOpen(true);
  };

  // Handle Product Image File Upload via /api/upload
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setProdFormError('');

    const forbiddenExt = /\.(php|phtml|phar|exe|sh|bat|cmd|js|mjs|cjs|ts|jsp|asp|aspx|py|rb|pl|cgi|htaccess|svg|html|htm)$/i;
    if (forbiddenExt.test(file.name)) {
      setProdFormError(
        'Executable or script files are not allowed. Please select a JPG, PNG, or WEBP image.'
      );
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setProdFormError('Invalid file type. Only JPG, PNG, and WEBP images are allowed.');
      return;
    }

    const maxBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxBytes) {
      setProdFormError('Image file size must not exceed 5 MB.');
      return;
    }

    setProdImageUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read selected image file.'));
        reader.readAsDataURL(file);
      });

      const res = await apiFetch('upload', undefined, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        }),
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          dataUrl,
        }),
      });

      if (res.status === 401) {
        setAuthenticated(false);
        navigate('/sign-in', { replace: true });
        return;
      }

      const data = await safeJsonParse<{
        success?: boolean;
        url?: string;
        imageUrl?: string;
        message?: string;
        error?: string;
      }>(res);

      const uploadedUrl = data.imageUrl || data.url || '';
      if (!res.ok || !data.success || !uploadedUrl) {
        setProdFormError(data.message || data.error || 'Failed to upload product image.');
        return;
      }

      setProdImage(uploadedUrl);
      showToast('Product image uploaded.', 'success');
    } catch (err) {
      setProdFormError(
        err instanceof Error ? err.message : 'Unable to upload image to server.'
      );
    } finally {
      setProdImageUploading(false);
    }
  };

  // Add a color chip to the product form
  const handleAddColorChip = (rawName?: string) => {
    const target = (rawName ?? prodColorInput).trim();
    if (!target) return;
    if (prodColors.some((c) => c.name.toLowerCase() === target.toLowerCase())) {
      setProdColorInput('');
      return;
    }
    setProdColors((prev) => [
      ...prev,
      { name: target, hex: getColorHexForName(target) },
    ]);
    if (rawName === undefined) {
      setProdColorInput('');
    }
  };

  const handleRemoveColorChip = (nameToRemove: string) => {
    setProdColors((prev) => prev.filter((c) => c.name !== nameToRemove));
  };

  // Add a size chip to the product form
  const handleAddSizeChip = (rawSize?: string) => {
    const target = (rawSize ?? prodSizeInput).trim().toUpperCase();
    if (!target) return;
    if (prodSizes.some((s) => s.toUpperCase() === target)) {
      setProdSizeInput('');
      return;
    }
    setProdSizes((prev) => [...prev, target]);
    if (rawSize === undefined) {
      setProdSizeInput('');
    }
  };

  const handleRemoveSizeChip = (sizeToRemove: string) => {
    setProdSizes((prev) => prev.filter((s) => s !== sizeToRemove));
  };

  // Save Add / Edit Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prodSaving || prodImageUploading) return;
    setProdFormError('');

    const trimmedTitle = prodTitle.trim();
    const trimmedCategory = prodCategory.trim();
    const trimmedDesc = prodDescription.trim();
    const trimmedImg = prodImage.trim();
    const origNum = Number(prodOriginalPrice);

    if (!trimmedTitle) {
      setProdFormError('Product title is required.');
      return;
    }
    if (!trimmedCategory) {
      setProdFormError('Please select a product category.');
      return;
    }
    if (!trimmedImg) {
      setProdFormError('Please upload or select at least one product image.');
      return;
    }
    if (!prodOriginalPrice.trim() || !Number.isFinite(origNum) || origNum <= 0) {
      setProdFormError('Please enter a valid original price greater than 0.');
      return;
    }

    let finalOfferPrice: number | null = null;
    let finalDiscountPercent = 0;

    if (prodOfferType === 'percentage') {
      const pct = Number(prodDiscountPercent);
      if (prodDiscountPercent.trim() === '' || !Number.isFinite(pct) || pct <= 0 || pct >= 100) {
        setProdFormError('Please enter a valid discount percentage between 1 and 99.');
        return;
      }
      finalDiscountPercent = Math.round(pct);
      finalOfferPrice = Math.round(origNum * (1 - finalDiscountPercent / 100));
    } else if (prodOfferType === 'price') {
      const offerNum = Number(prodOfferPrice);
      if (prodOfferPrice.trim() === '' || !Number.isFinite(offerNum)) {
        setProdFormError('Please enter a valid offer price.');
        return;
      }
      if (offerNum < 0) {
        setProdFormError('Offer price cannot be negative.');
        return;
      }
      if (offerNum > origNum) {
        setProdFormError('Offer price cannot be greater than original price.');
        return;
      }
      if (offerNum > 0 && offerNum < origNum) {
        finalOfferPrice = Math.round(offerNum);
        finalDiscountPercent = Math.round(((origNum - finalOfferPrice) / origNum) * 100);
      }
    }

    if (prodColors.length === 0) {
      setProdFormError('Please add at least one product color.');
      return;
    }
    if (prodSizes.length === 0) {
      setProdFormError('Please add at least one product size.');
      return;
    }

    const stockQtyNum = Math.max(0, Math.floor(Number(prodStockQuantity) || 0));

    setProdSaving(true);
    try {
      const action = editingProduct ? 'update' : 'create';
      const res = await apiFetch('products', `action=${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        }),
        body: JSON.stringify({
          id: editingProduct?.id,
          dbId: editingProduct?.dbId,
          name: trimmedTitle,
          title: trimmedTitle,
          description: trimmedDesc || trimmedTitle,
          shortDescription: (trimmedDesc || trimmedTitle).slice(0, 140),
          category: trimmedCategory,
          image: trimmedImg,
          originalPrice: origNum,
          offerType: prodOfferType,
          offerPrice: finalOfferPrice,
          discountPercent: finalDiscountPercent,
          colors: prodColors,
          sizes: prodSizes,
          inStock: prodInStock,
          stockQuantity: prodInStock ? stockQtyNum : 0,
          published: prodPublished,
        }),
      });

      if (res.status === 401) {
        setAuthenticated(false);
        navigate('/sign-in', { replace: true });
        return;
      }

      const data = await safeJsonParse<{
        success?: boolean;
        product?: Product;
        message?: string;
        error?: string;
      }>(res);

      if (!res.ok || !data.success || !data.product) {
        setProdFormError(data.message || data.error || 'Failed to save product.');
        return;
      }

      const successText = editingProduct
        ? `Product "${data.product.name}" updated successfully.`
        : `Product "${data.product.name}" created successfully.`;

      setProductsActionFeedback({ text: successText, type: 'success' });
      showToast(successText, 'success');
      setProductModalOpen(false);
      setEditingProduct(null);

      await Promise.all([
        fetchAdminProducts(),
        fetchDashboardFoundation(),
        refreshCatalog(),
      ]);
    } catch (err) {
      setProdFormError(
        err instanceof Error ? err.message : 'Network error while saving product.'
      );
    } finally {
      setProdSaving(false);
    }
  };

  // Toggle Publish / Unpublish status directly from Products table
  const handleToggleProductPublish = async (product: Product) => {
    if (togglingProductIds[product.id]) return;
    const nextPublished = product.published === false;
    setProductsActionFeedback(null);
    setTogglingProductIds((prev) => ({ ...prev, [product.id]: true }));

    try {
      const res = await apiFetch('products', 'action=toggle_publish', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        }),
        body: JSON.stringify({
          id: product.id,
          published: nextPublished,
        }),
      });

      if (res.status === 401) {
        setAuthenticated(false);
        navigate('/sign-in', { replace: true });
        return;
      }

      const data = await safeJsonParse<{
        success?: boolean;
        message?: string;
        error?: string;
      }>(res);

      if (!res.ok || !data.success) {
        const errMsg = data.message || data.error || 'Failed to update publish status.';
        setProductsActionFeedback({ text: errMsg, type: 'error' });
        showToast(errMsg, 'error');
        return;
      }

      setAdminProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, published: nextPublished } : p))
      );
      const msg = `"${product.name}" is now ${nextPublished ? 'Published' : 'Unpublished'}.`;
      setProductsActionFeedback({ text: msg, type: 'success' });
      showToast(msg, 'success');
      await Promise.all([fetchDashboardFoundation(), refreshCatalog()]);
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Unable to update publish status.';
      setProductsActionFeedback({ text: errMsg, type: 'error' });
      showToast(errMsg, 'error');
    } finally {
      setTogglingProductIds((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
    }
  };

  // Toggle In Stock / Out of Stock status directly from Products table
  const handleToggleProductStock = async (product: Product) => {
    if (togglingProductIds[product.id]) return;
    const nextInStock = !product.inStock;
    setProductsActionFeedback(null);
    setTogglingProductIds((prev) => ({ ...prev, [product.id]: true }));

    try {
      const res = await apiFetch('products', 'action=toggle_stock', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        }),
        body: JSON.stringify({
          id: product.id,
          inStock: nextInStock,
        }),
      });

      if (res.status === 401) {
        setAuthenticated(false);
        navigate('/sign-in', { replace: true });
        return;
      }

      const data = await safeJsonParse<{
        success?: boolean;
        product?: Product;
        message?: string;
        error?: string;
      }>(res);

      if (!res.ok || !data.success) {
        const errMsg = data.message || data.error || 'Failed to update stock status.';
        setProductsActionFeedback({ text: errMsg, type: 'error' });
        showToast(errMsg, 'error');
        return;
      }

      setAdminProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? {
                ...p,
                inStock: nextInStock,
                stockQuantity:
                  data.product?.stockQuantity ?? (nextInStock ? p.stockQuantity || 10 : 0),
              }
            : p
        )
      );
      const msg = `"${product.name}" marked as ${nextInStock ? 'In Stock' : 'Out of Stock'}.`;
      setProductsActionFeedback({ text: msg, type: 'success' });
      showToast(msg, 'success');
      await Promise.all([fetchDashboardFoundation(), refreshCatalog()]);
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Unable to update stock status.';
      setProductsActionFeedback({ text: errMsg, type: 'error' });
      showToast(errMsg, 'error');
    } finally {
      setTogglingProductIds((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
    }
  };

  // Confirm & Delete Product
  const handleConfirmDeleteProduct = async () => {
    if (!deleteConfirmProduct || deletingProductId) return;
    const target = deleteConfirmProduct;
    setDeletingProductId(target.id);
    setProductsActionFeedback(null);

    try {
      const res = await apiFetch('products', 'action=delete', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        }),
        body: JSON.stringify({ id: target.id }),
      });

      if (res.status === 401) {
        setAuthenticated(false);
        navigate('/sign-in', { replace: true });
        return;
      }

      const data = await safeJsonParse<{
        success?: boolean;
        message?: string;
        error?: string;
      }>(res);

      if (!res.ok || !data.success) {
        const errMsg = data.message || data.error || 'Failed to delete product.';
        setProductsActionFeedback({ text: errMsg, type: 'error' });
        showToast(errMsg, 'error');
        return;
      }

      setAdminProducts((prev) => prev.filter((p) => p.id !== target.id));
      const msg = `Product "${target.name}" deleted.`;
      setProductsActionFeedback({ text: msg, type: 'success' });
      showToast(msg, 'success');
      setDeleteConfirmProduct(null);
      await Promise.all([fetchDashboardFoundation(), refreshCatalog()]);
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Unable to delete product.';
      setProductsActionFeedback({ text: errMsg, type: 'error' });
      showToast(errMsg, 'error');
    } finally {
      setDeletingProductId(null);
    }
  };

  // Real backend status update for Confirm, Reject, and Details status dropdown
  const handleUpdateOrderStatus = async (
    orderNumber: string,
    newStatus: OrderStatusType
  ): Promise<boolean> => {
    if (!orderNumber || updatingOrderIds[orderNumber]) return false;

    setOrdersActionFeedback(null);
    setUpdatingOrderIds((prev) => ({ ...prev, [orderNumber]: true }));

    try {
      const res = await apiFetch('orders', 'action=update_status', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        }),
        body: JSON.stringify({
          orderNumber,
          status: newStatus,
        }),
      });

      if (res.status === 401) {
        setAuthenticated(false);
        navigate('/sign-in', { replace: true });
        return false;
      }

      const data = await safeJsonParse<{
        success?: boolean;
        message?: string;
        error?: string;
        orderNumber?: string;
        status?: OrderStatusType;
        order?: Order;
      }>(res);

      if (!res.ok || !data.success) {
        const errMsg =
          data.message || data.error || `Failed to update order ${orderNumber} status.`;
        setOrdersActionFeedback({ text: errMsg, type: 'error' });
        showToast(errMsg, 'error');
        return false;
      }

      const updatedTimestamp = new Date().toISOString();
      setRecentOrders((prev) =>
        prev.map((ord) =>
          ord.orderNumber === orderNumber
            ? {
                ...ord,
                ...(data.order || {}),
                status: newStatus,
                updatedAt: updatedTimestamp,
              }
            : ord
        )
      );

      setSelectedOrder((prev) =>
        prev && prev.orderNumber === orderNumber
          ? {
              ...prev,
              ...(data.order || {}),
              status: newStatus,
              updatedAt: updatedTimestamp,
            }
          : prev
      );

      setDetailStatusSelection(newStatus);

      const actionLabel =
        newStatus === 'Confirmed'
          ? `Order ${orderNumber} has been confirmed.`
          : newStatus === 'Cancelled'
          ? `Order ${orderNumber} has been rejected and cancelled.`
          : `Order ${orderNumber} status updated to ${newStatus}.`;

      setOrdersActionFeedback({ text: actionLabel, type: 'success' });
      showToast(actionLabel, 'success');

      // Refresh dashboard counts from backend so all stats stay in sync
      await fetchDashboardFoundation();
      return true;
    } catch (err) {
      const errMsg =
        err instanceof Error
          ? err.message
          : 'Network error while updating order status. Please try again.';
      setOrdersActionFeedback({ text: errMsg, type: 'error' });
      showToast(errMsg, 'error');
      return false;
    } finally {
      setUpdatingOrderIds((prev) => {
        const next = { ...prev };
        delete next[orderNumber];
        return next;
      });
    }
  };

  // Handle Sign In submission (supports both authorized Admin and registered Customer)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginLoading) return;
    setLoginError('');

    const trimmedEmail = loginEmail.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setLoginError('Please enter a valid email address.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }

    const requestUrl = '/api/auth?action=login';
    console.info('[MGC Auth] POST', requestUrl);

    setLoginLoading(true);
    try {
      const res = await fetch(requestUrl, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          email: trimmedEmail,
          password: loginPassword,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      const rawText = await res.text();

      let data: {
        success?: boolean;
        authenticated?: boolean;
        customerAuthenticated?: boolean;
        role?: 'admin' | 'customer' | null;
        error?: string;
        message?: string;
        admin?: { email?: string };
        user?: { id?: number; fullName?: string; email?: string; role?: string };
        csrfToken?: string;
        sessionToken?: string;
        customerVaultToken?: string;
      } | null = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!data || !contentType.toLowerCase().includes('application/json')) {
        setLoginError(
          formatAuthDiagnosticError(requestUrl, res.status, contentType, rawText)
        );
        return;
      }

      if (!res.ok || (!data.authenticated && !data.customerAuthenticated)) {
        if (res.status === 400 || res.status === 401) {
          setLoginError(data.message || data.error || 'Invalid email or password.');
        } else {
          setLoginError(
            formatAuthDiagnosticError(
              requestUrl,
              res.status,
              contentType,
              data.message || data.error || rawText
            )
          );
        }
      } else if (data.authenticated && data.role === 'admin') {
        const resolvedEmail = data.admin?.email || trimmedEmail;
        setCustomerSession(null, data.sessionToken || '');
        setAdminSession(
          {
            id: Number(data.user?.id || 1),
            email: resolvedEmail,
            role: 'admin',
          },
          data.sessionToken || ''
        );
        setAuthenticated(true);
        setCustomerAuthenticated(false);
        setAdminEmail(resolvedEmail);
        setCsrfToken(data.csrfToken || '');
        setLoginPassword('');
        navigate('/admin/', { replace: true });
      } else {
        // Customer login -> set customer session state immediately & return customer to storefront, never /admin/
        if (data.customerVaultToken) {
          addStoredCustomerVaultToken(data.customerVaultToken);
        }
        setAdminSession(null);
        setAuthenticated(false);
        setCustomerAuthenticated(true);
        setLoginPassword('');
        if (data.user?.email) {
          setCustomerSession(
            {
              id: Number(data.user.id || 0),
              fullName: String(data.user.fullName || '').trim(),
              email: String(data.user.email || '').trim(),
              role: 'customer',
            },
            data.sessionToken
          );
        }
        await refreshCustomerAuth();
        showToast('Signed in successfully.', 'success');
        navigate('/', { replace: true });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setLoginError(
        formatAuthDiagnosticError(requestUrl, 'NETWORK_ERROR', 'none', errMsg)
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Customer Create Account submission (/create-account)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regLoading) return;
    setRegError('');
    setRegSuccess('');

    const trimmedName = regFullName.trim();
    const trimmedEmail = regEmail.trim();

    if (!trimmedName) {
      setRegError('Please enter your full name.');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setRegError('Please enter a valid email address.');
      return;
    }
    if (!regPassword) {
      setRegError('Please enter a password.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    const requestUrl = '/api/auth?action=register';
    console.info('[MGC Auth] POST', requestUrl);

    setRegLoading(true);
    try {
      const res = await fetch(requestUrl, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          fullName: trimmedName,
          email: trimmedEmail,
          password: regPassword,
          confirmPassword: regConfirmPassword,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      const rawText = await res.text();

      let data: {
        success?: boolean;
        message?: string;
        error?: string;
        customerAuthenticated?: boolean;
        user?: { id?: number; fullName?: string; email?: string; role?: string };
        csrfToken?: string;
        sessionToken?: string;
        customerVaultToken?: string;
      } | null = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!data || !contentType.toLowerCase().includes('application/json')) {
        setRegError(
          formatAuthDiagnosticError(requestUrl, res.status, contentType, rawText)
        );
        return;
      }

      if (!res.ok || !data.success) {
        // Keep normal validation messages for 400 (validation) and 409 (duplicate email)
        if (res.status === 400 || res.status === 409) {
          setRegError(data.message || data.error || 'Unable to create account.');
        } else {
          setRegError(
            formatAuthDiagnosticError(
              requestUrl,
              res.status,
              contentType,
              data.message || data.error || rawText
            )
          );
        }
      } else {
        if (data.customerVaultToken) {
          addStoredCustomerVaultToken(data.customerVaultToken);
        }
        setRegSuccess('Account created successfully.');
        setCustomerAuthenticated(Boolean(data.customerAuthenticated));
        setRegPassword('');
        setRegConfirmPassword('');
        if (data.user?.email) {
          setCustomerSession(
            {
              id: Number(data.user.id || 0),
              fullName: String(data.user.fullName || trimmedName).trim(),
              email: String(data.user.email || trimmedEmail).trim(),
              role: 'customer',
            },
            data.sessionToken
          );
        }
        await refreshCustomerAuth();
        showToast('Account created successfully.', 'success');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 600);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setRegError(
        formatAuthDiagnosticError(requestUrl, 'NETWORK_ERROR', 'none', errMsg)
      );
    } finally {
      setRegLoading(false);
    }
  };

  // Handle Logout action
  const handleLogout = async () => {
    try {
      await apiFetch('auth', 'action=logout', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
    } catch {
      // Clear local auth state even if network fails
    }
    setCustomerSession(null, '');
    setAdminSession(null, '');
    setAuthenticated(false);
    setCustomerAuthenticated(false);
    setAdminEmail('');
    setCsrfToken('');
    setStats(DEFAULT_STATS);
    setRecentOrders([]);
    navigate('/sign-in', { replace: true });
  };

  // Handle Change Password on /admin/settings
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordSaving) return;
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({
        text: 'Please enter your current password.',
        type: 'error',
      });
      return;
    }

    if (!newPassword) {
      setPasswordMessage({
        text: 'Please enter a new password.',
        type: 'error',
      });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({
        text: 'New password must be at least 6 characters long.',
        type: 'error',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        text: 'New passwords do not match.',
        type: 'error',
      });
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await apiFetch('auth', 'action=change_password', {
        method: 'POST',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        }),
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
          confirmNewPassword: confirmPassword,
        }),
      });
      const data = await safeJsonParse<{
        success?: boolean;
        message?: string;
        error?: string;
      }>(res);
      if (!res.ok || !data.success) {
        setPasswordMessage({
          text: data.message || data.error || 'Could not update password.',
          type: 'error',
        });
      } else {
        setPasswordMessage({
          text: 'Password updated successfully.',
          type: 'success',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPasswordMessage({
        text: 'Unable to connect to server.',
        type: 'error',
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center text-[#A1A1AA] text-sm">
        Loading...
      </div>
    );
  }

  // ============================================================================
  // 1. PUBLIC SIGN-IN (/sign-in) & CREATE ACCOUNT (/create-account) PAGES
  // ============================================================================
  if (!authenticated) {
    if (isCreateAccountRoute) {
      return (
        <div className="min-h-screen bg-[#0B0B0C] flex flex-col justify-center items-center px-4 py-12">
          <div className="w-full max-w-md bg-[#121214] border border-white/15 p-8 sm:p-10 shadow-2xl space-y-6">
            <div className="text-center space-y-2 border-b border-white/10 pb-6">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-[0.12em] text-[#D4AF37]">
                MALIK G COLLECTION
              </h1>
              <p className="text-base font-medium text-[#F5F5F0]">
                Create Account
              </p>
            </div>

            {regError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/40 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="whitespace-pre-wrap break-words">{regError}</span>
              </div>
            )}

            {regSuccess && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{regSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRegister} noValidate className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="reg-fullname"
                  className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                >
                  Full Name
                </label>
                <input
                  id="reg-fullname"
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="reg-email"
                  className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                >
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="reg-password"
                  className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                >
                  Password
                </label>
                <input
                  id="reg-password"
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create password"
                  className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="reg-confirm-password"
                  className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                >
                  Confirm Password
                </label>
                <input
                  id="reg-confirm-password"
                  type="password"
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="w-full py-3.5 px-6 bg-[#D4AF37] hover:bg-[#e5c247] disabled:opacity-60 text-[#0B0B0C] text-xs font-bold uppercase tracking-[0.15em] transition-colors"
              >
                {regLoading ? 'Creating Account...' : 'CREATE ACCOUNT'}
              </button>
            </form>

            <div className="pt-2 text-center space-y-1.5">
              <p className="text-xs text-[#A1A1AA]">Already have an account?</p>
              <Link
                to="/sign-in"
                className="inline-block text-xs font-bold uppercase tracking-[0.15em] text-[#D4AF37] hover:text-[#e5c247] transition-colors"
              >
                SIGN IN
              </Link>
            </div>

            <div className="pt-4 border-t border-white/10 text-center">
              <Link
                to="/"
                className="text-xs text-[#A1A1AA] hover:text-[#D4AF37] uppercase tracking-wider"
              >
                ← RETURN TO STORE
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0B0B0C] flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md bg-[#121214] border border-white/15 p-8 sm:p-10 shadow-2xl space-y-6">
          <div className="text-center space-y-2 border-b border-white/10 pb-6">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-[0.12em] text-[#D4AF37]">
              MALIK G COLLECTION
            </h1>
            <p className="text-base font-medium text-[#F5F5F0]">
              Sign In
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/40 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="whitespace-pre-wrap break-words">{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} noValidate className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="signin-email"
                className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
              >
                Email
              </label>
              <input
                id="signin-email"
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="signin-password"
                className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
              >
                Password
              </label>
              <input
                id="signin-password"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 px-6 bg-[#D4AF37] hover:bg-[#e5c247] disabled:opacity-60 text-[#0B0B0C] text-xs font-bold uppercase tracking-[0.15em] transition-colors"
            >
              {loginLoading ? 'Signing In...' : 'SIGN IN'}
            </button>
          </form>

          <div className="pt-2 text-center space-y-1.5">
            <p className="text-xs text-[#A1A1AA]">Don&apos;t have an account?</p>
            <Link
              to="/create-account"
              className="inline-block text-xs font-bold uppercase tracking-[0.15em] text-[#D4AF37] hover:text-[#e5c247] transition-colors"
            >
              CREATE ACCOUNT
            </Link>
          </div>

          <div className="pt-4 border-t border-white/10 text-center">
            <Link
              to="/"
              className="text-xs text-[#A1A1AA] hover:text-[#D4AF37] uppercase tracking-wider"
            >
              ← RETURN TO STORE
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. PROTECTED ADMIN LAYOUT (/admin/*)
  // ============================================================================
  const sidebarContent = (
    <>
      <div>
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <Link
            to="/admin/"
            className="font-display text-xl font-bold tracking-[0.12em] text-[#D4AF37]"
          >
            MALIK G COLLECTION
          </Link>
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            className="lg:hidden p-1.5 text-[#A1A1AA] hover:text-[#F5F5F0]"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1" aria-label="Admin Sidebar Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  active
                    ? 'bg-[#D4AF37] text-[#0B0B0C]'
                    : 'text-[#A1A1AA] hover:bg-white/5 hover:text-[#F5F5F0]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-white/10 space-y-2.5">
        <Link
          to="/"
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#18181B] border border-[#D4AF37]/40 text-xs font-semibold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0B0B0C] transition-colors uppercase tracking-wider"
        >
          <ExternalLink className="w-4 h-4" />
          <span>View Storefront</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors uppercase tracking-wider"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-[#F5F5F0] flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 bg-[#121214] border-r border-white/10 shrink-0 flex-col justify-between">
        {sidebarContent}
      </aside>

      {/* Mobile Header Bar */}
      <div className="lg:hidden bg-[#121214] border-b border-white/10 px-4 h-16 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 -ml-2 text-[#F5F5F0] hover:text-[#D4AF37] transition-colors"
            aria-label="Open navigation drawer"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link
            to="/admin/"
            className="font-display text-lg font-bold tracking-[0.12em] text-[#D4AF37]"
          >
            MALIK G COLLECTION
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#18181B] border border-[#D4AF37]/40 text-xs text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0B0B0C] transition-colors uppercase tracking-wider"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Store</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-xs text-red-300 uppercase tracking-wider"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Responsive Sidebar Drawer */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-black/75 backdrop-blur-xs flex"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <aside
            className="w-64 max-w-[80vw] bg-[#121214] border-r border-white/15 h-full flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 lg:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* ================================================================ */}
          {/* VIEW 1: ADMIN DASHBOARD (/admin/) */}
          {/* ================================================================ */}
          {activeSection === 'dashboard' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5F0]">
                    Dashboard
                  </h1>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    Malik G Collection overview and store activity.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchDashboardFoundation}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#121214] border border-white/15 text-xs text-[#F5F5F0] hover:border-[#D4AF37] transition-colors"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loadingDashboard ? 'animate-spin' : ''}`}
                  />
                  <span>Refresh</span>
                </button>
              </div>

              {/* 9 Required Statistic Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'TOTAL ORDERS', value: String(stats.totalOrders) },
                  { label: 'PENDING ORDERS', value: String(stats.pendingOrders) },
                  { label: 'PROCESSING', value: String(stats.processingOrders) },
                  { label: 'SHIPPED', value: String(stats.shippedOrders) },
                  { label: 'DELIVERED', value: String(stats.deliveredOrders) },
                  { label: 'CANCELLED', value: String(stats.cancelledOrders) },
                  { label: 'TOTAL PRODUCTS', value: String(stats.totalProducts) },
                  { label: 'OUT OF STOCK', value: String(stats.outOfStockProducts) },
                  { label: 'TOTAL SALES', value: formatPKR(stats.totalRevenue), highlight: true },
                ].map((card) => (
                  <div
                    key={card.label}
                    className={`bg-[#121214] border p-5 space-y-2 ${
                      card.highlight ? 'border-[#D4AF37]/40' : 'border-white/10'
                    }`}
                  >
                    <span className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
                      {card.label}
                    </span>
                    <div
                      className={`font-mono-num text-2xl font-bold ${
                        card.highlight ? 'text-[#D4AF37]' : 'text-[#F5F5F0]'
                      }`}
                    >
                      {card.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions Section */}
              <div className="bg-[#121214] border border-white/10 p-6 space-y-4">
                <h2 className="font-display text-xl font-bold text-[#F5F5F0]">
                  Quick Actions
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to="/admin/orders"
                    className="px-5 py-3 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    View Orders
                  </Link>
                  <Link
                    to="/admin/products"
                    className="px-5 py-3 bg-[#18181B] border border-white/15 hover:border-[#D4AF37] text-[#F5F5F0] text-xs font-semibold uppercase tracking-wider transition-colors"
                  >
                    Manage Products
                  </Link>
                </div>
              </div>

              {/* Recent Orders Section */}
              <div className="bg-[#121214] border border-white/10 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-[#F5F5F0]">
                    Recent Orders
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-[#A1A1AA] uppercase text-[11px]">
                        <th className="py-3 px-3">Order ID</th>
                        <th className="py-3 px-3">Customer</th>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Total</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {recentOrders.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-8 px-3 text-center text-sm text-[#A1A1AA]"
                          >
                            No orders yet.
                          </td>
                        </tr>
                      ) : (
                        recentOrders.slice(0, 5).map((ord) => (
                          <tr key={ord.orderNumber} className="hover:bg-white/5">
                            <td className="py-3 px-3 font-mono-num font-bold text-[#D4AF37]">
                              {ord.orderNumber}
                            </td>
                            <td className="py-3 px-3 font-medium text-[#F5F5F0]">
                              {ord.customer.fullName}
                            </td>
                            <td className="py-3 px-3 font-mono-num text-xs text-[#A1A1AA]">
                              {new Date(ord.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3 text-[#D4AF37] font-semibold">
                              {ord.status}
                            </td>
                            <td className="py-3 px-3 font-mono-num font-semibold text-[#F5F5F0]">
                              {formatPKR(ord.total)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  handleOpenOrderDetails(ord);
                                  navigate('/admin/orders');
                                }}
                                className="inline-block px-3 py-1.5 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] font-bold text-xs uppercase tracking-wider transition-colors"
                              >
                                View Order
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ================================================================ */}
          {/* VIEW 2: ORDERS MANAGEMENT (/admin/orders) */}
          {/* ================================================================ */}
          {activeSection === 'orders' && (() => {
            const normalizedSearch = orderSearchQuery.trim().toLowerCase();
            const filteredOrders = recentOrders.filter((ord) => {
              const matchesStatus =
                orderStatusFilter === 'All' || ord.status === orderStatusFilter;
              if (!matchesStatus) return false;
              if (!normalizedSearch) return true;
              const idMatch = ord.orderNumber.toLowerCase().includes(normalizedSearch);
              const nameMatch = (ord.customer?.fullName || '')
                .toLowerCase()
                .includes(normalizedSearch);
              const phoneMatch = (ord.customer?.phone || '')
                .toLowerCase()
                .includes(normalizedSearch);
              return idMatch || nameMatch || phoneMatch;
            });

            const statusCounts: Record<'All' | OrderStatusType, number> = {
              All: recentOrders.length,
              Pending: recentOrders.filter((o) => o.status === 'Pending').length,
              Confirmed: recentOrders.filter((o) => o.status === 'Confirmed').length,
              Processing: recentOrders.filter((o) => o.status === 'Processing').length,
              Shipped: recentOrders.filter((o) => o.status === 'Shipped').length,
              Delivered: recentOrders.filter((o) => o.status === 'Delivered').length,
              Cancelled: recentOrders.filter((o) => o.status === 'Cancelled').length,
            };

            return (
              <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
                      Order Management
                    </p>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5F0] mt-1">
                      Orders ({filteredOrders.length})
                    </h1>
                    <p className="text-xs text-[#A1A1AA] mt-1">
                      Review customer WhatsApp orders, confirm or reject pending orders, and manage fulfillment status.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOrdersActionFeedback(null);
                        fetchDashboardFoundation();
                      }}
                      disabled={loadingDashboard}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#121214] border border-white/15 text-xs font-semibold uppercase tracking-wider text-[#F5F5F0] hover:border-[#D4AF37] disabled:opacity-60 transition-colors"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${loadingDashboard ? 'animate-spin' : ''}`}
                      />
                      <span>Refresh</span>
                    </button>
                    <Link
                      to="/admin/"
                      className="px-4 py-2.5 bg-[#18181B] border border-white/15 text-xs font-semibold text-[#A1A1AA] hover:text-[#D4AF37] hover:border-[#D4AF37] uppercase tracking-wider transition-colors"
                    >
                      ← Back to Dashboard
                    </Link>
                  </div>
                </div>

                {/* Action Feedback Banner (Success / Error) */}
                {ordersActionFeedback && (
                  <div
                    className={`p-4 border text-xs flex items-center justify-between gap-3 ${
                      ordersActionFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/40 text-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {ordersActionFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{ordersActionFeedback.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOrdersActionFeedback(null)}
                      className="text-current opacity-75 hover:opacity-100"
                      aria-label="Dismiss message"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Fetch Error Banner */}
                {ordersError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/40 text-xs text-red-300 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{ordersError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={fetchDashboardFoundation}
                      className="px-3 py-1 bg-red-500/20 border border-red-500/40 text-red-200 font-semibold uppercase tracking-wider"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Search & Status Filters Bar */}
                <div className="bg-[#121214] border border-white/10 p-4 sm:p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-8 relative">
                      <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        placeholder="Search by Order ID (e.g. MGC-123456), customer name, or phone number..."
                        aria-label="Search orders by Order ID, customer name, or phone number"
                        className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] pl-10 pr-9 py-2.5 text-sm text-[#F5F5F0] placeholder-[#A1A1AA]/60 focus:outline-none"
                      />
                      {orderSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setOrderSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#F5F5F0]"
                          aria-label="Clear search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="md:col-span-4">
                      <select
                        value={orderStatusFilter}
                        onChange={(e) =>
                          setOrderStatusFilter(e.target.value as 'All' | OrderStatusType)
                        }
                        aria-label="Filter orders by status"
                        className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-[#F5F5F0] focus:outline-none"
                      >
                        {ORDER_STATUS_FILTERS.map((st) => (
                          <option key={st} value={st}>
                            Status: {st} ({statusCounts[st]})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quick Filter Tabs */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {ORDER_STATUS_FILTERS.map((st) => {
                      const active = orderStatusFilter === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setOrderStatusFilter(st)}
                          className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-colors ${
                            active
                              ? 'bg-[#D4AF37] text-[#0B0B0C] border-[#D4AF37]'
                              : 'bg-[#18181B] text-[#A1A1AA] border-white/10 hover:border-white/30 hover:text-[#F5F5F0]'
                          }`}
                        >
                          <span>{st}</span>
                          <span className="ml-1.5 font-mono-num opacity-80">
                            ({statusCounts[st]})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Orders Table */}
                <div className="bg-[#121214] border border-white/10 overflow-x-auto">
                  {loadingDashboard && recentOrders.length === 0 ? (
                    <div className="py-16 px-4 text-center space-y-3">
                      <RefreshCw className="w-6 h-6 text-[#D4AF37] animate-spin mx-auto" />
                      <p className="text-sm text-[#A1A1AA]">Loading customer orders...</p>
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="py-16 px-4 text-center space-y-3">
                      <p className="text-base font-medium text-[#F5F5F0]">
                        {recentOrders.length === 0
                          ? 'No orders have been placed yet.'
                          : 'No orders match your current search or status filter.'}
                      </p>
                      <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
                        {recentOrders.length === 0
                          ? 'When customers place orders through the storefront WhatsApp checkout, they will appear here automatically.'
                          : 'Try clearing your search query or switching the status filter to All.'}
                      </p>
                      {(orderSearchQuery || orderStatusFilter !== 'All') && (
                        <button
                          type="button"
                          onClick={() => {
                            setOrderSearchQuery('');
                            setOrderStatusFilter('All');
                          }}
                          className="inline-block mt-2 px-4 py-2 bg-[#18181B] border border-white/15 hover:border-[#D4AF37] text-xs font-semibold uppercase tracking-wider text-[#D4AF37]"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-[#A1A1AA] bg-[#18181B]/60">
                          <th className="py-3.5 px-4">Order ID</th>
                          <th className="py-3.5 px-4">Customer Name</th>
                          <th className="py-3.5 px-4">Phone</th>
                          <th className="py-3.5 px-4">Date</th>
                          <th className="py-3.5 px-4">Total Amount</th>
                          <th className="py-3.5 px-4">Order Method</th>
                          <th className="py-3.5 px-4">Current Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {filteredOrders.map((ord) => {
                          const isUpdating = Boolean(updatingOrderIds[ord.orderNumber]);
                          const orderMethod = ord.paymentMethod || 'WhatsApp Order';
                          return (
                            <tr
                              key={ord.orderNumber}
                              className="hover:bg-white/[0.03] transition-colors"
                            >
                              <td className="py-4 px-4 font-mono-num font-bold text-[#D4AF37] whitespace-nowrap">
                                {ord.orderNumber}
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-medium text-[#F5F5F0]">
                                  {ord.customer?.fullName || 'Customer'}
                                </div>
                                {ord.customer?.city && (
                                  <div className="text-[11px] text-[#A1A1AA]">
                                    {ord.customer.city}
                                  </div>
                                )}
                              </td>
                              <td className="py-4 px-4 font-mono-num text-xs text-[#F5F5F0] whitespace-nowrap">
                                {ord.customer?.phone || '—'}
                              </td>
                              <td className="py-4 px-4 font-mono-num text-xs text-[#A1A1AA] whitespace-nowrap">
                                {formatOrderDateTime(ord.createdAt)}
                              </td>
                              <td className="py-4 px-4 font-mono-num font-bold text-[#F5F5F0] whitespace-nowrap">
                                {formatPKR(ord.total)}
                              </td>
                              <td className="py-4 px-4 text-xs text-[#A1A1AA] whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-1 bg-[#18181B] border border-white/10 text-[11px] text-[#F5F5F0]">
                                  {orderMethod}
                                </span>
                              </td>
                              <td className="py-4 px-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 border text-[11px] font-semibold uppercase tracking-wider ${getStatusBadgeClasses(
                                    ord.status
                                  )}`}
                                >
                                  {ord.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex flex-wrap items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenOrderDetails(ord)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] font-bold text-[11px] uppercase tracking-wider transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>VIEW ORDER</span>
                                  </button>

                                  {ord.status === 'Pending' && (
                                    <>
                                      <button
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() =>
                                          handleUpdateOrderStatus(ord.orderNumber, 'Confirmed')
                                        }
                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 disabled:opacity-50 font-bold text-[11px] uppercase tracking-wider transition-colors"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>
                                          {isUpdating ? 'SAVING...' : 'CONFIRM ORDER'}
                                        </span>
                                      </button>

                                      <button
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => setRejectConfirmOrder(ord)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 disabled:opacity-50 font-bold text-[11px] uppercase tracking-wider transition-colors"
                                      >
                                        <Ban className="w-3.5 h-3.5" />
                                        <span>REJECT ORDER</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ================================================================ */}
          {/* VIEW 3: PRODUCTS MANAGEMENT (/admin/products) */}
          {/* ================================================================ */}
          {activeSection === 'products' && (() => {
            const normalizedSearch = productSearchQuery.trim().toLowerCase();
            const filteredProducts = adminProducts.filter((prod) => {
              if (
                productCategoryFilter !== 'All' &&
                prod.category.toLowerCase() !== productCategoryFilter.toLowerCase()
              ) {
                return false;
              }
              if (productPublishFilter === 'Published' && prod.published === false) {
                return false;
              }
              if (productPublishFilter === 'Unpublished' && prod.published !== false) {
                return false;
              }
              if (productStockFilter === 'In Stock' && !prod.inStock) {
                return false;
              }
              if (productStockFilter === 'Out of Stock' && prod.inStock) {
                return false;
              }
              if (!normalizedSearch) return true;
              const nameMatch = (prod.name || '').toLowerCase().includes(normalizedSearch);
              const catMatch = (prod.category || '').toLowerCase().includes(normalizedSearch);
              const skuMatch = (prod.sku || '').toLowerCase().includes(normalizedSearch);
              return nameMatch || catMatch || skuMatch;
            });

            const publishedCount = adminProducts.filter((p) => p.published !== false).length;
            const unpublishedCount = adminProducts.filter((p) => p.published === false).length;
            const outOfStockCount = adminProducts.filter((p) => !p.inStock).length;

            return (
              <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
                      Catalog Management
                    </p>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5F0] mt-1">
                      Products ({filteredProducts.length})
                    </h1>
                    <p className="text-xs text-[#A1A1AA] mt-1">
                      Add, edit, price, discount, publish/unpublish, and manage inventory for Malik G Collection products.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setProductsActionFeedback(null);
                        fetchAdminProducts();
                      }}
                      disabled={loadingProducts}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#121214] border border-white/15 text-xs font-semibold uppercase tracking-wider text-[#F5F5F0] hover:border-[#D4AF37] disabled:opacity-60 transition-colors"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${loadingProducts ? 'animate-spin' : ''}`}
                      />
                      <span>Refresh</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenAddProductModal}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] text-xs font-bold uppercase tracking-[0.14em] transition-colors shadow-lg"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>+ ADD PRODUCT</span>
                    </button>
                  </div>
                </div>

                {/* Quick Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#121214] border border-white/10 p-4">
                    <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                      Total Products
                    </span>
                    <span className="font-mono-num text-xl font-bold text-[#F5F5F0] mt-1 block">
                      {adminProducts.length}
                    </span>
                  </div>
                  <div className="bg-[#121214] border border-white/10 p-4">
                    <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                      Published
                    </span>
                    <span className="font-mono-num text-xl font-bold text-emerald-400 mt-1 block">
                      {publishedCount}
                    </span>
                  </div>
                  <div className="bg-[#121214] border border-white/10 p-4">
                    <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                      Unpublished
                    </span>
                    <span className="font-mono-num text-xl font-bold text-amber-300 mt-1 block">
                      {unpublishedCount}
                    </span>
                  </div>
                  <div className="bg-[#121214] border border-white/10 p-4">
                    <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                      Out of Stock
                    </span>
                    <span className="font-mono-num text-xl font-bold text-red-400 mt-1 block">
                      {outOfStockCount}
                    </span>
                  </div>
                </div>

                {/* Action Feedback Banner */}
                {productsActionFeedback && (
                  <div
                    className={`p-4 border text-xs flex items-center justify-between gap-3 ${
                      productsActionFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/40 text-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {productsActionFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{productsActionFeedback.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProductsActionFeedback(null)}
                      className="text-current opacity-75 hover:opacity-100"
                      aria-label="Dismiss message"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Fetch Error Banner */}
                {productsError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/40 text-xs text-red-300 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{productsError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={fetchAdminProducts}
                      className="px-3 py-1 bg-red-500/20 border border-red-500/40 text-red-200 font-semibold uppercase tracking-wider"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Search & Filters Bar */}
                <div className="bg-[#121214] border border-white/10 p-4 sm:p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-5 relative">
                      <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        placeholder="Search by product title, category, or SKU..."
                        aria-label="Search products"
                        className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] pl-10 pr-9 py-2.5 text-sm text-[#F5F5F0] placeholder-[#A1A1AA]/60 focus:outline-none"
                      />
                      {productSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setProductSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#F5F5F0]"
                          aria-label="Clear product search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="md:col-span-3">
                      <select
                        value={productCategoryFilter}
                        onChange={(e) => setProductCategoryFilter(e.target.value)}
                        aria-label="Filter products by category"
                        className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-3.5 py-2.5 text-xs sm:text-sm text-[#F5F5F0] focus:outline-none"
                      >
                        <option value="All">Category: All</option>
                        {adminCategoryRecords.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            Category: {cat.name}{cat.active === false ? ' (Inactive)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <select
                        value={productPublishFilter}
                        onChange={(e) =>
                          setProductPublishFilter(
                            e.target.value as 'All' | 'Published' | 'Unpublished'
                          )
                        }
                        aria-label="Filter products by publish status"
                        className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-3.5 py-2.5 text-xs sm:text-sm text-[#F5F5F0] focus:outline-none"
                      >
                        <option value="All">Visibility: All</option>
                        <option value="Published">Published</option>
                        <option value="Unpublished">Unpublished</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <select
                        value={productStockFilter}
                        onChange={(e) =>
                          setProductStockFilter(
                            e.target.value as 'All' | 'In Stock' | 'Out of Stock'
                          )
                        }
                        aria-label="Filter products by stock status"
                        className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-3.5 py-2.5 text-xs sm:text-sm text-[#F5F5F0] focus:outline-none"
                      >
                        <option value="All">Stock: All</option>
                        <option value="In Stock">In Stock</option>
                        <option value="Out of Stock">Out of Stock</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Products Table */}
                <div className="bg-[#121214] border border-white/10 overflow-x-auto">
                  {loadingProducts && adminProducts.length === 0 ? (
                    <div className="py-16 px-4 text-center space-y-3">
                      <RefreshCw className="w-6 h-6 text-[#D4AF37] animate-spin mx-auto" />
                      <p className="text-sm text-[#A1A1AA]">Loading products catalog...</p>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="py-16 px-4 text-center space-y-3">
                      <p className="text-base font-medium text-[#F5F5F0]">
                        {adminProducts.length === 0
                          ? 'No products in your catalog yet.'
                          : 'No products match your current search or filters.'}
                      </p>
                      <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
                        {adminProducts.length === 0
                          ? 'Click + ADD PRODUCT above to add your first item to Malik G Collection.'
                          : 'Try clearing your search or resetting the category/status filters.'}
                      </p>
                      {(productSearchQuery ||
                        productCategoryFilter !== 'All' ||
                        productPublishFilter !== 'All' ||
                        productStockFilter !== 'All') && (
                        <button
                          type="button"
                          onClick={() => {
                            setProductSearchQuery('');
                            setProductCategoryFilter('All');
                            setProductPublishFilter('All');
                            setProductStockFilter('All');
                          }}
                          className="inline-block mt-2 px-4 py-2 bg-[#18181B] border border-white/15 hover:border-[#D4AF37] text-xs font-semibold uppercase tracking-wider text-[#D4AF37]"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-[#A1A1AA] bg-[#18181B]/60">
                          <th className="py-3.5 px-4">Product</th>
                          <th className="py-3.5 px-4">Category</th>
                          <th className="py-3.5 px-4">Original Price</th>
                          <th className="py-3.5 px-4">Offer Price</th>
                          <th className="py-3.5 px-4">Discount</th>
                          <th className="py-3.5 px-4">Stock / Availability</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {filteredProducts.map((prod) => {
                          const imgSrc = resolveSnapshotImage(prod.image, prod.id);
                          const origPrice = Number(
                            prod.originalPrice ?? prod.oldPrice ?? prod.price ?? 0
                          );
                          const hasOffer =
                            (prod.offerPrice !== null &&
                              prod.offerPrice !== undefined &&
                              Number(prod.offerPrice) > 0 &&
                              Number(prod.offerPrice) < origPrice) ||
                            (Number(prod.price) > 0 && Number(prod.price) < origPrice);
                          const offerVal = hasOffer
                            ? Number(prod.offerPrice ?? prod.price)
                            : null;
                          const discountPct =
                            hasOffer && origPrice > 0 && offerVal !== null
                              ? prod.discountPercent && prod.discountPercent > 0
                                ? prod.discountPercent
                                : Math.round(((origPrice - offerVal) / origPrice) * 100)
                              : 0;
                          const isPublished = prod.published !== false;
                          const isToggling = Boolean(togglingProductIds[prod.id]);
                          const stockQty =
                            typeof prod.stockQuantity === 'number'
                              ? prod.stockQuantity
                              : prod.inStock
                              ? 25
                              : 0;

                          return (
                            <tr
                              key={prod.id}
                              className="hover:bg-white/[0.03] transition-colors"
                            >
                              {/* Image + Title + Colors/Sizes */}
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3.5">
                                  <div className="w-12 h-16 bg-[#18181B] border border-white/15 shrink-0 overflow-hidden">
                                    <SafeImage
                                      src={imgSrc}
                                      alt={prod.name}
                                      fallbackTitle={prod.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-[#F5F5F0] truncate max-w-[220px] sm:max-w-[280px]">
                                      {prod.name}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[#A1A1AA]">
                                      {Array.isArray(prod.sizes) && prod.sizes.length > 0 && (
                                        <span>Sizes: {prod.sizes.join(', ')}</span>
                                      )}
                                      {Array.isArray(prod.colors) && prod.colors.length > 0 && (
                                        <span>
                                          • {prod.colors.map((c) => c.name).join(', ')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Category */}
                              <td className="py-4 px-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-1 bg-[#18181B] border border-white/10 text-xs text-[#D4AF37] font-medium">
                                  {prod.category}
                                </span>
                              </td>

                              {/* Original Price */}
                              <td className="py-4 px-4 font-mono-num whitespace-nowrap">
                                <span
                                  className={
                                    hasOffer
                                      ? 'text-[#A1A1AA] line-through text-xs'
                                      : 'text-[#F5F5F0] font-semibold'
                                  }
                                >
                                  {formatPKR(origPrice)}
                                </span>
                              </td>

                              {/* Offer Price */}
                              <td className="py-4 px-4 font-mono-num whitespace-nowrap">
                                {hasOffer && offerVal !== null ? (
                                  <span className="text-[#D4AF37] font-bold">
                                    {formatPKR(offerVal)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-[#A1A1AA]">—</span>
                                )}
                              </td>

                              {/* Discount Percentage */}
                              <td className="py-4 px-4 font-mono-num whitespace-nowrap">
                                {hasOffer && discountPct > 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37] text-xs font-bold">
                                    -{discountPct}% OFF
                                  </span>
                                ) : (
                                  <span className="text-xs text-[#A1A1AA]">No Offer</span>
                                )}
                              </td>

                              {/* Stock / Availability */}
                              <td className="py-4 px-4 whitespace-nowrap">
                                <div className="flex flex-col items-start gap-1">
                                  <button
                                    type="button"
                                    disabled={isToggling}
                                    onClick={() => handleToggleProductStock(prod)}
                                    title="Click to toggle In Stock / Out of Stock"
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 ${
                                      prod.inStock
                                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                                        : 'bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25'
                                    }`}
                                  >
                                    <span>{prod.inStock ? 'In Stock' : 'Out of Stock'}</span>
                                  </button>
                                  <span className="text-[11px] font-mono-num text-[#A1A1AA]">
                                    Qty: {prod.inStock ? stockQty : 0}
                                  </span>
                                </div>
                              </td>

                              {/* Published / Unpublished Status */}
                              <td className="py-4 px-4 whitespace-nowrap">
                                <button
                                  type="button"
                                  disabled={isToggling}
                                  onClick={() => handleToggleProductPublish(prod)}
                                  title="Click to toggle Published / Unpublished"
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 ${
                                    isPublished
                                      ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/25'
                                      : 'bg-white/5 border-white/20 text-[#A1A1AA] hover:text-[#F5F5F0]'
                                  }`}
                                >
                                  {isPublished ? (
                                    <>
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Published</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="w-3.5 h-3.5" />
                                      <span>Unpublished</span>
                                    </>
                                  )}
                                </button>
                              </td>

                              {/* Edit & Delete Actions */}
                              <td className="py-4 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditProductModal(prod)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#18181B] hover:bg-[#D4AF37] text-[#F5F5F0] hover:text-[#0B0B0C] border border-white/15 hover:border-[#D4AF37] font-bold text-[11px] uppercase tracking-wider transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmProduct(prod)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold text-[11px] uppercase tracking-wider transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ================================================================ */}
          {/* VIEW 4: CATEGORIES MANAGEMENT (/admin/categories) */}
          {/* ================================================================ */}
          {activeSection === 'categories' && (() => {
            const normalizedCatSearch = categorySearchQuery.trim().toLowerCase();
            const filteredCategories = adminCategoryRecords.filter((cat) => {
              if (!normalizedCatSearch) return true;
              return (cat.name || '').toLowerCase().includes(normalizedCatSearch);
            });

            const activeCategoriesCount = adminCategoryRecords.filter(
              (c) => c.active !== false
            ).length;
            const inactiveCategoriesCount = adminCategoryRecords.filter(
              (c) => c.active === false
            ).length;

            return (
              <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
                      Catalog Structure
                    </p>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5F0] mt-1">
                      Categories ({filteredCategories.length})
                    </h1>
                    <p className="text-xs text-[#A1A1AA] mt-1">
                      Manage store categories, active/inactive visibility, and product assignments for Malik G Collection.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCategoriesActionFeedback(null);
                        fetchAdminCategories();
                      }}
                      disabled={loadingCategories}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#121214] border border-white/15 text-xs font-semibold uppercase tracking-wider text-[#F5F5F0] hover:border-[#D4AF37] disabled:opacity-60 transition-colors"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${loadingCategories ? 'animate-spin' : ''}`}
                      />
                      <span>Refresh</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenAddCategoryModal}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] text-xs font-bold uppercase tracking-[0.14em] transition-colors shadow-lg"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>+ ADD CATEGORY</span>
                    </button>
                  </div>
                </div>

                {/* Summary Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#121214] border border-white/10 p-4">
                    <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                      Total Categories
                    </span>
                    <span className="font-mono-num text-xl font-bold text-[#F5F5F0] mt-1 block">
                      {adminCategoryRecords.length}
                    </span>
                  </div>
                  <div className="bg-[#121214] border border-white/10 p-4">
                    <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                      Active Categories
                    </span>
                    <span className="font-mono-num text-xl font-bold text-emerald-400 mt-1 block">
                      {activeCategoriesCount}
                    </span>
                  </div>
                  <div className="bg-[#121214] border border-white/10 p-4">
                    <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                      Inactive Categories
                    </span>
                    <span className="font-mono-num text-xl font-bold text-amber-300 mt-1 block">
                      {inactiveCategoriesCount}
                    </span>
                  </div>
                </div>

                {/* Action Feedback Banner */}
                {categoriesActionFeedback && (
                  <div
                    className={`p-4 border text-xs flex items-center justify-between gap-3 ${
                      categoriesActionFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/40 text-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {categoriesActionFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{categoriesActionFeedback.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCategoriesActionFeedback(null)}
                      className="text-current opacity-75 hover:opacity-100"
                      aria-label="Dismiss message"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Fetch Error Banner */}
                {categoriesError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/40 text-xs text-red-300 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{categoriesError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={fetchAdminCategories}
                      className="px-3 py-1 bg-red-500/20 border border-red-500/40 text-red-200 font-semibold uppercase tracking-wider"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Search Bar */}
                <div className="bg-[#121214] border border-white/10 p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={categorySearchQuery}
                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                        placeholder="Search categories by name (e.g. Shirts, Watches)..."
                        aria-label="Search categories by name"
                        className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] pl-10 pr-9 py-2.5 text-sm text-[#F5F5F0] placeholder-[#A1A1AA]/60 focus:outline-none"
                      />
                      {categorySearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCategorySearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#F5F5F0]"
                          aria-label="Clear category search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {categorySearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCategorySearchQuery('')}
                        className="px-4 py-2.5 bg-[#18181B] border border-white/15 hover:border-[#D4AF37] text-xs font-semibold uppercase tracking-wider text-[#D4AF37] transition-colors"
                      >
                        Reset Search
                      </button>
                    )}
                  </div>
                </div>

                {/* Categories Table */}
                <div className="bg-[#121214] border border-white/10 overflow-x-auto">
                  {loadingCategories && adminCategoryRecords.length === 0 ? (
                    <div className="py-16 px-4 text-center space-y-3">
                      <RefreshCw className="w-6 h-6 text-[#D4AF37] animate-spin mx-auto" />
                      <p className="text-sm text-[#A1A1AA]">Loading store categories...</p>
                    </div>
                  ) : filteredCategories.length === 0 ? (
                    <div className="py-16 px-4 text-center space-y-3">
                      <p className="text-base font-medium text-[#F5F5F0]">
                        {adminCategoryRecords.length === 0
                          ? 'No categories found in the database.'
                          : 'No categories match your current search query.'}
                      </p>
                      <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
                        {adminCategoryRecords.length === 0
                          ? 'Click + ADD CATEGORY above to create your first store category.'
                          : 'Try clearing your search filter to view all categories.'}
                      </p>
                      {categorySearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCategorySearchQuery('')}
                          className="inline-block mt-2 px-4 py-2 bg-[#18181B] border border-white/15 hover:border-[#D4AF37] text-xs font-semibold uppercase tracking-wider text-[#D4AF37]"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-[#A1A1AA] bg-[#18181B]/60">
                          <th className="py-3.5 px-4">Category Name</th>
                          <th className="py-3.5 px-4">Description</th>
                          <th className="py-3.5 px-4">Products</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4">Created Date</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {filteredCategories.map((cat) => {
                          const isActive = cat.active !== false;
                          const isToggling = Boolean(togglingCategoryIds[cat.id]);
                          const productCount =
                            typeof cat.productCount === 'number'
                              ? cat.productCount
                              : adminProducts.filter(
                                  (p) =>
                                    p.categoryId === cat.id ||
                                    (p.category || '').toLowerCase() === cat.name.toLowerCase()
                                ).length;
                          const createdFormatted = cat.createdAt
                            ? formatOrderDateTime(cat.createdAt)
                            : '—';

                          return (
                            <tr
                              key={cat.id}
                              className="hover:bg-white/[0.03] transition-colors"
                            >
                              {/* Category Name */}
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2.5">
                                  <span className="font-semibold text-[#F5F5F0]">
                                    {cat.name}
                                  </span>
                                  <span className="text-[11px] font-mono-num text-[#A1A1AA]">
                                    #{cat.id}
                                  </span>
                                </div>
                              </td>

                              {/* Description */}
                              <td className="py-4 px-4 text-xs text-[#A1A1AA] max-w-[260px]">
                                <p className="truncate">
                                  {cat.description || cat.subtitle || '—'}
                                </p>
                              </td>

                              {/* Number of Products */}
                              <td className="py-4 px-4 font-mono-num whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 border text-xs font-semibold ${
                                    productCount > 0
                                      ? 'bg-[#18181B] border-white/15 text-[#D4AF37]'
                                      : 'bg-white/5 border-white/10 text-[#A1A1AA]'
                                  }`}
                                >
                                  {productCount} {productCount === 1 ? 'Product' : 'Products'}
                                </span>
                              </td>

                              {/* Active / Inactive Status */}
                              <td className="py-4 px-4 whitespace-nowrap">
                                <button
                                  type="button"
                                  disabled={isToggling}
                                  onClick={() => handleToggleCategoryActive(cat)}
                                  title="Click to toggle Active / Inactive status"
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 ${
                                    isActive
                                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                                      : 'bg-white/5 border-white/20 text-[#A1A1AA] hover:text-[#F5F5F0]'
                                  }`}
                                >
                                  {isActive ? (
                                    <>
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Active</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="w-3.5 h-3.5" />
                                      <span>Inactive</span>
                                    </>
                                  )}
                                </button>
                              </td>

                              {/* Created Date */}
                              <td className="py-4 px-4 font-mono-num text-xs text-[#A1A1AA] whitespace-nowrap">
                                {createdFormatted}
                              </td>

                              {/* Edit & Delete Actions */}
                              <td className="py-4 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditCategoryModal(cat)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#18181B] hover:bg-[#D4AF37] text-[#F5F5F0] hover:text-[#0B0B0C] border border-white/15 hover:border-[#D4AF37] font-bold text-[11px] uppercase tracking-wider transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeleteCategoryModalError('');
                                      setDeleteConfirmCategory(cat);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold text-[11px] uppercase tracking-wider transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ================================================================ */}
          {/* VIEW 5: SALES MANAGEMENT (/admin/sales) */}
          {/* ================================================================ */}
          {activeSection === 'sales' && (() => {
            // Deduplicate orders by orderNumber so no order is ever counted more than once
            const seenOrderKeys = new Set<string>();
            const uniqueOrders: Order[] = [];
            for (const ord of recentOrders) {
              const key = String(ord.orderNumber || ord.id || '').trim().toLowerCase();
              if (key) {
                if (seenOrderKeys.has(key)) continue;
                seenOrderKeys.add(key);
              }
              uniqueOrders.push(ord);
            }

            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const startOfLast7Days = new Date(startOfToday);
            startOfLast7Days.setDate(startOfLast7Days.getDate() - 6);
            const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

            const matchesDateFilter = (ord: Order, period: 'all' | 'today' | 'last7days' | 'month'): boolean => {
              if (period === 'all') return true;
              const created = new Date(ord.createdAt);
              if (Number.isNaN(created.getTime())) return false;
              if (period === 'today') {
                return (
                  created >= startOfToday ||
                  (ord.createdAt || '').slice(0, 10) === now.toISOString().slice(0, 10)
                );
              }
              if (period === 'last7days') {
                return created >= startOfLast7Days;
              }
              if (period === 'month') {
                return (
                  (created.getFullYear() === now.getFullYear() &&
                    created.getMonth() === now.getMonth()) ||
                  created >= startOfThisMonth
                );
              }
              return true;
            };

            const isCompletedSaleOrder = (status: OrderStatusType): boolean =>
              status === 'Confirmed' ||
              status === 'Processing' ||
              status === 'Shipped' ||
              status === 'Delivered';

            // Overall real database figures (across all saved unique orders)
            let totalOrdersCount = 0;
            let pendingOrdersCount = 0;
            let confirmedOrdersCount = 0;
            let processingOrdersCount = 0;
            let shippedOrdersCount = 0;
            let deliveredOrdersCount = 0;
            let cancelledOrdersCount = 0;

            let totalSalesRevenue = 0; // All non-cancelled confirmed orders (Confirmed, Processing, Shipped, Delivered)
            let deliveredSalesRevenue = 0; // Delivered orders only
            let pendingOrdersValue = 0; // Pending orders (excluded from completed sales revenue)
            let cancelledOrdersValue = 0; // Cancelled orders (excluded from revenue)

            for (const ord of uniqueOrders) {
              totalOrdersCount++;
              const amount = Number(ord.total || 0);

              if (ord.status === 'Pending') {
                pendingOrdersCount++;
                pendingOrdersValue += amount;
              } else if (ord.status === 'Confirmed') {
                confirmedOrdersCount++;
                totalSalesRevenue += amount;
              } else if (ord.status === 'Processing') {
                processingOrdersCount++;
                totalSalesRevenue += amount;
              } else if (ord.status === 'Shipped') {
                shippedOrdersCount++;
                totalSalesRevenue += amount;
              } else if (ord.status === 'Delivered') {
                deliveredOrdersCount++;
                totalSalesRevenue += amount;
                deliveredSalesRevenue += amount;
              } else if (ord.status === 'Cancelled') {
                cancelledOrdersCount++;
                cancelledOrdersValue += amount;
              }
            }

            const completedSalesOrdersCount =
              confirmedOrdersCount +
              processingOrdersCount +
              shippedOrdersCount +
              deliveredOrdersCount;

            // Filter orders by Date Range, Status, and Search Query
            const normalizedSearch = salesSearchQuery.trim().toLowerCase();
            const dateFilteredOrders = uniqueOrders.filter((ord) =>
              matchesDateFilter(ord, salesDateFilter)
            );

            const statusCountsInDateRange: Record<'All' | OrderStatusType, number> = {
              All: dateFilteredOrders.length,
              Pending: dateFilteredOrders.filter((o) => o.status === 'Pending').length,
              Confirmed: dateFilteredOrders.filter((o) => o.status === 'Confirmed').length,
              Processing: dateFilteredOrders.filter((o) => o.status === 'Processing').length,
              Shipped: dateFilteredOrders.filter((o) => o.status === 'Shipped').length,
              Delivered: dateFilteredOrders.filter((o) => o.status === 'Delivered').length,
              Cancelled: dateFilteredOrders.filter((o) => o.status === 'Cancelled').length,
            };

            const filteredSalesOrders = dateFilteredOrders.filter((ord) => {
              const matchesStatus =
                salesStatusFilter === 'All' || ord.status === salesStatusFilter;
              if (!matchesStatus) return false;
              if (!normalizedSearch) return true;
              const idMatch = (ord.orderNumber || '').toLowerCase().includes(normalizedSearch);
              const nameMatch = (ord.customer?.fullName || '')
                .toLowerCase()
                .includes(normalizedSearch);
              return idMatch || nameMatch;
            });

            // Filtered view summary metrics (exclude Cancelled & Pending from completed sales revenue)
            let filteredConfirmedRevenue = 0;
            let filteredDeliveredRevenue = 0;
            let filteredCompletedOrdersCount = 0;
            for (const ord of filteredSalesOrders) {
              const amt = Number(ord.total || 0);
              if (isCompletedSaleOrder(ord.status)) {
                filteredConfirmedRevenue += amt;
                filteredCompletedOrdersCount++;
              }
              if (ord.status === 'Delivered') {
                filteredDeliveredRevenue += amt;
              }
            }

            const DATE_FILTER_OPTIONS: {
              id: 'all' | 'today' | 'last7days' | 'month';
              label: string;
            }[] = [
              { id: 'today', label: 'Today' },
              { id: 'last7days', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
            ];

            const activeDateLabel =
              DATE_FILTER_OPTIONS.find((d) => d.id === salesDateFilter)?.label || 'All Time';

            return (
              <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
                      Revenue & Order Analytics
                    </p>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5F0] mt-1">
                      Sales Management
                    </h1>
                    <p className="text-xs text-[#A1A1AA] mt-1">
                      Real-time sales revenue, delivered revenue, and order status breakdown from saved customer orders.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOrdersActionFeedback(null);
                        fetchDashboardFoundation();
                      }}
                      disabled={loadingDashboard}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#121214] border border-white/15 text-xs font-semibold uppercase tracking-wider text-[#F5F5F0] hover:border-[#D4AF37] disabled:opacity-60 transition-colors"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${loadingDashboard ? 'animate-spin' : ''}`}
                      />
                      <span>Refresh</span>
                    </button>

                    <Link
                      to="/admin/orders"
                      className="px-4 py-2.5 bg-[#18181B] border border-white/15 text-xs font-semibold text-[#F5F5F0] hover:text-[#D4AF37] hover:border-[#D4AF37] uppercase tracking-wider transition-colors"
                    >
                      Manage Orders
                    </Link>
                  </div>
                </div>

                {/* Action Feedback Banner */}
                {ordersActionFeedback && (
                  <div
                    className={`p-4 border text-xs flex items-center justify-between gap-3 ${
                      ordersActionFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/40 text-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {ordersActionFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{ordersActionFeedback.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOrdersActionFeedback(null)}
                      className="text-current opacity-75 hover:opacity-100"
                      aria-label="Dismiss message"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Fetch Error Banner */}
                {ordersError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/40 text-xs text-red-300 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{ordersError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={fetchDashboardFoundation}
                      className="px-3 py-1 bg-red-500/20 border border-red-500/40 text-red-200 font-semibold uppercase tracking-wider"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* 1. Revenue Breakdown Cards (Clearly Labeled) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Total Sales Revenue (All Non-Cancelled Confirmed Orders) */}
                  <div className="bg-[#121214] border border-[#D4AF37]/50 p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                        Total Sales Revenue
                      </span>
                      <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <div className="font-mono-num text-2xl sm:text-3xl font-bold text-[#D4AF37]">
                      {formatPKR(totalSalesRevenue)}
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                      All non-cancelled confirmed orders ({completedSalesOrdersCount}{' '}
                      {completedSalesOrdersCount === 1 ? 'order' : 'orders'}: Confirmed, Processing, Shipped &amp; Delivered). Excludes Pending &amp; Cancelled.
                    </p>
                  </div>

                  {/* Delivered Revenue (Delivered Orders Only) */}
                  <div className="bg-[#121214] border border-emerald-500/30 p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                        Delivered Revenue
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    </div>
                    <div className="font-mono-num text-2xl sm:text-3xl font-bold text-[#F5F5F0]">
                      {formatPKR(deliveredSalesRevenue)}
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                      Completed revenue from {deliveredOrdersCount}{' '}
                      {deliveredOrdersCount === 1 ? 'delivered order' : 'delivered orders'}. No delivery fees added.
                    </p>
                  </div>

                  {/* Pending & Cancelled Order Value (Not Counted as Completed Sales) */}
                  <div className="bg-[#121214] border border-white/10 p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                        Pending Value (Unconfirmed)
                      </span>
                      <span className="text-[11px] font-mono-num text-amber-300">
                        {pendingOrdersCount} Pending
                      </span>
                    </div>
                    <div className="font-mono-num text-2xl sm:text-3xl font-bold text-amber-300">
                      {formatPKR(pendingOrdersValue)}
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                      Awaiting confirmation (not counted in Total Sales Revenue). Cancelled ({cancelledOrdersCount}):{' '}
                      <span className="font-mono-num text-red-300">
                        {formatPKR(cancelledOrdersValue)}
                      </span>{' '}
                      excluded.
                    </p>
                  </div>
                </div>

                {/* 2. Order Status Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    {
                      label: 'Total Orders',
                      value: totalOrdersCount,
                      sub: `${pendingOrdersCount} Pending`,
                      accent: 'text-[#F5F5F0]',
                    },
                    {
                      label: 'Confirmed Orders',
                      value: confirmedOrdersCount,
                      sub: 'Confirmed status',
                      accent: 'text-emerald-300',
                    },
                    {
                      label: 'Processing Orders',
                      value: processingOrdersCount,
                      sub: 'In preparation',
                      accent: 'text-sky-300',
                    },
                    {
                      label: 'Shipped Orders',
                      value: shippedOrdersCount,
                      sub: 'Dispatched',
                      accent: 'text-indigo-300',
                    },
                    {
                      label: 'Delivered Orders',
                      value: deliveredOrdersCount,
                      sub: formatPKR(deliveredSalesRevenue),
                      accent: 'text-[#D4AF37]',
                    },
                    {
                      label: 'Cancelled Orders',
                      value: cancelledOrdersCount,
                      sub: 'Excluded from sales',
                      accent: 'text-red-300',
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="bg-[#121214] border border-white/10 p-4 space-y-1"
                    >
                      <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                        {card.label}
                      </span>
                      <div className={`font-mono-num text-2xl font-bold ${card.accent}`}>
                        {card.value}
                      </div>
                      <span className="block text-[11px] font-mono-num text-[#A1A1AA]/80">
                        {card.sub}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 3. Filters & Search Bar (Date Range, Status Filter, Search by Order ID or Customer Name) */}
                <div className="bg-[#121214] border border-white/10 p-4 sm:p-5 space-y-4">
                  {/* Date Range Filter Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs uppercase tracking-wider text-[#A1A1AA] mr-1">
                        Date Period:
                      </span>
                      {DATE_FILTER_OPTIONS.map((opt) => {
                        const active = salesDateFilter === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSalesDateFilter(opt.id)}
                            className={`px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-colors ${
                              active
                                ? 'bg-[#D4AF37] text-[#0B0B0C] border-[#D4AF37]'
                                : 'bg-[#18181B] text-[#A1A1AA] border-white/10 hover:border-white/30 hover:text-[#F5F5F0]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Filter Revenue Summary */}
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div>
                        <span className="text-[#A1A1AA] uppercase tracking-wider">
                          {activeDateLabel} Confirmed Revenue:{' '}
                        </span>
                        <span className="font-mono-num font-bold text-[#D4AF37]">
                          {formatPKR(filteredConfirmedRevenue)}
                        </span>
                        <span className="text-[#A1A1AA] ml-1 font-mono-num">
                          ({filteredCompletedOrdersCount})
                        </span>
                      </div>
                      <div>
                        <span className="text-[#A1A1AA] uppercase tracking-wider">
                          Delivered:{' '}
                        </span>
                        <span className="font-mono-num font-bold text-emerald-300">
                          {formatPKR(filteredDeliveredRevenue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Search Input & Status Dropdown */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-8 relative">
                      <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={salesSearchQuery}
                        onChange={(e) => setSalesSearchQuery(e.target.value)}
                        placeholder="Search sales by Order ID (e.g. MGC-123456) or customer name..."
                        aria-label="Search sales by Order ID or customer name"
                        className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] pl-10 pr-9 py-2.5 text-sm text-[#F5F5F0] placeholder-[#A1A1AA]/60 focus:outline-none"
                      />
                      {salesSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setSalesSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#F5F5F0]"
                          aria-label="Clear sales search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="md:col-span-4">
                      <select
                        value={salesStatusFilter}
                        onChange={(e) =>
                          setSalesStatusFilter(e.target.value as 'All' | OrderStatusType)
                        }
                        aria-label="Filter sales by order status"
                        className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-[#F5F5F0] focus:outline-none"
                      >
                        {ORDER_STATUS_FILTERS.map((st) => (
                          <option key={st} value={st}>
                            Status: {st} ({statusCountsInDateRange[st]})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Status Filter Quick Pills */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {ORDER_STATUS_FILTERS.map((st) => {
                        const active = salesStatusFilter === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setSalesStatusFilter(st)}
                            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-colors ${
                              active
                                ? 'bg-[#D4AF37] text-[#0B0B0C] border-[#D4AF37]'
                                : 'bg-[#18181B] text-[#A1A1AA] border-white/10 hover:border-white/30 hover:text-[#F5F5F0]'
                            }`}
                          >
                            <span>{st}</span>
                            <span className="ml-1.5 font-mono-num opacity-80">
                              ({statusCountsInDateRange[st]})
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {(salesSearchQuery ||
                      salesStatusFilter !== 'All' ||
                      salesDateFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSalesSearchQuery('');
                          setSalesStatusFilter('All');
                          setSalesDateFilter('all');
                        }}
                        className="px-3 py-1.5 bg-[#18181B] border border-white/15 hover:border-[#D4AF37] text-xs font-semibold uppercase tracking-wider text-[#D4AF37] transition-colors"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Sales Table */}
                <div className="bg-[#121214] border border-white/10 overflow-x-auto">
                  {loadingDashboard && uniqueOrders.length === 0 ? (
                    <div className="py-16 px-4 text-center space-y-3">
                      <RefreshCw className="w-6 h-6 text-[#D4AF37] animate-spin mx-auto" />
                      <p className="text-sm text-[#A1A1AA]">Loading sales records...</p>
                    </div>
                  ) : filteredSalesOrders.length === 0 ? (
                    <div className="py-16 px-4 text-center space-y-3">
                      <p className="text-base font-medium text-[#F5F5F0]">
                        {uniqueOrders.length === 0
                          ? 'No sales or orders have been recorded yet.'
                          : 'No orders match your selected sales filters.'}
                      </p>
                      <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
                        {uniqueOrders.length === 0
                          ? 'When customers place orders through the storefront, real order totals and revenue metrics will appear here automatically.'
                          : 'Try adjusting the date period, status filter, or search query to view matching orders.'}
                      </p>
                      {(salesSearchQuery ||
                        salesStatusFilter !== 'All' ||
                        salesDateFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSalesSearchQuery('');
                            setSalesStatusFilter('All');
                            setSalesDateFilter('all');
                          }}
                          className="inline-block mt-2 px-4 py-2 bg-[#18181B] border border-white/15 hover:border-[#D4AF37] text-xs font-semibold uppercase tracking-wider text-[#D4AF37]"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-[#A1A1AA] bg-[#18181B]/60">
                          <th className="py-3.5 px-4">Order ID</th>
                          <th className="py-3.5 px-4">Order Date</th>
                          <th className="py-3.5 px-4">Customer Name</th>
                          <th className="py-3.5 px-4">Items</th>
                          <th className="py-3.5 px-4">Order Total</th>
                          <th className="py-3.5 px-4">Order Status</th>
                          <th className="py-3.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {filteredSalesOrders.map((ord) => {
                          const snapshotItems = getOrderSnapshotItems(ord);
                          const totalItemUnits = snapshotItems.reduce(
                            (sum, item) => sum + Math.max(1, Number(item.quantity || 1)),
                            0
                          );
                          const countsInRevenue = isCompletedSaleOrder(ord.status);

                          return (
                            <tr
                              key={ord.orderNumber}
                              className="hover:bg-white/[0.03] transition-colors"
                            >
                              {/* Order ID */}
                              <td className="py-4 px-4 font-mono-num font-bold text-[#D4AF37] whitespace-nowrap">
                                {ord.orderNumber}
                              </td>

                              {/* Order Date */}
                              <td className="py-4 px-4 font-mono-num text-xs text-[#A1A1AA] whitespace-nowrap">
                                {formatOrderDateTime(ord.createdAt)}
                              </td>

                              {/* Customer Name */}
                              <td className="py-4 px-4">
                                <div className="font-medium text-[#F5F5F0]">
                                  {ord.customer?.fullName || 'Customer'}
                                </div>
                                {ord.customer?.city && (
                                  <div className="text-[11px] text-[#A1A1AA]">
                                    {ord.customer.city}
                                  </div>
                                )}
                              </td>

                              {/* Number of Items */}
                              <td className="py-4 px-4 font-mono-num whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-1 bg-[#18181B] border border-white/10 text-xs text-[#F5F5F0]">
                                  {totalItemUnits} {totalItemUnits === 1 ? 'item' : 'items'}
                                </span>
                              </td>

                              {/* Order Total */}
                              <td className="py-4 px-4 font-mono-num whitespace-nowrap">
                                <div
                                  className={`font-bold ${
                                    ord.status === 'Cancelled'
                                      ? 'text-[#A1A1AA] line-through'
                                      : countsInRevenue
                                      ? 'text-[#F5F5F0]'
                                      : 'text-amber-300'
                                  }`}
                                >
                                  {formatPKR(ord.total)}
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-[#A1A1AA]">
                                  {ord.status === 'Delivered'
                                    ? 'Delivered Sale'
                                    : countsInRevenue
                                    ? 'Confirmed Sale'
                                    : ord.status === 'Pending'
                                    ? 'Pending (Unconfirmed)'
                                    : 'Cancelled (Excluded)'}
                                </div>
                              </td>

                              {/* Order Status */}
                              <td className="py-4 px-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 border text-[11px] font-semibold uppercase tracking-wider ${getStatusBadgeClasses(
                                    ord.status
                                  )}`}
                                >
                                  {ord.status}
                                </span>
                              </td>

                              {/* View Order Action */}
                              <td className="py-4 px-4 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleOpenOrderDetails(ord)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] font-bold text-[11px] uppercase tracking-wider transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Order</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ================================================================ */}
          {/* VIEW 6: SETTINGS (/admin/settings) */}
          {/* ================================================================ */}
          {activeSection === 'settings' && (
            <div className="space-y-8">
              <div className="border-b border-white/10 pb-5">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5F0]">
                  Settings
                </h1>
              </div>

              {/* Account Section */}
              <div className="max-w-xl bg-[#121214] border border-white/10 p-6 sm:p-8 space-y-4">
                <h2 className="font-display text-xl font-bold text-[#F5F5F0]">
                  Account
                </h2>
                <div className="space-y-1 text-sm">
                  <span className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
                    Signed In Email
                  </span>
                  <p className="font-mono-num text-[#F5F5F0]">
                    {adminEmail || 'Authenticated Session'}
                  </p>
                </div>
              </div>

              {/* Change Password Section */}
              <div className="max-w-xl bg-[#121214] border border-white/10 p-6 sm:p-8 space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h2 className="font-display text-xl font-bold text-[#F5F5F0]">
                    Change Password
                  </h2>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    Update your password securely via server-side verification.
                  </p>
                </div>

                {passwordMessage && (
                  <div
                    className={`p-4 border text-xs flex items-center gap-2 ${
                      passwordMessage.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/40 text-red-300'
                    }`}
                  >
                    {passwordMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{passwordMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} noValidate className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="current-password"
                      className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                    >
                      Current Password
                    </label>
                    <input
                      id="current-password"
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="new-password"
                      className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                    >
                      New Password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="confirm-password"
                      className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                    >
                      Confirm New Password
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="px-8 py-3.5 bg-[#D4AF37] hover:bg-[#e5c247] disabled:opacity-60 text-[#0B0B0C] text-xs font-bold uppercase tracking-[0.15em] transition-colors"
                  >
                    {passwordSaving ? 'UPDATING...' : 'UPDATE PASSWORD'}
                  </button>
                </form>
              </div>

              {/* Logout Section */}
              <div className="max-w-xl bg-[#121214] border border-white/10 p-6 sm:p-8 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#F5F5F0]">
                    Logout
                  </h2>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    End your current session and return to the Sign In page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-6 py-3 bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-300 hover:bg-red-500/20 uppercase tracking-wider transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* PROTECTED PLACEHOLDER ROUTES (Stock) */}
          {/* ================================================================ */}
          {activeSection !== 'dashboard' &&
            activeSection !== 'orders' &&
            activeSection !== 'products' &&
            activeSection !== 'categories' &&
            activeSection !== 'sales' &&
            activeSection !== 'settings' && (
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-5 flex items-center justify-between">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5F0] capitalize">
                    {activeSection}
                  </h1>
                  <Link
                    to="/admin/"
                    className="text-xs text-[#D4AF37] hover:underline uppercase tracking-wider"
                  >
                    ← Back to Dashboard
                  </Link>
                </div>

                <div className="bg-[#121214] border border-white/10 p-8 text-center space-y-2">
                  <p className="text-sm text-[#F5F5F0] font-medium capitalize">
                    {activeSection} Module Foundation
                  </p>
                  <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
                    This protected route is authenticated and ready for the upcoming {activeSection} management implementation.
                  </p>
                </div>
              </div>
            )}
        </div>
      </main>

      {/* ==================================================================== */}
      {/* ADD / EDIT CATEGORY MODAL */}
      {/* ==================================================================== */}
      {categoryModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => {
            if (!catSaving) {
              setCategoryModalOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-lg bg-[#121214] border border-white/15 shadow-2xl my-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4 bg-[#18181B]/60">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
                  {editingCategory ? 'Update Category' : 'New Store Category'}
                </p>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[#F5F5F0] mt-1">
                  {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add Category'}
                </h2>
              </div>
              <button
                type="button"
                disabled={catSaving}
                onClick={() => setCategoryModalOpen(false)}
                className="p-2 text-[#A1A1AA] hover:text-[#F5F5F0] border border-white/10 hover:border-white/30"
                aria-label="Close category modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveCategory} noValidate className="p-5 sm:p-6 space-y-5">
              {catFormError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/40 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{catFormError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="cat-name"
                  className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                >
                  Category Name *
                </label>
                <input
                  id="cat-name"
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Shirts, Waistcoats, Footwear"
                  className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-[#F5F5F0] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="cat-description"
                  className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                >
                  Description (Optional)
                </label>
                <textarea
                  id="cat-description"
                  rows={3}
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  placeholder="Optional description or tagline for this category..."
                  className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-[#F5F5F0] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs uppercase tracking-wider text-[#F5F5F0]">
                  Category Status
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCatActive(true)}
                    className={`py-2.5 px-4 border text-xs font-bold uppercase tracking-wider transition-colors ${
                      catActive
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-[#18181B] border-white/10 text-[#A1A1AA] hover:text-[#F5F5F0]'
                    }`}
                  >
                    ✓ Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatActive(false)}
                    className={`py-2.5 px-4 border text-xs font-bold uppercase tracking-wider transition-colors ${
                      !catActive
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-[#18181B] border-white/10 text-[#A1A1AA] hover:text-[#F5F5F0]'
                    }`}
                  >
                    ✕ Inactive
                  </button>
                </div>
                <p className="text-[11px] text-[#A1A1AA] pt-1">
                  {catActive
                    ? 'Active categories appear in storefront navigation and can be assigned to products.'
                    : 'Inactive categories remain in the admin panel and are hidden from new product assignments and public navigation.'}
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={catSaving}
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-5 py-2.5 bg-[#18181B] border border-white/15 hover:border-white/30 text-xs font-semibold uppercase tracking-wider text-[#F5F5F0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={catSaving}
                  className="px-7 py-2.5 bg-[#D4AF37] hover:bg-[#e5c247] disabled:opacity-50 text-[#0B0B0C] text-xs font-bold uppercase tracking-[0.14em] transition-colors"
                >
                  {catSaving
                    ? 'SAVING...'
                    : editingCategory
                    ? 'SAVE CHANGES'
                    : 'CREATE CATEGORY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* DELETE CATEGORY CONFIRMATION MODAL */}
      {/* ==================================================================== */}
      {deleteConfirmCategory && (() => {
        const assignedCount =
          typeof deleteConfirmCategory.productCount === 'number'
            ? deleteConfirmCategory.productCount
            : adminProducts.filter(
                (p) =>
                  p.categoryId === deleteConfirmCategory.id ||
                  (p.category || '').toLowerCase() ===
                    deleteConfirmCategory.name.toLowerCase()
              ).length;

        return (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => {
              if (deletingCategoryId === null) {
                setDeleteConfirmCategory(null);
                setDeleteCategoryModalError('');
              }
            }}
          >
            <div
              className="w-full max-w-md bg-[#121214] border border-white/15 p-6 sm:p-8 shadow-2xl space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-red-400">
                    Confirm Category Deletion
                  </p>
                  <h2 className="font-display text-xl font-bold text-[#F5F5F0] mt-1">
                    Are you sure you want to delete this category?
                  </h2>
                </div>
                <button
                  type="button"
                  disabled={deletingCategoryId !== null}
                  onClick={() => {
                    setDeleteConfirmCategory(null);
                    setDeleteCategoryModalError('');
                  }}
                  className="text-[#A1A1AA] hover:text-[#F5F5F0]"
                  aria-label="Close category delete confirmation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {deleteCategoryModalError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/40 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteCategoryModalError}</span>
                </div>
              )}

              <div className="space-y-2 text-xs sm:text-sm text-[#A1A1AA]">
                <p>
                  Category:{' '}
                  <span className="text-[#F5F5F0] font-semibold">
                    {deleteConfirmCategory.name}
                  </span>{' '}
                  <span className="font-mono-num text-xs text-[#D4AF37]">
                    ({assignedCount} {assignedCount === 1 ? 'product' : 'products'})
                  </span>
                </p>

                {assignedCount > 0 ? (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/40 text-xs text-amber-200">
                    This category contains products. Please move or remove those products before deleting the category.
                  </div>
                ) : (
                  <p className="text-xs text-[#A1A1AA]/80">
                    This category has no products assigned and can be safely deleted without affecting products or historical orders.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                <button
                  type="button"
                  disabled={deletingCategoryId !== null}
                  onClick={() => {
                    setDeleteConfirmCategory(null);
                    setDeleteCategoryModalError('');
                  }}
                  className="px-4 py-2.5 bg-[#18181B] border border-white/15 text-xs font-semibold uppercase tracking-wider text-[#F5F5F0] hover:border-white/30"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingCategoryId !== null}
                  onClick={handleConfirmDeleteCategory}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  {deletingCategoryId !== null ? 'DELETING...' : 'YES, DELETE CATEGORY'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================================================================== */}
      {/* ADD / EDIT PRODUCT MODAL */}
      {/* ==================================================================== */}
      {productModalOpen && (() => {
        const parsedOrig = Number(prodOriginalPrice) || 0;
        let previewOfferPrice: number | null = null;
        let previewDiscountPct = 0;

        if (prodOfferType === 'percentage' && parsedOrig > 0) {
          const pct = Number(prodDiscountPercent);
          if (Number.isFinite(pct) && pct > 0 && pct < 100) {
            previewDiscountPct = Math.round(pct);
            previewOfferPrice = Math.round(parsedOrig * (1 - previewDiscountPct / 100));
          }
        } else if (prodOfferType === 'price' && parsedOrig > 0) {
          const off = Number(prodOfferPrice);
          if (Number.isFinite(off) && off > 0 && off < parsedOrig) {
            previewOfferPrice = Math.round(off);
            previewDiscountPct = Math.round(((parsedOrig - previewOfferPrice) / parsedOrig) * 100);
          }
        }

        return (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
            onClick={() => {
              if (!prodSaving && !prodImageUploading) {
                setProductModalOpen(false);
              }
            }}
          >
            <div
              className="w-full max-w-3xl bg-[#121214] border border-white/15 shadow-2xl my-auto max-h-[92vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4 bg-[#18181B]/60">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
                    {editingProduct ? 'Update Catalog Item' : 'New Catalog Item'}
                  </p>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-[#F5F5F0] mt-1">
                    {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product'}
                  </h2>
                </div>
                <button
                  type="button"
                  disabled={prodSaving || prodImageUploading}
                  onClick={() => setProductModalOpen(false)}
                  className="p-2 text-[#A1A1AA] hover:text-[#F5F5F0] border border-white/10 hover:border-white/30"
                  aria-label="Close product modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form Body */}
              <form
                onSubmit={handleSaveProduct}
                noValidate
                className="p-5 sm:p-6 overflow-y-auto space-y-6"
              >
                {prodFormError && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/40 text-xs text-red-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{prodFormError}</span>
                  </div>
                )}

                {/* 1. Product Image Upload & Preview */}
                <div className="bg-[#18181B]/60 border border-white/10 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#F5F5F0]">
                        Product Image *
                      </label>
                      <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                        Upload a JPG, PNG, or WEBP image (max 5 MB). Executable files are strictly blocked.
                      </p>
                    </div>

                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{prodImageUploading ? 'UPLOADING...' : 'UPLOAD IMAGE'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        disabled={prodImageUploading || prodSaving}
                        onChange={handleProductImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    <div className="sm:col-span-3 flex justify-center">
                      <div className="w-28 h-36 bg-[#121214] border border-white/15 overflow-hidden flex items-center justify-center">
                        {prodImage ? (
                          <SafeImage
                            src={prodImage}
                            alt={prodTitle || 'Product Preview'}
                            fallbackTitle={prodTitle || 'Preview'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[11px] text-[#A1A1AA] text-center px-2">
                            No Image Selected
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-9 space-y-2">
                      <label
                        htmlFor="prod-image-url"
                        className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]"
                      >
                        Image Path / URL
                      </label>
                      <input
                        id="prod-image-url"
                        type="text"
                        value={prodImage}
                        onChange={(e) => setProdImage(e.target.value)}
                        placeholder="Upload an image above or enter image URL..."
                        className="w-full bg-[#121214] border border-white/15 focus:border-[#D4AF37] px-3.5 py-2.5 text-xs sm:text-sm text-[#F5F5F0] focus:outline-none"
                      />
                      {prodImage && (
                        <button
                          type="button"
                          onClick={() => setProdImage('')}
                          className="text-[11px] text-red-300 hover:underline uppercase tracking-wider"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Title, Category & Description */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-8 space-y-1.5">
                    <label
                      htmlFor="prod-title"
                      className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                    >
                      Product Title *
                    </label>
                    <input
                      id="prod-title"
                      type="text"
                      required
                      value={prodTitle}
                      onChange={(e) => setProdTitle(e.target.value)}
                      placeholder="e.g. Royal Obsidian Embroidered Kurta"
                      className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-[#F5F5F0] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-4 space-y-1.5">
                    <label
                      htmlFor="prod-category"
                      className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                    >
                      Category *
                    </label>
                    <select
                      id="prod-category"
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-[#F5F5F0] focus:outline-none"
                    >
                      {Array.from(
                        new Set(
                          prodCategory
                            ? [...adminCategories, prodCategory]
                            : adminCategories
                        )
                      ).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-12 space-y-1.5">
                    <label
                      htmlFor="prod-description"
                      className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                    >
                      Description
                    </label>
                    <textarea
                      id="prod-description"
                      rows={3}
                      value={prodDescription}
                      onChange={(e) => setProdDescription(e.target.value)}
                      placeholder="Describe fabric, tailoring, fit, and craftsmanship..."
                      className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-[#F5F5F0] focus:outline-none"
                    />
                  </div>
                </div>

                {/* 3. Pricing & Individual Product Offer Controls */}
                <div className="bg-[#18181B]/60 border border-white/10 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                        Pricing & Individual Product Offer
                      </h3>
                      <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                        Configure standard PKR price and optional percentage or fixed-price discount.
                      </p>
                    </div>

                    {parsedOrig > 0 && (
                      <div className="text-right font-mono-num">
                        {previewOfferPrice !== null && previewOfferPrice < parsedOrig ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#A1A1AA] line-through">
                              {formatPKR(parsedOrig)}
                            </span>
                            <span className="text-sm font-bold text-[#D4AF37]">
                              {formatPKR(previewOfferPrice)}
                            </span>
                            <span className="px-2 py-0.5 bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[11px] font-bold">
                              -{previewDiscountPct}% OFF
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-[#F5F5F0]">
                            {formatPKR(parsedOrig)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                    <div className="sm:col-span-4 space-y-1.5">
                      <label
                        htmlFor="prod-original-price"
                        className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                      >
                        Original Price (PKR) *
                      </label>
                      <input
                        id="prod-original-price"
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={prodOriginalPrice}
                        onChange={(e) => {
                          const nextOrig = e.target.value;
                          setProdOriginalPrice(nextOrig);
                          const origVal = Number(nextOrig);
                          if (
                            prodOfferType === 'percentage' &&
                            origVal > 0 &&
                            Number(prodDiscountPercent) > 0
                          ) {
                            const pct = Math.min(99, Math.max(1, Number(prodDiscountPercent)));
                            setProdOfferPrice(String(Math.round(origVal * (1 - pct / 100))));
                          } else if (
                            prodOfferType === 'price' &&
                            origVal > 0 &&
                            Number(prodOfferPrice) > 0 &&
                            Number(prodOfferPrice) < origVal
                          ) {
                            const off = Number(prodOfferPrice);
                            setProdDiscountPercent(
                              String(Math.round(((origVal - off) / origVal) * 100))
                            );
                          }
                        }}
                        placeholder="e.g. 5000"
                        className="w-full bg-[#121214] border border-white/15 focus:border-[#D4AF37] px-3.5 py-2.5 text-sm font-mono-num text-[#F5F5F0] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-8 space-y-1.5">
                      <span className="block text-xs uppercase tracking-wider text-[#F5F5F0]">
                        Offer Mode
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'none', label: 'No Offer' },
                          { id: 'percentage', label: 'Percentage (%)' },
                          { id: 'price', label: 'Offer Price' },
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => {
                              const nextMode = mode.id as 'none' | 'percentage' | 'price';
                              setProdOfferType(nextMode);
                              if (nextMode === 'none') {
                                setProdDiscountPercent('');
                                setProdOfferPrice('');
                              } else if (
                                nextMode === 'percentage' &&
                                parsedOrig > 0 &&
                                Number(prodDiscountPercent) > 0
                              ) {
                                const pct = Math.min(
                                  99,
                                  Math.max(1, Math.round(Number(prodDiscountPercent)))
                                );
                                setProdOfferPrice(
                                  String(Math.round(parsedOrig * (1 - pct / 100)))
                                );
                              } else if (
                                nextMode === 'price' &&
                                parsedOrig > 0 &&
                                Number(prodOfferPrice) > 0 &&
                                Number(prodOfferPrice) < parsedOrig
                              ) {
                                const off = Math.round(Number(prodOfferPrice));
                                setProdDiscountPercent(
                                  String(Math.round(((parsedOrig - off) / parsedOrig) * 100))
                                );
                              }
                            }}
                            className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider border transition-colors ${
                              prodOfferType === mode.id
                                ? 'bg-[#D4AF37] text-[#0B0B0C] border-[#D4AF37]'
                                : 'bg-[#121214] text-[#A1A1AA] border-white/15 hover:text-[#F5F5F0]'
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {prodOfferType !== 'none' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="prod-discount-pct"
                          className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                        >
                          Discount Percentage (%)
                        </label>
                        <input
                          id="prod-discount-pct"
                          type="number"
                          min="1"
                          max="99"
                          step="1"
                          value={prodDiscountPercent}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProdDiscountPercent(val);
                            setProdOfferType('percentage');
                            const pct = Number(val);
                            if (parsedOrig > 0 && Number.isFinite(pct) && pct > 0 && pct < 100) {
                              setProdOfferPrice(
                                String(Math.round(parsedOrig * (1 - Math.round(pct) / 100)))
                              );
                            } else {
                              setProdOfferPrice('');
                            }
                          }}
                          placeholder="e.g. 20"
                          className="w-full bg-[#121214] border border-white/15 focus:border-[#D4AF37] px-3.5 py-2.5 text-sm font-mono-num text-[#F5F5F0] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="prod-offer-price"
                          className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                        >
                          Offer Price (PKR)
                        </label>
                        <input
                          id="prod-offer-price"
                          type="number"
                          min="0"
                          step="1"
                          value={prodOfferPrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProdOfferPrice(val);
                            setProdOfferType('price');
                            const off = Number(val);
                            if (
                              parsedOrig > 0 &&
                              Number.isFinite(off) &&
                              off > 0 &&
                              off < parsedOrig
                            ) {
                              setProdDiscountPercent(
                                String(Math.round(((parsedOrig - off) / parsedOrig) * 100))
                              );
                            } else {
                              setProdDiscountPercent('');
                            }
                          }}
                          placeholder="e.g. 4000"
                          className="w-full bg-[#121214] border border-white/15 focus:border-[#D4AF37] px-3.5 py-2.5 text-sm font-mono-num text-[#F5F5F0] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Colors & Sizes Management */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Colors */}
                  <div className="bg-[#18181B]/60 border border-white/10 p-4 space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#F5F5F0]">
                      Colors *
                    </label>

                    <div className="flex flex-wrap gap-1.5">
                      {prodColors.map((c) => (
                        <span
                          key={c.name}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#121214] border border-white/20 text-xs text-[#F5F5F0]"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/30"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span>{c.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveColorChip(c.name)}
                            className="text-[#A1A1AA] hover:text-red-300"
                            aria-label={`Remove color ${c.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={prodColorInput}
                        onChange={(e) => setProdColorInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddColorChip();
                          }
                        }}
                        placeholder="Add color (e.g. Black)"
                        className="flex-1 bg-[#121214] border border-white/15 focus:border-[#D4AF37] px-3 py-2 text-xs text-[#F5F5F0] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddColorChip()}
                        className="px-3 py-2 bg-[#121214] border border-white/15 hover:border-[#D4AF37] text-xs font-semibold uppercase tracking-wider text-[#D4AF37]"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {COMMON_COLOR_PRESETS.map((preset) => {
                        const active = prodColors.some(
                          (c) => c.name.toLowerCase() === preset.toLowerCase()
                        );
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() =>
                              active
                                ? handleRemoveColorChip(
                                    prodColors.find(
                                      (c) => c.name.toLowerCase() === preset.toLowerCase()
                                    )?.name || preset
                                  )
                                : handleAddColorChip(preset)
                            }
                            className={`px-2 py-0.5 text-[11px] border transition-colors ${
                              active
                                ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                                : 'bg-[#121214] border-white/10 text-[#A1A1AA] hover:text-[#F5F5F0]'
                            }`}
                          >
                            + {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sizes */}
                  <div className="bg-[#18181B]/60 border border-white/10 p-4 space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#F5F5F0]">
                      Sizes *
                    </label>

                    <div className="flex flex-wrap gap-1.5">
                      {prodSizes.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#121214] border border-white/20 text-xs font-mono-num text-[#F5F5F0]"
                        >
                          <span>{s}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSizeChip(s)}
                            className="text-[#A1A1AA] hover:text-red-300"
                            aria-label={`Remove size ${s}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={prodSizeInput}
                        onChange={(e) => setProdSizeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSizeChip();
                          }
                        }}
                        placeholder="Add size (e.g. M, L, 42, 100ml)"
                        className="flex-1 bg-[#121214] border border-white/15 focus:border-[#D4AF37] px-3 py-2 text-xs text-[#F5F5F0] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSizeChip()}
                        className="px-3 py-2 bg-[#121214] border border-white/15 hover:border-[#D4AF37] text-xs font-semibold uppercase tracking-wider text-[#D4AF37]"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {COMMON_SIZE_PRESETS.map((preset) => {
                        const active = prodSizes.includes(preset);
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() =>
                              active
                                ? handleRemoveSizeChip(preset)
                                : handleAddSizeChip(preset)
                            }
                            className={`px-2.5 py-0.5 text-[11px] font-mono-num border transition-colors ${
                              active
                                ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                                : 'bg-[#121214] border-white/10 text-[#A1A1AA] hover:text-[#F5F5F0]'
                            }`}
                          >
                            {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 5. Stock / Availability & Publish Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#18181B]/60 border border-white/10 p-4 sm:p-5">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="prod-stock-qty"
                      className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                    >
                      Stock Quantity
                    </label>
                    <input
                      id="prod-stock-qty"
                      type="number"
                      min="0"
                      step="1"
                      value={prodStockQuantity}
                      onChange={(e) => {
                        setProdStockQuantity(e.target.value);
                        const num = Number(e.target.value);
                        if (Number.isFinite(num)) {
                          setProdInStock(num > 0);
                        }
                      }}
                      className="w-full bg-[#121214] border border-white/15 focus:border-[#D4AF37] px-3.5 py-2.5 text-sm font-mono-num text-[#F5F5F0] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="block text-xs uppercase tracking-wider text-[#F5F5F0]">
                      Availability
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !prodInStock;
                        setProdInStock(next);
                        if (!next) {
                          setProdStockQuantity('0');
                        } else if (Number(prodStockQuantity) <= 0) {
                          setProdStockQuantity('25');
                        }
                      }}
                      className={`w-full py-2.5 px-4 border text-xs font-bold uppercase tracking-wider transition-colors ${
                        prodInStock
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-500/15 border-red-500/40 text-red-300'
                      }`}
                    >
                      {prodInStock ? '✓ In Stock' : '✕ Out of Stock'}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <span className="block text-xs uppercase tracking-wider text-[#F5F5F0]">
                      Storefront Visibility
                    </span>
                    <button
                      type="button"
                      onClick={() => setProdPublished((prev) => !prev)}
                      className={`w-full py-2.5 px-4 border text-xs font-bold uppercase tracking-wider transition-colors ${
                        prodPublished
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]'
                          : 'bg-white/5 border-white/20 text-[#A1A1AA]'
                      }`}
                    >
                      {prodPublished ? 'Published (Visible)' : 'Unpublished (Hidden)'}
                    </button>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={prodSaving || prodImageUploading}
                    onClick={() => setProductModalOpen(false)}
                    className="px-5 py-2.5 bg-[#18181B] border border-white/15 hover:border-white/30 text-xs font-semibold uppercase tracking-wider text-[#F5F5F0]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={prodSaving || prodImageUploading}
                    className="px-7 py-2.5 bg-[#D4AF37] hover:bg-[#e5c247] disabled:opacity-50 text-[#0B0B0C] text-xs font-bold uppercase tracking-[0.14em] transition-colors"
                  >
                    {prodSaving
                      ? 'SAVING...'
                      : editingProduct
                      ? 'SAVE CHANGES'
                      : 'CREATE PRODUCT'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ==================================================================== */}
      {/* DELETE PRODUCT CONFIRMATION MODAL */}
      {/* ==================================================================== */}
      {deleteConfirmProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            if (!deletingProductId) {
              setDeleteConfirmProduct(null);
            }
          }}
        >
          <div
            className="w-full max-w-md bg-[#121214] border border-white/15 p-6 sm:p-8 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-red-400">
                  Confirm Product Deletion
                </p>
                <h2 className="font-display text-xl font-bold text-[#F5F5F0] mt-1">
                  Delete &ldquo;{deleteConfirmProduct.name}&rdquo;?
                </h2>
              </div>
              <button
                type="button"
                disabled={Boolean(deletingProductId)}
                onClick={() => setDeleteConfirmProduct(null)}
                className="text-[#A1A1AA] hover:text-[#F5F5F0]"
                aria-label="Close delete confirmation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs sm:text-sm text-[#A1A1AA]">
              <p>
                Are you sure you want to permanently remove{' '}
                <span className="text-[#F5F5F0] font-semibold">
                  {deleteConfirmProduct.name}
                </span>{' '}
                from the storefront catalog?
              </p>
              <p className="text-xs text-[#A1A1AA]/80">
                Existing customer orders containing this item will safely keep their historical order snapshots.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={Boolean(deletingProductId)}
                onClick={() => setDeleteConfirmProduct(null)}
                className="px-4 py-2.5 bg-[#18181B] border border-white/15 text-xs font-semibold uppercase tracking-wider text-[#F5F5F0] hover:border-white/30"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(deletingProductId)}
                onClick={handleConfirmDeleteProduct}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                {deletingProductId ? 'DELETING...' : 'YES, DELETE PRODUCT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* REJECT ORDER CONFIRMATION MODAL */}
      {/* ==================================================================== */}
      {rejectConfirmOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            if (!updatingOrderIds[rejectConfirmOrder.orderNumber]) {
              setRejectConfirmOrder(null);
            }
          }}
        >
          <div
            className="w-full max-w-md bg-[#121214] border border-white/15 p-6 sm:p-8 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-red-400">
                  Confirm Rejection
                </p>
                <h2 className="font-display text-xl font-bold text-[#F5F5F0] mt-1">
                  Reject Order {rejectConfirmOrder.orderNumber}?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setRejectConfirmOrder(null)}
                disabled={Boolean(updatingOrderIds[rejectConfirmOrder.orderNumber])}
                className="text-[#A1A1AA] hover:text-[#F5F5F0]"
                aria-label="Close confirmation dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs sm:text-sm text-[#A1A1AA]">
              <p>
                Are you sure you want to reject order{' '}
                <span className="font-mono-num font-bold text-[#D4AF37]">
                  {rejectConfirmOrder.orderNumber}
                </span>{' '}
                for{' '}
                <span className="text-[#F5F5F0] font-medium">
                  {rejectConfirmOrder.customer?.fullName}
                </span>
                ?
              </p>
              <p>
                This will change the order status to{' '}
                <span className="text-red-300 font-semibold">Cancelled</span> in the database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={Boolean(updatingOrderIds[rejectConfirmOrder.orderNumber])}
                onClick={() => setRejectConfirmOrder(null)}
                className="px-4 py-2.5 bg-[#18181B] border border-white/15 text-xs font-semibold uppercase tracking-wider text-[#F5F5F0] hover:border-white/30"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={Boolean(updatingOrderIds[rejectConfirmOrder.orderNumber])}
                onClick={async () => {
                  const target = rejectConfirmOrder.orderNumber;
                  const ok = await handleUpdateOrderStatus(target, 'Cancelled');
                  if (ok) {
                    setRejectConfirmOrder(null);
                  }
                }}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                {updatingOrderIds[rejectConfirmOrder.orderNumber]
                  ? 'REJECTING...'
                  : 'YES, REJECT ORDER'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW ORDER DETAILS MODAL */}
      {/* ==================================================================== */}
      {selectedOrder && (() => {
        const snapshotItems = getOrderSnapshotItems(selectedOrder);
        const isUpdatingThisOrder = Boolean(updatingOrderIds[selectedOrder.orderNumber]);
        const orderMethod = selectedOrder.paymentMethod || 'WhatsApp Order';

        return (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
            onClick={() => setSelectedOrder(null)}
          >
            <div
              className="w-full max-w-4xl bg-[#121214] border border-white/15 shadow-2xl my-auto max-h-[92vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-[#18181B]/60">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono-num text-xl sm:text-2xl font-bold text-[#D4AF37]">
                      {selectedOrder.orderNumber}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 border text-xs font-semibold uppercase tracking-wider ${getStatusBadgeClasses(
                        selectedOrder.status
                      )}`}
                    >
                      {selectedOrder.status}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 bg-[#121214] border border-white/10 text-xs text-[#A1A1AA]">
                      {orderMethod}
                    </span>
                  </div>
                  <p className="text-xs text-[#A1A1AA] mt-1 font-mono-num">
                    Placed on {formatOrderDateTime(selectedOrder.createdAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-[#A1A1AA] hover:text-[#F5F5F0] border border-white/10 hover:border-white/30"
                  aria-label="Close order details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
                {/* Pending Quick Confirm / Reject Bar */}
                {selectedOrder.status === 'Pending' && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                        Pending Order Action Required
                      </p>
                      <p className="text-xs text-[#A1A1AA] mt-0.5">
                        Confirm this order to begin fulfillment or reject it to cancel.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        disabled={isUpdatingThisOrder}
                        onClick={() =>
                          handleUpdateOrderStatus(selectedOrder.orderNumber, 'Confirmed')
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-[#0B0B0C] text-xs font-bold uppercase tracking-wider transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>
                          {isUpdatingThisOrder ? 'SAVING...' : 'CONFIRM ORDER'}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={isUpdatingThisOrder}
                        onClick={() => setRejectConfirmOrder(selectedOrder)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 disabled:opacity-50 text-red-300 text-xs font-bold uppercase tracking-wider transition-colors"
                      >
                        <Ban className="w-4 h-4" />
                        <span>REJECT ORDER</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Update Control (Confirmed, Processing, Shipped, Delivered, Cancelled) */}
                <div className="bg-[#18181B] border border-white/10 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#D4AF37] font-semibold">
                      Order Status Control
                    </p>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">
                      Update order fulfillment stage (Confirmed, Processing, Shipped, Delivered, or Cancelled).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={detailStatusSelection}
                      onChange={(e) =>
                        setDetailStatusSelection(e.target.value as OrderStatusType)
                      }
                      disabled={isUpdatingThisOrder}
                      aria-label="Select order status"
                      className="bg-[#121214] border border-white/20 focus:border-[#D4AF37] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#F5F5F0] focus:outline-none"
                    >
                      {DETAIL_STATUS_UPDATE_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={isUpdatingThisOrder}
                      onClick={() => {
                        if (detailStatusSelection === 'Cancelled' && selectedOrder.status !== 'Cancelled') {
                          setRejectConfirmOrder(selectedOrder);
                        } else {
                          handleUpdateOrderStatus(
                            selectedOrder.orderNumber,
                            detailStatusSelection
                          );
                        }
                      }}
                      className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#e5c247] disabled:opacity-50 text-[#0B0B0C] text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      {isUpdatingThisOrder ? 'UPDATING...' : 'UPDATE STATUS'}
                    </button>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-[#18181B]/60 border border-white/10 p-5 space-y-4">
                  <h3 className="font-display text-lg font-bold text-[#F5F5F0] border-b border-white/10 pb-2.5">
                    Customer Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs sm:text-sm">
                    <div>
                      <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                        Full Name
                      </span>
                      <p className="font-semibold text-[#F5F5F0] mt-1">
                        {selectedOrder.customer?.fullName || '—'}
                      </p>
                    </div>

                    <div>
                      <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                        Phone Number
                      </span>
                      <p className="font-mono-num font-semibold text-[#D4AF37] mt-1">
                        {selectedOrder.customer?.phone || '—'}
                      </p>
                    </div>

                    <div>
                      <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                        Email Address
                      </span>
                      <p className="text-[#F5F5F0] mt-1 break-all">
                        {selectedOrder.customer?.email || '—'}
                      </p>
                    </div>

                    <div>
                      <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                        City / Location
                      </span>
                      <p className="text-[#F5F5F0] mt-1">
                        {selectedOrder.customer?.city || '—'}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                        Complete Delivery Address
                      </span>
                      <p className="text-[#F5F5F0] mt-1">
                        {selectedOrder.customer?.address || '—'}
                      </p>
                    </div>

                    <div className="sm:col-span-3">
                      <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                        Customer Note
                      </span>
                      <p className="text-[#D4AF37] mt-1">
                        {selectedOrder.customer?.notes
                          ? selectedOrder.customer.notes
                          : 'No special instructions provided.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ordered Products Table (Historical Snapshots) */}
                <div className="bg-[#18181B]/60 border border-white/10 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <h3 className="font-display text-lg font-bold text-[#F5F5F0]">
                      Ordered Items ({snapshotItems.length})
                    </h3>
                    <span className="text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                      Historical Order Snapshot
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                          <th className="py-3 px-3">Product</th>
                          <th className="py-3 px-3">Size</th>
                          <th className="py-3 px-3">Color</th>
                          <th className="py-3 px-3">Quantity</th>
                          <th className="py-3 px-3">Unit Price</th>
                          <th className="py-3 px-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {snapshotItems.map((item, idx) => {
                          const imgSrc = resolveSnapshotImage(
                            item.productImageSnapshot,
                            item.productId
                          );
                          const lineTotal =
                            Number(item.subtotal) ||
                            Number(item.unitPrice || 0) * Number(item.quantity || 1);
                          return (
                            <tr key={`${item.productId}-${idx}`}>
                              <td className="py-3.5 px-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-14 bg-[#121214] border border-white/10 shrink-0 overflow-hidden">
                                    <SafeImage
                                      src={imgSrc}
                                      alt={item.productNameSnapshot}
                                      fallbackTitle={item.productNameSnapshot}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-[#F5F5F0]">
                                      {item.productNameSnapshot}
                                    </p>
                                    {item.productId && (
                                      <p className="text-[11px] font-mono-num text-[#A1A1AA]">
                                        Code: {item.productId}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-3 font-mono-num text-xs text-[#F5F5F0]">
                                {item.selectedSize || 'N/A'}
                              </td>
                              <td className="py-3.5 px-3 text-xs text-[#F5F5F0]">
                                {item.selectedColor || 'Standard'}
                              </td>
                              <td className="py-3.5 px-3 font-mono-num font-semibold text-[#F5F5F0]">
                                {item.quantity}
                              </td>
                              <td className="py-3.5 px-3 font-mono-num text-[#F5F5F0]">
                                {formatPKR(item.unitPrice)}
                              </td>
                              <td className="py-3.5 px-3 font-mono-num font-bold text-[#D4AF37] text-right">
                                {formatPKR(lineTotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Order Total Footer */}
                  <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs text-[#A1A1AA]">
                      Order Method:{' '}
                      <span className="text-[#F5F5F0] font-medium">{orderMethod}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                        Order Total
                      </span>
                      <span className="font-mono-num text-2xl font-bold text-[#D4AF37]">
                        {formatPKR(selectedOrder.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-white/10 bg-[#18181B]/60 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-6 py-2.5 bg-[#121214] border border-white/15 hover:border-[#D4AF37] text-xs font-semibold uppercase tracking-wider text-[#F5F5F0] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
