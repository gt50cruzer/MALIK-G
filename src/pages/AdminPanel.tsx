import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ShoppingCart,
  FolderTree,
  Settings,
  KeyRound,
  LogOut,
  Search,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  X,
  Upload,
  Lock,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Users,
  TrendingUp,
} from 'lucide-react';
import {
  Product,
  Order,
  OrderStatusType,
  DashboardStats,
} from '../types';
import { formatPKR, calculateDiscountPercentage } from '../data/products';
import { useStore, safeJsonParse } from '../context/StoreContext';
import { SafeImage } from '../components/SafeImage';

type AdminTab =
  | 'dashboard'
  | 'orders'
  | 'products'
  | 'add-product'
  | 'categories'
  | 'customers'
  | 'sales'
  | 'settings';

const ORDER_STATUSES: OrderStatusType[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
];

const COMMON_COLORS = [
  { name: 'Black', hex: '#111111' },
  { name: 'White', hex: '#F9F9F6' },
  { name: 'Navy Blue', hex: '#1B2436' },
  { name: 'Blue', hex: '#1E3A8A' },
  { name: 'Brown', hex: '#5A321C' },
  { name: 'Olive', hex: '#3B4432' },
  { name: 'Charcoal', hex: '#27272A' },
  { name: 'Khaki', hex: '#B59E7A' },
  { name: 'Silver', hex: '#D4D4D8' },
  { name: 'Gold', hex: '#D4AF37' },
];

const COMMON_SIZES = [
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '30',
  '32',
  '34',
  '36',
  '38',
  '40',
  '39',
  '41',
  '42',
  '43',
  '44',
  '100ml',
];

