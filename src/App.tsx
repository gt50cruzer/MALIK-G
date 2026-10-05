import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { QuickViewModal } from './components/QuickViewModal';
import { SearchModal } from './components/SearchModal';
import { FloatingActions } from './components/FloatingActions';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetails } from './pages/ProductDetails';
import { Wishlist } from './pages/Wishlist';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderSuccess } from './pages/OrderSuccess';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { AdminPanel } from './pages/AdminPanel';
import { CustomerAccount } from './pages/CustomerAccount';

const ScrollToTopAndSEO: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const routeTitles: Record<string, string> = {
      '/': 'Malik G Collection | Fashion, Shoes, Watches & Perfumes',
      '/shop': 'Shop Complete Collection | Malik G Collection Sialkot',
      '/shirts': "Men's Shirts Collection | Malik G Collection",
      '/pants': "Men's Pants & Trousers | Malik G Collection",
      '/shoes': "Men's Formal Shoes & Sneakers | Malik G Collection",
      '/watches': 'Luxury Watches Collection | Malik G Collection',
      '/perfumes': 'Signature Perfumes & Fragrances | Malik G Collection',
      '/new-arrivals': 'New Arrivals | Malik G Collection',
      '/sale': 'Sale & Exclusive Discounts | Malik G Collection',
      '/wishlist': 'My Wishlist | Malik G Collection',
      '/cart': 'Shopping Bag | Malik G Collection',
      '/checkout': 'Complete Your Order | Malik G Collection',
      '/order-success': 'Order Confirmed | Malik G Collection',
      '/about': 'About Malik G Collection | Sialkot, Pakistan',
      '/contact': 'Contact Malik G Collection | 0321 7126828',
      '/admin': 'Malik G Collection',
      '/admin/': 'Malik G Collection',
      '/admin/orders': 'Orders | Malik G Collection',
      '/admin/products': 'Products | Malik G Collection',
      '/admin/categories': 'Categories | Malik G Collection',
      '/admin/sales': 'Sales | Malik G Collection',
      '/admin/stock': 'Stock | Malik G Collection',
      '/admin/settings': 'Settings | Malik G Collection',
      '/admin/login': 'Sign In | Malik G Collection',
      '/admin/login.php': 'Sign In | Malik G Collection',
      '/sign-in': 'Sign In | Malik G Collection',
      '/signin': 'Sign In | Malik G Collection',
      '/create-account': 'Create Account | Malik G Collection',
      '/account': 'My Account | Malik G Collection',
      '/account/orders': 'Order History | Malik G Collection',
      '/account/settings': 'Account Settings | Malik G Collection',
    };

    document.title =
      routeTitles[pathname] ||
      'Malik G Collection | Fashion, Shoes, Watches & Perfumes';
  }, [pathname]);

  return null;
};

const NotFound: React.FC = () => (
  <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-6">
    <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">404 Error</p>
    <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#F5F5F0]">
      Page Not Found
    </h1>
    <p className="text-sm text-[#A1A1AA] max-w-md mx-auto">
      The page you requested does not exist. Explore our categories below or return to the homepage.
    </p>
    <div className="flex items-center justify-center gap-4">
      <Link
        to="/"
        className="px-6 py-3.5 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider"
      >
        Back to Home
      </Link>
      <Link
        to="/shop"
        className="px-6 py-3.5 border border-white/20 text-[#F5F5F0] hover:border-[#D4AF37] text-xs font-semibold uppercase tracking-wider"
      >
        Browse Shop
      </Link>
    </div>
  </div>
);

const AppShell: React.FC = () => {
  const { pathname } = useLocation();
  const isAdminRoute =
    pathname.startsWith('/admin') ||
    pathname === '/sign-in' ||
    pathname === '/signin' ||
    pathname === '/create-account';

  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/sign-in" element={<AdminPanel />} />
        <Route path="/signin" element={<AdminPanel />} />
        <Route path="/create-account" element={<AdminPanel />} />
        <Route path="/admin/*" element={<AdminPanel />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0C] text-[#F5F5F0]">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop mode="all" />} />
          <Route path="/shirts" element={<Shop presetCategory="Shirts" />} />
          <Route path="/pants" element={<Shop presetCategory="Pants" />} />
          <Route path="/shoes" element={<Shop presetCategory="Shoes" />} />
          <Route path="/watches" element={<Shop presetCategory="Watches" />} />
          <Route path="/perfumes" element={<Shop presetCategory="Perfumes" />} />
          <Route path="/new-arrivals" element={<Shop mode="new-arrivals" />} />
          <Route path="/sale" element={<Shop mode="sale" />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/account" element={<CustomerAccount section="account" />} />
          <Route path="/account/orders" element={<CustomerAccount section="orders" />} />
          <Route path="/account/settings" element={<CustomerAccount section="settings" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <QuickViewModal />
      <SearchModal />
      <FloatingActions />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <ScrollToTopAndSEO />
        <AppShell />
      </StoreProvider>
    </BrowserRouter>
  );
}


