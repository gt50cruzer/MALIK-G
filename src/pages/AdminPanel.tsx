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
  Check,
  Ban,
} from 'lucide-react';
import { Order, OrderStatusType, OrderItemSnapshot, DashboardStats } from '../types';
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
  const { showToast, setCustomerSession, refreshCustomerAuth } = useStore();

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
        setAuthenticated(true);
        setCustomerAuthenticated(false);
        setAdminEmail(data.admin?.email || '');
        setCsrfToken(data.csrfToken || '');
      } else if (data.customerAuthenticated || data.role === 'customer') {
        if (data.sessionToken) setStoredSessionToken(data.sessionToken);
        setAuthenticated(false);
        setCustomerAuthenticated(true);
        setAdminEmail('');
        setCsrfToken(data.csrfToken || '');
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
      }
    } catch {
      setAuthenticated(false);
      setCustomerAuthenticated(false);
    } finally {
      setAuthChecking(false);
    }
  }, [setCustomerSession]);

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

    setLoginLoading(true);
    try {
      const res = await apiFetch('auth', 'action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: trimmedEmail,
          password: loginPassword,
        }),
      });
      const data = await safeJsonParse<{
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
      }>(res);
      if (!res.ok || (!data.authenticated && !data.customerAuthenticated)) {
        setLoginError(data.message || data.error || 'Invalid email or password.');
      } else if (data.authenticated && data.role === 'admin') {
        setCustomerSession(null, data.sessionToken || '');
        setAuthenticated(true);
        setCustomerAuthenticated(false);
        setAdminEmail(data.admin?.email || trimmedEmail);
        setCsrfToken(data.csrfToken || '');
        setLoginPassword('');
        navigate('/admin/', { replace: true });
      } else {
        // Customer login -> set customer session state immediately & return customer to storefront, never /admin/
        if (data.customerVaultToken) {
          addStoredCustomerVaultToken(data.customerVaultToken);
        }
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
    } catch {
      setLoginError('Unable to connect to authentication server.');
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

    setRegLoading(true);
    try {
      const res = await apiFetch('auth', 'action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: trimmedName,
          email: trimmedEmail,
          password: regPassword,
          confirmPassword: regConfirmPassword,
        }),
      });
      const data = await safeJsonParse<{
        success?: boolean;
        message?: string;
        error?: string;
        customerAuthenticated?: boolean;
        user?: { id?: number; fullName?: string; email?: string; role?: string };
        csrfToken?: string;
        sessionToken?: string;
        customerVaultToken?: string;
      }>(res);

      if (!res.ok || !data.success) {
        setRegError(data.message || data.error || 'Unable to create account.');
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
    } catch {
      setRegError('Unable to connect to authentication server.');
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
              <div className="p-3.5 bg-red-500/10 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{regError}</span>
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
            <div className="p-3.5 bg-red-500/10 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
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

      <div className="p-4 border-t border-white/10">
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

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-xs text-red-300 uppercase tracking-wider"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
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
          {/* VIEW 3: SETTINGS (/admin/settings) */}
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
          {/* PROTECTED PLACEHOLDER ROUTES (Products, Categories, Sales, Stock) */}
          {/* ================================================================ */}
          {activeSection !== 'dashboard' &&
            activeSection !== 'orders' &&
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