export const AdminPanel: React.FC = () => {
  const { refreshCatalog, showToast } = useStore();

  // Authentication State
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [csrfToken, setCsrfToken] = useState('');

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Admin Navigation State
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  useEffect(() => {
    const p = location.pathname.replace(/\.php$/, '');
    if (p.endsWith('/orders') || p.endsWith('/order-view')) {
      setActiveTab('orders');
    } else if (p.endsWith('/products')) {
      setActiveTab('products');
    } else if (p.endsWith('/product-add') || p.endsWith('/product-edit')) {
      setActiveTab('add-product');
    } else if (p.endsWith('/categories')) {
      setActiveTab('categories');
    } else if (p.endsWith('/settings') || p.endsWith('/change-password')) {
      setActiveTab('settings');
    } else {
      setActiveTab('dashboard');
    }
  }, [location.pathname]);

  // Dashboard Data State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [adminCategories, setAdminCategories] = useState<
    { id: number; name: string; slug: string; subtitle: string }[]
  >([]);
  const [loadingData, setLoadingData] = useState(false);

  // Order Filters & View Modal
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Product Filters
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  const [productPublishFilter, setProductPublishFilter] = useState<
    'All' | 'Published' | 'Unpublished'
  >('All');
  const [productStockFilter, setProductStockFilter] = useState<
    'All' | 'InStock' | 'OutOfStock'
  >('All');

  // Add / Edit Product Form State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodTitle, setProdTitle] = useState('');
  const [prodShortDesc, setProdShortDesc] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodCategory, setProdCategory] = useState('Shirts');
  const [prodImage, setProdImage] = useState('');
  const [prodOriginalPrice, setProdOriginalPrice] = useState<string>('3000');
  const [discountMode, setDiscountMode] = useState<'20' | 'none' | 'custom'>('20');
  const [prodOfferPrice, setProdOfferPrice] = useState<string>('2400');
  const [prodColors, setProdColors] = useState<{ name: string; hex: string }[]>([
    { name: 'Black', hex: '#111111' },
  ]);
  const [customColorInput, setCustomColorInput] = useState('');
  const [sizesApplicable, setSizesApplicable] = useState(true);
  const [prodSizes, setProdSizes] = useState<string[]>(['S', 'M', 'L', 'XL']);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [prodInStock, setProdInStock] = useState(true);
  const [prodPublished, setProdPublished] = useState(true);
  const [prodIsNewArrival, setProdIsNewArrival] = useState(true);
  const [prodIsTrending, setProdIsTrending] = useState(false);
  const [prodFabric, setProdFabric] = useState('Premium Malik G Selection');
  const [prodFormError, setProdFormError] = useState('');
  const [prodSaving, setProdSaving] = useState(false);

  // Category Form State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySubtitle, setNewCategorySubtitle] = useState('');

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Check authentication status on mount
  const checkAuth = useCallback(async () => {
    setAuthChecking(true);
    try {
      const res = await fetch('/api/auth.php?action=check', {
        credentials: 'include',
      });
      const data = await safeJsonParse<{
        authenticated?: boolean;
        admin?: { email?: string };
        csrfToken?: string;
      }>(res);
      if (data.authenticated) {
        setAuthenticated(true);
        setAdminEmail(data.admin?.email || '');
        setCsrfToken(data.csrfToken || '');
      } else {
        setAuthenticated(false);
      }
    } catch {
      setAuthenticated(false);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Fetch all admin data from backend
  const fetchAdminData = useCallback(async () => {
    if (!authenticated) return;
    setLoadingData(true);
    try {
      const [dashRes, prodRes, ordRes, catRes] = await Promise.all([
        fetch('/api/dashboard.php', { credentials: 'include' }),
        fetch('/api/products.php?admin=1', { credentials: 'include' }),
        fetch('/api/orders.php', { credentials: 'include' }),
        fetch('/api/categories.php', { credentials: 'include' }),
      ]);

      if (dashRes.status === 401) {
        setAuthenticated(false);
        return;
      }

      if (dashRes.ok) {
        const dashData = await dashRes.json();
        if (dashData.success) setStats(dashData.stats);
      }
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (prodData.success) setAdminProducts(prodData.products || []);
      }
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        if (ordData.success) setAdminOrders(ordData.orders || []);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        if (catData.success) setAdminCategories(catData.categories || []);
      }
    } finally {
      setLoadingData(false);
    }
  }, [authenticated]);

  useEffect(() => {
    if (authenticated) {
      fetchAdminData();
    }
  }, [authenticated, fetchAdminData]);

  // Automatically compute Offer Price when Original Price or Discount Mode changes
  useEffect(() => {
    const orig = Number(prodOriginalPrice) || 0;
    if (discountMode === '20') {
      setProdOfferPrice(orig > 0 ? String(Math.round(orig * 0.8)) : '');
    } else if (discountMode === 'none') {
      setProdOfferPrice('');
    }
  }, [prodOriginalPrice, discountMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });
      const data = await safeJsonParse<{
        authenticated?: boolean;
        error?: string;
        message?: string;
        admin?: { email?: string };
        csrfToken?: string;
      }>(res);
      if (!res.ok || !data.authenticated) {
        setLoginError(data.message || data.error || 'Invalid email or password.');
      } else {
        setAuthenticated(true);
        setAdminEmail(data.admin?.email || loginEmail);
        setCsrfToken(data.csrfToken || '');
        setLoginPassword('');
      }
    } catch {
      setLoginError('Unable to connect to authentication server.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth.php?action=logout', {
      method: 'POST',
      credentials: 'include',
    });
    setAuthenticated(false);
    setAdminEmail('');
    setCsrfToken('');
  };

  // Image Upload Handler (Validates MIME type & size <= 5MB; uploads to /api/upload.php or converts to clean data URI in preview)
  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setProdFormError('Invalid image format. Only JPG, PNG, and WEBP images are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProdFormError('Image size must be under 5 MB.');
      return;
    }

    setProdFormError('');

    // First try PHP multipart upload (/api/upload.php on Hostinger)
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/upload.php', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
        credentials: 'include',
        body: formData,
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && data.imageUrl) {
            setProdImage(data.imageUrl);
            return;
          }
        }
      }
    } catch {
      // Fallback to client FileReader DataURL in preview mode
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProdImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProdTitle('');
    setProdShortDesc('');
    setProdDescription('');
    setProdCategory('Shirts');
    setProdImage('');
    setProdOriginalPrice('3000');
    setDiscountMode('20');
    setProdOfferPrice('2400');
    setProdColors([{ name: 'Black', hex: '#111111' }]);
    setSizesApplicable(true);
    setProdSizes(['S', 'M', 'L', 'XL']);
    setProdInStock(true);
    setProdPublished(true);
    setProdIsNewArrival(true);
    setProdIsTrending(false);
    setProdFabric('Premium Malik G Selection');
    setProdFormError('');
  };

  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProdTitle(product.name);
    setProdShortDesc(product.shortDescription || '');
    setProdDescription(product.description);
    setProdCategory(product.category);
    setProdImage(product.image);

    const orig = product.oldPrice || product.originalPrice || product.price;
    setProdOriginalPrice(String(orig));

    if (product.oldPrice && product.oldPrice > product.price) {
      const pct = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
      if (pct === 20) {
        setDiscountMode('20');
      } else {
        setDiscountMode('custom');
      }
      setProdOfferPrice(String(product.price));
    } else {
      setDiscountMode('none');
      setProdOfferPrice('');
    }

    setProdColors(
      product.colors && product.colors.length > 0
        ? product.colors
        : [{ name: 'Black', hex: '#111111' }]
    );

    if (product.sizes && product.sizes.length > 0) {
      setSizesApplicable(true);
      setProdSizes(product.sizes);
    } else {
      setSizesApplicable(false);
      setProdSizes([]);
    }

    setProdInStock(product.inStock);
    setProdPublished(product.published !== false);
    setProdIsNewArrival(Boolean(product.isNewArrival));
    setProdIsTrending(Boolean(product.isTrending));
    setProdFabric(product.fabricOrMaterial || 'Premium Malik G Selection');
    setProdFormError('');
    setActiveTab('add-product');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdFormError('');

    const origNum = Number(prodOriginalPrice);
    const offerNum =
      discountMode === 'none' || !prodOfferPrice ? null : Number(prodOfferPrice);

    if (!prodTitle.trim()) {
      setProdFormError('Product title is required.');
      return;
    }
    if (!prodDescription.trim()) {
      setProdFormError('Product description is required.');
      return;
    }
    if (!prodImage.trim()) {
      setProdFormError('Please upload a product image or provide an image URL.');
      return;
    }
    if (!origNum || origNum <= 0) {
      setProdFormError('Please enter a valid original price greater than Rs. 0.');
      return;
    }
    if (offerNum !== null && (offerNum <= 0 || offerNum >= origNum)) {
      setProdFormError('Offer price must be less than the original price.');
      return;
    }

    setProdSaving(true);
    try {
      const action = editingProductId ? 'update' : 'create';
      const res = await fetch(`/api/products.php?action=${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          id: editingProductId,
          name: prodTitle.trim(),
          shortDescription: prodShortDesc.trim() || prodDescription.trim().slice(0, 140),
          description: prodDescription.trim(),
          category: prodCategory,
          image: prodImage.trim(),
          originalPrice: origNum,
          offerPrice: offerNum,
          colors: prodColors,
          sizes: sizesApplicable ? prodSizes : [],
          inStock: prodInStock,
          published: prodPublished,
          isNewArrival: prodIsNewArrival,
          isTrending: prodIsTrending,
          fabricOrMaterial: prodFabric.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setProdFormError(data.error || 'Failed to save product.');
      } else {
        await fetchAdminData();
        await refreshCatalog();
        showToast(
          editingProductId
            ? 'Product updated successfully!'
            : 'Product published to catalog!',
          'success'
        );
        resetProductForm();
        setActiveTab('products');
      }
    } catch {
      setProdFormError('Network error while saving product.');
    } finally {
      setProdSaving(false);
    }
  };

  const handleTogglePublish = async (product: Product) => {
    const nextState = product.published === false;
    await fetch('/api/products.php?action=toggle_publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({ id: product.id, published: nextState }),
    });
    await fetchAdminData();
    await refreshCatalog();
    showToast(
      nextState
        ? `${product.name} is now Published on the public website.`
        : `${product.name} is now Unpublished and hidden from customers.`,
      'info'
    );
  };

  const handleToggleStock = async (product: Product) => {
    const nextStock = !product.inStock;
    await fetch('/api/products.php?action=toggle_stock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({ id: product.id, inStock: nextStock }),
    });
    await fetchAdminData();
    await refreshCatalog();
    showToast(
      nextStock
        ? `${product.name} marked In Stock.`
        : `${product.name} marked Out of Stock.`,
      'info'
    );
  };

  const handleDeleteProduct = async (product: Product) => {
    await fetch('/api/products.php?action=delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({ id: product.id }),
    });
    await fetchAdminData();
    await refreshCatalog();
    showToast(
      `${product.name} deleted from active catalog. Historical order snapshots remain intact.`,
      'info'
    );
  };

  const handleUpdateOrderStatus = async (
    orderNumber: string,
    newStatus: OrderStatusType
  ) => {
    const res = await fetch('/api/orders.php?action=update_status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({ orderNumber, status: newStatus }),
    });
    if (res.ok) {
      await fetchAdminData();
      if (selectedOrder && selectedOrder.orderNumber === orderNumber) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      showToast(`Order ${orderNumber} updated to ${newStatus}.`, 'success');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const res = await fetch('/api/categories.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({
        name: newCategoryName.trim(),
        subtitle: newCategorySubtitle.trim() || 'Curated collection at Malik G Collection',
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setNewCategoryName('');
      setNewCategorySubtitle('');
      await fetchAdminData();
      await refreshCatalog();
      showToast('Category added successfully.', 'success');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    const res = await fetch('/api/auth.php?action=change_password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setPasswordMessage({
        text: data.error || 'Could not update password.',
        type: 'error',
      });
    } else {
      setPasswordMessage({
        text: data.message || 'Password updated successfully!',
        type: 'success',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  // Filtered Orders for Admin Order List
  const filteredOrders = adminOrders.filter((o) => {
    if (orderStatusFilter !== 'All' && o.status !== orderStatusFilter) {
      return false;
    }
    if (orderSearch.trim()) {
      const q = orderSearch.trim().toLowerCase();
      const matchId = o.orderNumber.toLowerCase().includes(q);
      const matchName = o.customer.fullName.toLowerCase().includes(q);
      const matchPhone = o.customer.phone.toLowerCase().includes(q);
      if (!matchId && !matchName && !matchPhone) return false;
    }
    return true;
  });

  // Filtered Products for Admin Product List
  const filteredAdminProducts = adminProducts.filter((p) => {
    if (productCategoryFilter !== 'All' && p.category !== productCategoryFilter) {
      return false;
    }
    if (productPublishFilter === 'Published' && p.published === false) return false;
    if (productPublishFilter === 'Unpublished' && p.published !== false) return false;
    if (productStockFilter === 'InStock' && !p.inStock) return false;
    if (productStockFilter === 'OutOfStock' && p.inStock) return false;
    if (productSearch.trim()) {
      const q = productSearch.trim().toLowerCase();
      if (
        !p.name.toLowerCase().includes(q) &&
        !p.category.toLowerCase().includes(q) &&
        !p.sku.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center text-[#A1A1AA] text-sm">
        Loading...
      </div>
    );
  }

  // ============================================================================
  // UNAUTHENTICATED VIEW -> PROFESSIONAL SIGN IN PAGE
  // ============================================================================
  if (!authenticated) {
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

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="signin-email"
                className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
              >
                Email / Gmail
              </label>
              <input
                id="signin-email"
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="name@gmail.com"
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
              {loginLoading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>

          <div className="pt-4 border-t border-white/10 text-center">
            <Link
              to="/"
              className="text-xs text-[#A1A1AA] hover:text-[#D4AF37] uppercase tracking-wider"
            >
              ← Return to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // AUTHENTICATED VIEW -> ADMIN PANEL
  // ============================================================================
  return (
    <div className="min-h-screen bg-[#0B0B0C] text-[#F5F5F0] flex flex-col lg:flex-row">
      {/* Left Admin Sidebar */}
      <aside className="w-full lg:w-64 bg-[#121214] border-b lg:border-b-0 lg:border-r border-white/10 shrink-0 flex flex-col justify-between">
        <div>
          <div className="p-6 border-b border-white/10">
            <span className="block font-display text-xl font-bold tracking-[0.1em] text-[#D4AF37]">
              MALIK G COLLECTION
            </span>
            <span className="block text-[11px] text-[#A1A1AA] truncate mt-1">
              {adminEmail}
            </span>
          </div>

          <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'orders', label: `Orders (${adminOrders.length})`, icon: ShoppingCart },
              { id: 'products', label: `Products (${adminProducts.length})`, icon: Package },
              {
                id: 'add-product',
                label: editingProductId ? 'Edit Product' : 'Add Product',
                icon: PlusCircle,
              },
              { id: 'categories', label: 'Categories', icon: FolderTree },
              { id: 'customers', label: 'Customers / Order Customers', icon: Users },
              { id: 'sales', label: 'Sales', icon: TrendingUp },
              { id: 'settings', label: 'Change Password', icon: KeyRound },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'add-product' && activeTab !== 'add-product') {
                      resetProductForm();
                    }
                    setActiveTab(item.id as AdminTab);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-[#D4AF37] text-[#0B0B0C]'
                      : 'text-[#A1A1AA] hover:bg-white/5 hover:text-[#F5F5F0]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 space-y-2 hidden lg:block">
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 border border-white/15 text-xs text-[#A1A1AA] hover:text-[#F5F5F0] hover:border-white/30 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Public Store</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors uppercase tracking-wider"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-8 lg:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5F0] uppercase tracking-wide">
                {activeTab === 'dashboard' && 'Store & Sales Dashboard'}
                {activeTab === 'orders' && 'Order Management'}
                {activeTab === 'products' && 'Product Catalog Management'}
                {activeTab === 'add-product' &&
                  (editingProductId ? 'Edit Product' : 'Add New Product')}
                {activeTab === 'categories' && 'Categories Management'}
                {activeTab === 'customers' && 'Customers / Order Customers'}
                {activeTab === 'sales' && 'Sales & Revenue Report'}
                {activeTab === 'settings' && 'Change Password'}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={fetchAdminData}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#121214] border border-white/15 text-xs text-[#F5F5F0] hover:border-[#D4AF37]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                <span>Refresh Data</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-500/15 border border-red-500/30 text-xs text-red-300"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* ================================================================ */}
          {/* TAB 1: DASHBOARD & SALES ANALYTICS */}
          {/* ================================================================ */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-8">
              {/* Primary Revenue & Order KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#121214] border border-[#D4AF37]/40 p-5 space-y-1">
                  <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">
                    Total Money / Revenue
                  </span>
                  <div className="font-mono-num text-2xl font-bold text-[#D4AF37]">
                    {formatPKR(stats.totalRevenue)}
                  </div>
                  <span className="block text-[11px] text-[#A1A1AA]">
                    All active &amp; completed orders
                  </span>
                </div>

                <div className="bg-[#121214] border border-white/10 p-5 space-y-1">
                  <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">
                    Completed / Delivered Sales
                  </span>
                  <div className="font-mono-num text-2xl font-bold text-emerald-400">
                    {formatPKR(stats.deliveredRevenue)}
                  </div>
                  <span className="block text-[11px] text-[#A1A1AA]">
                    {stats.deliveredOrders} delivered orders
                  </span>
                </div>

                <div className="bg-[#121214] border border-white/10 p-5 space-y-1">
                  <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">
                    Pending Order Value
                  </span>
                  <div className="font-mono-num text-2xl font-bold text-[#F5F5F0]">
                    {formatPKR(stats.pendingOrderValue)}
                  </div>
                  <span className="block text-[11px] text-[#A1A1AA]">
                    {stats.pendingOrders} orders awaiting confirmation
                  </span>
                </div>

                <div className="bg-[#121214] border border-white/10 p-5 space-y-1">
                  <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">
                    Total Orders
                  </span>
                  <div className="font-mono-num text-2xl font-bold text-[#F5F5F0]">
                    {stats.totalOrders}
                  </div>
                  <span className="block text-[11px] text-[#A1A1AA]">
                    Saved in database
                  </span>
                </div>
              </div>

              {/* Date-Based Sales Summary (Today, This Week, This Month, All Time) */}
              <div className="bg-[#121214] border border-white/10 p-6 space-y-4">
                <h2 className="font-display text-xl font-bold text-[#F5F5F0]">
                  Sales Summary by Period
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Today', data: stats.periods.today },
                    { label: 'This Week', data: stats.periods.thisWeek },
                    { label: 'This Month', data: stats.periods.thisMonth },
                    { label: 'All Time', data: stats.periods.allTime },
                  ].map((period) => (
                    <div
                      key={period.label}
                      className="bg-[#18181B] border border-white/10 p-4 space-y-1"
                    >
                      <span className="text-xs uppercase tracking-wider text-[#D4AF37]">
                        {period.label}
                      </span>
                      <div className="font-mono-num text-lg font-bold text-[#F5F5F0]">
                        {formatPKR(period.data.sales)}
                      </div>
                      <span className="block text-xs text-[#A1A1AA] font-mono-num">
                        {period.data.orders} Orders
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Status Breakdown & Product Inventory Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {[
                  { label: 'Pending', count: stats.pendingOrders, tone: 'text-amber-400' },
                  { label: 'Confirmed', count: stats.confirmedOrders, tone: 'text-blue-400' },
                  { label: 'Processing', count: stats.processingOrders, tone: 'text-purple-400' },
                  { label: 'Shipped', count: stats.shippedOrders, tone: 'text-cyan-400' },
                  { label: 'Delivered', count: stats.deliveredOrders, tone: 'text-emerald-400' },
                  { label: 'Cancelled', count: stats.cancelledOrders, tone: 'text-red-400' },
                  { label: 'Total Products', count: stats.totalProducts, tone: 'text-[#D4AF37]' },
                  {
                    label: 'Out of Stock',
                    count: stats.outOfStockProducts,
                    tone: 'text-red-400',
                  },
                ].map((box) => (
                  <div
                    key={box.label}
                    className="bg-[#121214] border border-white/10 p-4 text-center space-y-1"
                  >
                    <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                      {box.label}
                    </span>
                    <span className={`font-mono-num text-xl font-bold ${box.tone}`}>
                      {box.count}
                    </span>
                  </div>
                ))}
              </div>

              {/* Recent Orders Compact Table */}
              <div className="bg-[#121214] border border-white/10 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-[#F5F5F0]">
                    Recent Orders
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-[#D4AF37] hover:underline uppercase tracking-wider"
                  >
                    View All Orders →
                  </button>
                </div>

                {adminOrders.length === 0 ? (
                  <p className="text-sm text-[#A1A1AA] py-6 text-center">
                    No customer orders have been placed yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-[#A1A1AA] uppercase text-[11px]">
                          <th className="py-3 px-3">Order ID</th>
                          <th className="py-3 px-3">Customer</th>
                          <th className="py-3 px-3">Phone</th>
                          <th className="py-3 px-3">Date &amp; Time</th>
                          <th className="py-3 px-3">Total</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {adminOrders.slice(0, 6).map((ord) => {
                          const dt = new Date(ord.createdAt);
                          return (
                            <tr key={ord.orderNumber} className="hover:bg-white/5">
                              <td className="py-3 px-3 font-mono-num font-bold text-[#D4AF37]">
                                {ord.orderNumber}
                              </td>
                              <td className="py-3 px-3 font-medium text-[#F5F5F0]">
                                {ord.customer.fullName}
                              </td>
                              <td className="py-3 px-3 font-mono-num text-[#A1A1AA]">
                                {ord.customer.phone}
                              </td>
                              <td className="py-3 px-3 font-mono-num text-xs text-[#A1A1AA]">
                                {dt.toLocaleDateString()} · {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-3 px-3 font-mono-num font-semibold text-[#F5F5F0]">
                                {formatPKR(ord.total)}
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-semibold text-[#D4AF37]">
                                  {ord.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrder(ord)}
                                  className="px-3 py-1.5 bg-[#D4AF37] text-[#0B0B0C] font-bold text-xs uppercase tracking-wider"
                                >
                                  View Order
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 2: ORDER MANAGEMENT */}
          {/* ================================================================ */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {/* Search & Status Filter Controls */}
              <div className="bg-[#121214] border border-white/10 p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by Order ID (MGC-...), customer name, or phone..."
                    className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#F5F5F0] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {['All', ...ORDER_STATUSES].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider border transition-colors ${
                        orderStatusFilter === st
                          ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0B0B0C]'
                          : 'border-white/15 bg-[#18181B] text-[#A1A1AA] hover:text-[#F5F5F0]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compact Order Summary Table */}
              <div className="bg-[#121214] border border-white/10 overflow-x-auto">
                {filteredOrders.length === 0 ? (
                  <div className="p-12 text-center text-sm text-[#A1A1AA]">
                    No orders match your current search or status filter.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-[#18181B] text-[#A1A1AA] uppercase text-[11px]">
                        <th className="py-3.5 px-4">Order ID</th>
                        <th className="py-3.5 px-4">Customer Name</th>
                        <th className="py-3.5 px-4">Phone</th>
                        <th className="py-3.5 px-4">Email</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Time</th>
                        <th className="py-3.5 px-4">Total</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredOrders.map((ord) => {
                        const dt = new Date(ord.createdAt);
                        return (
                          <tr key={ord.orderNumber} className="hover:bg-white/5">
                            <td className="py-3.5 px-4 font-mono-num font-bold text-[#D4AF37]">
                              {ord.orderNumber}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#F5F5F0]">
                              {ord.customer.fullName}
                            </td>
                            <td className="py-3.5 px-4 font-mono-num text-[#F5F5F0]">
                              {ord.customer.phone}
                            </td>
                            <td className="py-3.5 px-4 text-[#A1A1AA]">
                              {ord.customer.email}
                            </td>
                            <td className="py-3.5 px-4 font-mono-num text-[#A1A1AA]">
                              {dt.toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4 font-mono-num text-[#A1A1AA]">
                              {dt.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-3.5 px-4 font-mono-num font-bold text-[#F5F5F0]">
                              {formatPKR(ord.total)}
                            </td>
                            <td className="py-3.5 px-4">
                              <select
                                value={ord.status}
                                onChange={(e) =>
                                  handleUpdateOrderStatus(
                                    ord.orderNumber,
                                    e.target.value as OrderStatusType
                                  )
                                }
                                className="bg-[#18181B] border border-white/20 text-xs font-semibold text-[#D4AF37] px-2.5 py-1.5 focus:outline-none focus:border-[#D4AF37]"
                              >
                                {ORDER_STATUSES.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(ord)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] font-bold text-xs uppercase tracking-wider"
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
          )}

          {/* ================================================================ */}
          {/* TAB 3: PRODUCT CATALOG MANAGEMENT */}
          {/* ================================================================ */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Search & Filter Bar */}
              <div className="bg-[#121214] border border-white/10 p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products by name, category, or SKU..."
                    className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#F5F5F0] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="bg-[#18181B] border border-white/15 text-xs text-[#F5F5F0] px-3 py-2.5"
                  >
                    <option value="All">All Categories</option>
                    {adminCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={productPublishFilter}
                    onChange={(e) =>
                      setProductPublishFilter(
                        e.target.value as 'All' | 'Published' | 'Unpublished'
                      )
                    }
                    className="bg-[#18181B] border border-white/15 text-xs text-[#F5F5F0] px-3 py-2.5"
                  >
                    <option value="All">All Publish Status</option>
                    <option value="Published">Published</option>
                    <option value="Unpublished">Unpublished</option>
                  </select>

                  <select
                    value={productStockFilter}
                    onChange={(e) =>
                      setProductStockFilter(
                        e.target.value as 'All' | 'InStock' | 'OutOfStock'
                      )
                    }
                    className="bg-[#18181B] border border-white/15 text-xs text-[#F5F5F0] px-3 py-2.5"
                  >
                    <option value="All">All Stock Status</option>
                    <option value="InStock">In Stock</option>
                    <option value="OutOfStock">Out of Stock</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      resetProductForm();
                      setActiveTab('add-product');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Product</span>
                  </button>
                </div>
              </div>

              {/* Products Table */}
              <div className="bg-[#121214] border border-white/10 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#18181B] text-[#A1A1AA] uppercase text-[11px]">
                      <th className="py-3.5 px-4">Product</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Original / Offer Price</th>
                      <th className="py-3.5 px-4">Colors &amp; Sizes</th>
                      <th className="py-3.5 px-4">Stock</th>
                      <th className="py-3.5 px-4">Visibility</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredAdminProducts.map((prod) => {
                      const disc = calculateDiscountPercentage(prod.price, prod.oldPrice);
                      return (
                        <tr key={prod.id} className="hover:bg-white/5">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-14 bg-[#18181B] shrink-0 overflow-hidden border border-white/10">
                                <SafeImage
                                  src={prod.image}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <div className="font-semibold text-[#F5F5F0]">
                                  {prod.name}
                                </div>
                                <div className="text-[11px] font-mono-num text-[#A1A1AA]">
                                  {prod.sku}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[#A1A1AA]">{prod.category}</td>
                          <td className="py-3.5 px-4 font-mono-num">
                            <div className="font-bold text-[#D4AF37]">
                              {formatPKR(prod.price)}
                            </div>
                            {prod.oldPrice && (
                              <div className="text-xs text-[#A1A1AA] line-through">
                                {formatPKR(prod.oldPrice)} ({disc}% OFF)
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#A1A1AA]">
                            <div>
                              Colors:{' '}
                              <span className="text-[#F5F5F0]">
                                {prod.colors && prod.colors.length > 0
                                  ? prod.colors.map((c) => c.name).join(', ')
                                  : 'Standard'}
                              </span>
                            </div>
                            <div>
                              Sizes:{' '}
                              <span className="text-[#F5F5F0] font-mono-num">
                                {prod.sizes && prod.sizes.length > 0
                                  ? prod.sizes.join(', ')
                                  : 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleStock(prod)}
                              className={`px-2.5 py-1 text-xs font-semibold border transition-colors ${
                                prod.inStock
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                  : 'border-red-500/40 bg-red-500/10 text-red-300'
                              }`}
                            >
                              {prod.inStock ? 'In Stock' : 'Out of Stock'}
                            </button>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(prod)}
                              className={`px-2.5 py-1 text-xs font-semibold border transition-colors ${
                                prod.published !== false
                                  ? 'border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#D4AF37]'
                                  : 'border-white/20 bg-white/5 text-[#A1A1AA]'
                              }`}
                            >
                              {prod.published !== false ? 'Published' : 'Unpublished'}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditProduct(prod)}
                                className="p-2 bg-[#18181B] border border-white/15 text-[#F5F5F0] hover:border-[#D4AF37] hover:text-[#D4AF37]"
                                title="Edit Product"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(prod)}
                                className="p-2 bg-[#18181B] border border-white/15 text-[#A1A1AA] hover:border-red-500/50 hover:text-red-400"
                                title="Delete Product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 4: ADD / EDIT PRODUCT FORM */}
          {/* ================================================================ */}
          {activeTab === 'add-product' && (
            <form
              onSubmit={handleSaveProduct}
              className="bg-[#121214] border border-white/10 p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="font-display text-2xl font-bold text-[#F5F5F0]">
                  {editingProductId ? `Editing: ${prodTitle}` : 'Add New Product'}
                </h2>
                {editingProductId && (
                  <button
                    type="button"
                    onClick={resetProductForm}
                    className="text-xs text-[#A1A1AA] hover:text-[#F5F5F0] uppercase tracking-wider"
                  >
                    Cancel Edit / Reset
                  </button>
                )}
              </div>

              {prodFormError && (
                <div className="p-4 bg-red-500/10 border border-red-500/40 text-xs text-red-300">
                  {prodFormError}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Image Upload & Preview */}
                <div className="lg:col-span-4 space-y-4">
                  <label className="block text-xs uppercase tracking-wider text-[#F5F5F0]">
                    Product Image *
                  </label>

                  <div className="aspect-[4/5] bg-[#18181B] border border-white/15 flex flex-col items-center justify-center overflow-hidden relative">
                    {prodImage ? (
                      <SafeImage
                        src={prodImage}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-6 space-y-2 text-[#A1A1AA]">
                        <Upload className="w-8 h-8 mx-auto text-[#D4AF37]" />
                        <p className="text-xs">Upload JPG, PNG, or WEBP (Max 5MB)</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#18181B] border border-[#D4AF37]/60 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0B0B0C] text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>Upload Product Image</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-[#A1A1AA]">Or Image Path / URL:</span>
                    <input
                      type="text"
                      value={prodImage}
                      onChange={(e) => setProdImage(e.target.value)}
                      placeholder="/uploads/product.jpg"
                      className="w-full bg-[#18181B] border border-white/15 px-3 py-2 text-xs text-[#F5F5F0] focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Right Column: Title, Category, Pricing (20% OFF / Custom / None), Colors, Sizes, Stock */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-1 space-y-1.5">
                      <label className="block text-xs uppercase tracking-wider text-[#F5F5F0]">
                        Product Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={prodTitle}
                        onChange={(e) => setProdTitle(e.target.value)}
                        placeholder="e.g. Premium Black Oxford Shirt"
                        className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-[#F5F5F0] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-1 space-y-1.5">
                      <label className="block text-xs uppercase tracking-wider text-[#F5F5F0]">
                        Category *
                      </label>
                      <select
                        value={prodCategory}
                        onChange={(e) => setProdCategory(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-[#F5F5F0] focus:outline-none"
                      >
                        {adminCategories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="block text-xs uppercase tracking-wider text-[#F5F5F0]">
                      Full Description *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={prodDescription}
                      onChange={(e) => setProdDescription(e.target.value)}
                      placeholder="Describe fabric, fit, craftsmanship, and styling..."
                      className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-[#F5F5F0] focus:outline-none"
                    />
                  </div>

                  {/* Pricing & Owner-Controlled Discount (20% OFF Default / None / Custom) */}
                  <div className="bg-[#18181B] border border-white/10 p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                        Pricing &amp; Discount Control
                      </span>
                      <div className="flex items-center gap-2">
                        {[
                          { id: '20', label: '20% OFF (Default)' },
                          { id: 'custom', label: 'Custom Offer' },
                          { id: 'none', label: 'No Discount' },
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() =>
                              setDiscountMode(mode.id as '20' | 'none' | 'custom')
                            }
                            className={`px-3 py-1 text-xs font-semibold border transition-colors ${
                              discountMode === mode.id
                                ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0B0B0C]'
                                : 'border-white/15 text-[#A1A1AA] hover:text-[#F5F5F0]'
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs text-[#A1A1AA]">
                          Original Price (Rs.) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={prodOriginalPrice}
                          onChange={(e) => setProdOriginalPrice(e.target.value)}
                          className="w-full bg-[#121214] border border-white/15 px-3.5 py-2.5 text-sm font-mono-num text-[#F5F5F0] focus:border-[#D4AF37] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs text-[#A1A1AA]">
                          Offer Price (Rs.) {discountMode === 'none' && '(Disabled)'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          disabled={discountMode === 'none'}
                          value={prodOfferPrice}
                          onChange={(e) => {
                            setDiscountMode('custom');
                            setProdOfferPrice(e.target.value);
                          }}
                          placeholder="No discount"
                          className="w-full bg-[#121214] border border-white/15 disabled:opacity-40 px-3.5 py-2.5 text-sm font-mono-num text-[#D4AF37] font-bold focus:border-[#D4AF37] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Colors Selection */}
                  <div className="space-y-2.5">
                    <label className="block text-xs uppercase tracking-wider text-[#F5F5F0]">
                      Available Colors
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_COLORS.map((c) => {
                        const selected = prodColors.some(
                          (pc) => pc.name.toLowerCase() === c.name.toLowerCase()
                        );
                        return (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => {
                              if (selected) {
                                setProdColors(
                                  prodColors.filter(
                                    (pc) => pc.name.toLowerCase() !== c.name.toLowerCase()
                                  )
                                );
                              } else {
                                setProdColors([...prodColors, c]);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors ${
                              selected
                                ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#F5F5F0] font-semibold'
                                : 'border-white/15 bg-[#18181B] text-[#A1A1AA]'
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full border border-white/30"
                              style={{ backgroundColor: c.hex }}
                            />
                            <span>{c.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={customColorInput}
                        onChange={(e) => setCustomColorInput(e.target.value)}
                        placeholder="Add custom color (e.g. Burgundy)..."
                        className="bg-[#18181B] border border-white/15 px-3 py-1.5 text-xs text-[#F5F5F0] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customColorInput.trim()) {
                            setProdColors([
                              ...prodColors,
                              { name: customColorInput.trim(), hex: '#27272A' },
                            ]);
                            setCustomColorInput('');
                          }
                        }}
                        className="px-3 py-1.5 bg-white/10 text-xs text-[#F5F5F0] hover:bg-[#D4AF37] hover:text-[#0B0B0C]"
                      >
                        + Add Color
                      </button>
                    </div>
                  </div>

                  {/* Sizes Selection */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-wider text-[#F5F5F0]">
                        Available Sizes
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs text-[#A1A1AA] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!sizesApplicable}
                          onChange={(e) => setSizesApplicable(!e.target.checked)}
                        />
                        <span>Sizes Not Applicable (e.g. Watches)</span>
                      </label>
                    </div>

                    {sizesApplicable && (
                      <>
                        <div className="flex flex-wrap gap-1.5">
                          {COMMON_SIZES.map((sz) => {
                            const active = prodSizes.includes(sz);
                            return (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => {
                                  if (active) {
                                    setProdSizes(prodSizes.filter((s) => s !== sz));
                                  } else {
                                    setProdSizes([...prodSizes, sz]);
                                  }
                                }}
                                className={`px-3 py-1.5 text-xs font-mono-num border transition-colors ${
                                  active
                                    ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0B0B0C] font-bold'
                                    : 'border-white/15 bg-[#18181B] text-[#A1A1AA]'
                                }`}
                              >
                                {sz}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={customSizeInput}
                            onChange={(e) => setCustomSizeInput(e.target.value)}
                            placeholder="Add custom size..."
                            className="bg-[#18181B] border border-white/15 px-3 py-1.5 text-xs text-[#F5F5F0] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                customSizeInput.trim() &&
                                !prodSizes.includes(customSizeInput.trim())
                              ) {
                                setProdSizes([...prodSizes, customSizeInput.trim()]);
                                setCustomSizeInput('');
                              }
                            }}
                            className="px-3 py-1.5 bg-white/10 text-xs text-[#F5F5F0] hover:bg-[#D4AF37] hover:text-[#0B0B0C]"
                          >
                            + Add Size
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Stock & Publish Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/10">
                    <div>
                      <span className="block text-xs uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                        Stock Availability
                      </span>
                      <select
                        value={prodInStock ? 'in' : 'out'}
                        onChange={(e) => setProdInStock(e.target.value === 'in')}
                        className="w-full bg-[#18181B] border border-white/15 px-3 py-2 text-xs text-[#F5F5F0]"
                      >
                        <option value="in">In Stock</option>
                        <option value="out">Out of Stock</option>
                      </select>
                    </div>

                    <div>
                      <span className="block text-xs uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                        Publish Status
                      </span>
                      <select
                        value={prodPublished ? 'pub' : 'unpub'}
                        onChange={(e) => setProdPublished(e.target.value === 'pub')}
                        className="w-full bg-[#18181B] border border-white/15 px-3 py-2 text-xs text-[#F5F5F0]"
                      >
                        <option value="pub">Published (Visible on Store)</option>
                        <option value="unpub">Unpublished (Hidden)</option>
                      </select>
                    </div>

                    <div>
                      <span className="block text-xs uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                        Material / Specification
                      </span>
                      <input
                        type="text"
                        value={prodFabric}
                        onChange={(e) => setProdFabric(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/15 px-3 py-2 text-xs text-[#F5F5F0]"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center gap-4">
                    <button
                      type="submit"
                      disabled={prodSaving}
                      className="px-8 py-4 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] text-xs font-bold uppercase tracking-[0.15em] transition-colors"
                    >
                      {prodSaving
                        ? 'SAVING...'
                        : editingProductId
                        ? 'SAVE PRODUCT CHANGES'
                        : prodPublished
                        ? 'PUBLISH PRODUCT'
                        : 'SAVE UNPUBLISHED PRODUCT'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* ================================================================ */}
          {/* TAB 5: CATEGORIES MANAGEMENT */}
          {/* ================================================================ */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-5 bg-[#121214] border border-white/10 p-6 space-y-4 h-fit">
                <h2 className="font-display text-xl font-bold text-[#F5F5F0]">
                  Add Category
                </h2>
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs uppercase tracking-wider text-[#F5F5F0]">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Kurta / Waistcoats"
                      className="w-full bg-[#18181B] border border-white/15 px-3.5 py-2.5 text-sm text-[#F5F5F0]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      value={newCategorySubtitle}
                      onChange={(e) => setNewCategorySubtitle(e.target.value)}
                      placeholder="Short category description..."
                      className="w-full bg-[#18181B] border border-white/15 px-3.5 py-2.5 text-sm text-[#F5F5F0]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider"
                  >
                    Create Category
                  </button>
                </form>
              </div>

              <div className="md:col-span-7 bg-[#121214] border border-white/10 p-6 space-y-4">
                <h2 className="font-display text-xl font-bold text-[#F5F5F0]">
                  Existing Store Categories
                </h2>
                <div className="divide-y divide-white/10">
                  {adminCategories.map((c) => (
                    <div
                      key={c.id}
                      className="py-3 flex items-center justify-between text-sm"
                    >
                      <div>
                        <span className="font-semibold text-[#F5F5F0]">{c.name}</span>
                        <span className="block text-xs text-[#A1A1AA]">{c.subtitle}</span>
                      </div>
                      <span className="font-mono-num text-xs text-[#D4AF37]">
                        {
                          adminProducts.filter(
                            (p) => p.category.toLowerCase() === c.name.toLowerCase()
                          ).length
                        }{' '}
                        Products
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 5B: CUSTOMERS / ORDER CUSTOMERS */}
          {/* ================================================================ */}
          {activeTab === 'customers' && (
            <div className="bg-[#121214] border border-white/10 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#F5F5F0]">
                    Order Customers Directory
                  </h2>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    Customers who have placed orders on Malik G Collection (no registration required).
                  </p>
                </div>
              </div>
              {adminOrders.length === 0 ? (
                <p className="text-sm text-[#A1A1AA] py-8 text-center">
                  No customer orders recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-[#A1A1AA] uppercase text-[11px]">
                        <th className="py-3 px-3">Customer Name</th>
                        <th className="py-3 px-3">Phone</th>
                        <th className="py-3 px-3">Email / Gmail</th>
                        <th className="py-3 px-3">City</th>
                        <th className="py-3 px-3">Address</th>
                        <th className="py-3 px-3">Latest Order</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {adminOrders.map((ord) => (
                        <tr key={ord.orderNumber} className="hover:bg-white/5">
                          <td className="py-3 px-3 font-medium text-[#F5F5F0]">
                            {ord.customer.fullName}
                          </td>
                          <td className="py-3 px-3 font-mono-num text-[#D4AF37]">
                            {ord.customer.phone}
                          </td>
                          <td className="py-3 px-3 text-[#A1A1AA]">
                            {ord.customer.email}
                          </td>
                          <td className="py-3 px-3 text-[#F5F5F0]">
                            {ord.customer.city}
                          </td>
                          <td className="py-3 px-3 text-xs text-[#A1A1AA] max-w-xs truncate">
                            {ord.customer.address}
                          </td>
                          <td className="py-3 px-3 font-mono-num text-xs">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(ord)}
                              className="text-[#D4AF37] hover:underline font-bold"
                            >
                              {ord.orderNumber} ({formatPKR(ord.total)})
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 5C: SALES & REVENUE BREAKDOWN */}
          {/* ================================================================ */}
          {activeTab === 'sales' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Today', data: stats.periods.today },
                  { label: 'This Week', data: stats.periods.thisWeek },
                  { label: 'This Month', data: stats.periods.thisMonth },
                  { label: 'All Time', data: stats.periods.allTime },
                ].map((period) => (
                  <div
                    key={period.label}
                    className="bg-[#121214] border border-white/10 p-5 space-y-1"
                  >
                    <span className="text-xs uppercase tracking-wider text-[#D4AF37]">
                      {period.label}
                    </span>
                    <div className="font-mono-num text-2xl font-bold text-[#F5F5F0]">
                      {formatPKR(period.data.sales)}
                    </div>
                    <span className="block text-xs text-[#A1A1AA] font-mono-num">
                      {period.data.orders} Orders
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-[#121214] border border-white/10 p-6 space-y-4">
                <h2 className="font-display text-xl font-bold text-[#F5F5F0]">
                  Revenue Breakdown by Status
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="p-4 bg-[#18181B] border border-white/10">
                    <span className="text-xs uppercase text-[#A1A1AA]">Total Active Revenue</span>
                    <p className="font-mono-num text-xl font-bold text-[#D4AF37] mt-1">
                      {formatPKR(stats.totalRevenue)}
                    </p>
                  </div>
                  <div className="p-4 bg-[#18181B] border border-white/10">
                    <span className="text-xs uppercase text-[#A1A1AA]">Delivered Revenue</span>
                    <p className="font-mono-num text-xl font-bold text-emerald-400 mt-1">
                      {formatPKR(stats.deliveredRevenue)}
                    </p>
                  </div>
                  <div className="p-4 bg-[#18181B] border border-white/10">
                    <span className="text-xs uppercase text-[#A1A1AA]">Pending Order Value</span>
                    <p className="font-mono-num text-xl font-bold text-amber-400 mt-1">
                      {formatPKR(stats.pendingOrderValue)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 6: SETTINGS & CHANGE PASSWORD */}
          {/* ================================================================ */}
          {activeTab === 'settings' && (
            <div className="max-w-xl bg-[#121214] border border-white/10 p-6 sm:p-8 space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="font-display text-2xl font-bold text-[#F5F5F0]">
                  Change Owner Password
                </h2>
                <p className="text-xs text-[#A1A1AA] mt-1">
                  Uses secure server-side password_hash() and password_verify(). After changing your password, your previous password will immediately stop working.
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
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passwordMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider text-[#F5F5F0]">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider text-[#F5F5F0]">
                    New Password (Min 8 characters) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider text-[#F5F5F0]">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="px-8 py-3.5 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] text-xs font-bold uppercase tracking-[0.15em] transition-colors"
                >
                  UPDATE PASSWORD
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VIEW FULL ORDER DETAILS MODAL (Immutable Product Snapshots) */}
      {/* ==================================================================== */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-[#121214] border border-white/20 max-w-3xl w-full p-6 sm:p-8 space-y-6 my-8 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 p-2 text-[#A1A1AA] hover:text-[#F5F5F0]"
              aria-label="Close order details"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 pr-8">
              <div>
                <span className="text-xs uppercase tracking-wider text-[#D4AF37]">
                  Complete Order Information
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5F0] font-mono-num">
                  {selectedOrder.orderNumber}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">
                  Status:
                </span>
                <select
                  value={selectedOrder.status}
                  onChange={(e) =>
                    handleUpdateOrderStatus(
                      selectedOrder.orderNumber,
                      e.target.value as OrderStatusType
                    )
                  }
                  className="bg-[#18181B] border border-[#D4AF37] text-xs font-bold text-[#D4AF37] px-3 py-2"
                >
                  {ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer & Order Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#18181B] border border-white/10 p-5 text-xs sm:text-sm">
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                  Customer Information
                </h3>
                <div>
                  <span className="text-[#A1A1AA]">Full Name: </span>
                  <strong className="text-[#F5F5F0]">
                    {selectedOrder.customer.fullName}
                  </strong>
                </div>
                <div>
                  <span className="text-[#A1A1AA]">Phone Number: </span>
                  <strong className="text-[#F5F5F0] font-mono-num">
                    {selectedOrder.customer.phone}
                  </strong>
                </div>
                <div>
                  <span className="text-[#A1A1AA]">Gmail / Email: </span>
                  <strong className="text-[#F5F5F0]">
                    {selectedOrder.customer.email}
                  </strong>
                </div>
                <div>
                  <span className="text-[#A1A1AA]">Location / City: </span>
                  <strong className="text-[#F5F5F0]">
                    {selectedOrder.customer.city}
                  </strong>
                </div>
                <div>
                  <span className="text-[#A1A1AA]">Full Address: </span>
                  <strong className="text-[#F5F5F0]">
                    {selectedOrder.customer.address}
                  </strong>
                </div>
                {selectedOrder.customer.notes && (
                  <div>
                    <span className="text-[#A1A1AA]">Order Note: </span>
                    <span className="text-[#D4AF37]">
                      {selectedOrder.customer.notes}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                  Order Information
                </h3>
                <div>
                  <span className="text-[#A1A1AA]">Order ID: </span>
                  <strong className="text-[#F5F5F0] font-mono-num">
                    {selectedOrder.orderNumber}
                  </strong>
                </div>
                <div>
                  <span className="text-[#A1A1AA]">Date: </span>
                  <strong className="text-[#F5F5F0] font-mono-num">
                    {new Date(selectedOrder.createdAt).toLocaleDateString()}
                  </strong>
                </div>
                <div>
                  <span className="text-[#A1A1AA]">Time: </span>
                  <strong className="text-[#F5F5F0] font-mono-num">
                    {new Date(selectedOrder.createdAt).toLocaleTimeString()}
                  </strong>
                </div>
                <div>
                  <span className="text-[#A1A1AA]">Current Status: </span>
                  <strong className="text-[#D4AF37]">{selectedOrder.status}</strong>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <span className="text-[#A1A1AA]">Total Amount: </span>
                  <strong className="text-lg font-mono-num text-[#D4AF37]">
                    {formatPKR(selectedOrder.total)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Ordered Product Snapshots */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                Ordered Products (Historical Price &amp; Image Snapshot)
              </h3>
              <div className="divide-y divide-white/10 border border-white/10 bg-[#18181B]">
                {(selectedOrder.orderItems && selectedOrder.orderItems.length > 0
                  ? selectedOrder.orderItems
                  : selectedOrder.items.map((i) => ({
                      productId: i.product.id,
                      productNameSnapshot: i.product.name,
                      productImageSnapshot: i.product.image,
                      selectedColor: i.selectedColor || 'Standard',
                      selectedSize: i.selectedSize || 'N/A',
                      quantity: i.quantity,
                      unitPrice: i.product.price,
                      originalPriceSnapshot: i.product.oldPrice || i.product.price,
                      subtotal: i.product.price * i.quantity,
                    }))
                ).map((item, index) => (
                  <div
                    key={`${item.productId}-${index}`}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-16 bg-[#0B0B0C] border border-white/10 shrink-0 overflow-hidden">
                        <SafeImage
                          src={item.productImageSnapshot}
                          alt={item.productNameSnapshot}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold text-[#F5F5F0]">
                          {item.productNameSnapshot}
                        </div>
                        <div className="text-xs text-[#A1A1AA]">
                          Color: <strong className="text-[#F5F5F0]">{item.selectedColor}</strong>
                          {' · '}
                          Size: <strong className="text-[#F5F5F0] font-mono-num">{item.selectedSize}</strong>
                          {' · '}
                          Quantity: <strong className="text-[#F5F5F0] font-mono-num">{item.quantity}</strong>
                        </div>
                        <div className="text-xs font-mono-num text-[#A1A1AA]">
                          Unit Offer Price:{' '}
                          <span className="text-[#D4AF37] font-semibold">
                            {formatPKR(item.unitPrice)}
                          </span>
                          {item.originalPriceSnapshot > item.unitPrice && (
                            <span className="ml-2 line-through opacity-75">
                              Orig: {formatPKR(item.originalPriceSnapshot)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono-num self-end sm:self-center">
                      <span className="block text-[10px] uppercase text-[#A1A1AA]">
                        Subtotal
                      </span>
                      <span className="text-sm font-bold text-[#F5F5F0]">
                        {formatPKR(item.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2.5 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
