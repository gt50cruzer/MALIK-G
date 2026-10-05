import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Heart,
  ShoppingBag,
  Menu,
  X,
  ChevronDown,
  User,
  Package,
  Settings,
  LogOut,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BRAND_INFO } from '../data/products';

const PRIMARY_NAV = [
  { label: 'Home', path: '/' },
  { label: 'Shop', path: '/shop' },
  { label: 'Shirts', path: '/shirts' },
  { label: 'Pants', path: '/pants' },
  { label: 'Shoes', path: '/shoes' },
  { label: 'Watches', path: '/watches' },
  { label: 'Perfumes', path: '/perfumes' },
];

const MORE_NAV = [
  { label: 'New Arrivals', path: '/new-arrivals' },
  { label: 'Sale', path: '/sale' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

function getCustomerAvatarInitial(fullName: string, email: string): string {
  const trimmedName = fullName.trim();
  if (trimmedName.length > 0) {
    const firstWord = trimmedName.split(/\s+/)[0];
    return firstWord.charAt(0).toUpperCase();
  }
  const trimmedEmail = email.trim();
  if (trimmedEmail.length > 0) {
    return trimmedEmail.charAt(0).toUpperCase();
  }
  return 'M';
}

export const Header: React.FC = () => {
  const {
    cartCount,
    wishlist,
    setSearchOpen,
    customerUser,
    logoutCustomer,
    showToast,
  } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  // Close profile dropdown on outside click or Escape key
  useEffect(() => {
    if (!profileDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileDropdownOpen]);

  const handleCustomerLogout = async () => {
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
    await logoutCustomer();
    showToast('Signed out successfully.', 'info');
    navigate('/');
  };

  const avatarInitial = customerUser
    ? getCustomerAvatarInitial(customerUser.fullName, customerUser.email)
    : '';

  return (
    <div className="sticky top-0 z-40 w-full bg-[#0B0B0C]/95 backdrop-blur-md border-b border-white/10">
      {/* Slim Top Announcement Bar */}
      <div className="bg-[#121214] border-b border-white/5 text-xs text-[#A1A1AA] py-2 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <p className="tracking-wider uppercase font-medium text-[#F5F5F0] text-[11px] sm:text-xs">
            MALIK G COLLECTION · SIALKOT, PAKISTAN · 20% OFF ALL PRODUCTS
          </p>
          <div className="flex items-center gap-4 text-[11px] sm:text-xs">
            <a
              href={BRAND_INFO.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#D4AF37] transition-colors font-mono-num whitespace-nowrap"
            >
              WhatsApp Orders: {BRAND_INFO.phoneDisplay}
            </a>
          </div>
        </div>
      </div>

      {/* Main 3-Zone Header Contract */}
      <header className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Title (Single text element wordmark + mobile menu button) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden p-2 -ml-2 text-[#F5F5F0] hover:text-[#D4AF37] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link
            to="/"
            className="font-display text-xl sm:text-2xl font-bold tracking-[0.12em] text-[#D4AF37] whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]"
          >
            MALIK G COLLECTION
          </Link>
        </div>

        {/* Zone 2: Clean Typography Navigation Links */}
        <nav
          className="hidden lg:flex items-center gap-6 xl:gap-7 text-sm font-medium text-[#A1A1AA]"
          aria-label="Main Navigation"
        >
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                  isActive
                    ? 'text-[#F5F5F0] border-[#D4AF37]'
                    : 'text-[#A1A1AA] border-transparent hover:text-[#F5F5F0]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}

          {/* On 2xl screens show all links inline; on lg/xl group remaining links into More */}
          <div className="hidden 2xl:flex items-center gap-7">
            {MORE_NAV.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                    isActive
                      ? 'text-[#F5F5F0] border-[#D4AF37]'
                      : item.label === 'Sale'
                      ? 'text-[#D4AF37] border-transparent hover:text-[#F5F5F0]'
                      : 'text-[#A1A1AA] border-transparent hover:text-[#F5F5F0]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div
            className="relative 2xl:hidden"
            onMouseEnter={() => {
              setMoreDropdownOpen(true);
              setProfileDropdownOpen(false);
            }}
            onMouseLeave={() => setMoreDropdownOpen(false)}
          >
            <button
              type="button"
              onClick={() => {
                setMoreDropdownOpen((prev) => !prev);
                setProfileDropdownOpen(false);
              }}
              className="flex items-center gap-1 py-1 text-[#A1A1AA] hover:text-[#F5F5F0] transition-colors whitespace-nowrap shrink-0"
              aria-expanded={moreDropdownOpen}
            >
              <span>Explore</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {moreDropdownOpen && (
              <div className="absolute right-0 top-full pt-2 w-48 z-50">
                <div className="bg-[#121214] border border-white/10 shadow-2xl py-2">
                  {MORE_NAV.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `block px-4 py-2.5 text-sm transition-colors ${
                          isActive
                            ? 'text-[#D4AF37] bg-white/5'
                            : 'text-[#F5F5F0] hover:bg-white/5 hover:text-[#D4AF37]'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: Primary Actions (Search, Wishlist, Sign In / Customer Avatar, Cart) */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="p-2 text-[#F5F5F0] hover:text-[#D4AF37] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]"
            aria-label="Search products"
          >
            <Search className="w-5 h-5 stroke-[1.75]" />
          </button>

          <Link
            to="/wishlist"
            className="relative p-2 text-[#F5F5F0] hover:text-[#D4AF37] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]"
            aria-label={`Wishlist (${wishlist.length} items)`}
          >
            <Heart className="w-5 h-5 stroke-[1.75]" />
            {wishlist.length > 0 && <span className="sr-only">({wishlist.length})</span>}
          </Link>

          {customerUser ? (
            <div className="relative" ref={profileDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setProfileDropdownOpen((prev) => !prev);
                  setMoreDropdownOpen(false);
                }}
                className="w-9 h-9 rounded-full bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] font-bold text-sm flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-sm ring-1 ring-[#D4AF37]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={`Account menu for ${customerUser.fullName}`}
                aria-expanded={profileDropdownOpen}
                aria-haspopup="menu"
              >
                {avatarInitial}
              </button>

              {profileDropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2.5 w-64 max-w-[calc(100vw-2rem)] bg-[#121214] border border-white/15 shadow-2xl z-50 divide-y divide-white/10"
                >
                  {/* Customer Identity Header */}
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#D4AF37] text-[#0B0B0C] font-bold text-sm flex items-center justify-center shrink-0">
                      {avatarInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#F5F5F0] truncate">
                        {customerUser.fullName}
                      </p>
                      <p className="text-xs text-[#A1A1AA] truncate">
                        {customerUser.email}
                      </p>
                    </div>
                  </div>

                  {/* Dropdown Navigation Items */}
                  <div className="py-1.5">
                    <Link
                      to="/account"
                      role="menuitem"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-[#F5F5F0] hover:bg-white/5 hover:text-[#D4AF37] transition-colors"
                    >
                      <User className="w-4 h-4 text-[#D4AF37] shrink-0" />
                      <span>My Account</span>
                    </Link>

                    <Link
                      to="/account/orders"
                      role="menuitem"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-[#F5F5F0] hover:bg-white/5 hover:text-[#D4AF37] transition-colors"
                    >
                      <Package className="w-4 h-4 text-[#D4AF37] shrink-0" />
                      <span>Order History</span>
                    </Link>

                    <Link
                      to="/wishlist"
                      role="menuitem"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-[#F5F5F0] hover:bg-white/5 hover:text-[#D4AF37] transition-colors"
                    >
                      <Heart className="w-4 h-4 text-[#D4AF37] shrink-0" />
                      <span>Wishlist</span>
                    </Link>

                    <Link
                      to="/account/settings"
                      role="menuitem"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-[#F5F5F0] hover:bg-white/5 hover:text-[#D4AF37] transition-colors"
                    >
                      <Settings className="w-4 h-4 text-[#D4AF37] shrink-0" />
                      <span>Settings</span>
                    </Link>
                  </div>

                  {/* Logout Action */}
                  <div className="py-1.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleCustomerLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/sign-in"
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider text-[#A1A1AA] hover:text-[#D4AF37] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]"
              aria-label="Sign In"
            >
              Sign In
            </Link>
          )}

          <Link
            to="/cart"
            className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium text-[#0B0B0C] bg-[#D4AF37] hover:bg-[#e3be42] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={`Shopping Cart with ${cartCount} items`}
          >
            <ShoppingBag className="w-4 h-4 stroke-[2]" />
            <span className="font-mono-num font-semibold">Cart ({cartCount})</span>
          </Link>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#121214] border-b border-white/10 px-4 pt-3 pb-6 space-y-1">
          {[...PRIMARY_NAV, ...MORE_NAV].map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `block py-2.5 px-3 text-base font-medium transition-colors border-l-2 ${
                  isActive
                    ? 'border-[#D4AF37] text-[#D4AF37] bg-white/5'
                    : 'border-transparent text-[#F5F5F0] hover:bg-white/5 hover:text-[#D4AF37]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <div className="pt-4 mt-4 border-t border-white/10 flex flex-col gap-2 text-xs text-[#A1A1AA] px-3">
            {!customerUser && (
              <Link
                to="/sign-in"
                className="inline-flex items-center justify-between py-2 text-sm font-medium text-[#F5F5F0] hover:text-[#D4AF37] transition-colors border-b border-white/5 mb-1"
              >
                <span>Sign In</span>
              </Link>
            )}
            <span>Location: {BRAND_INFO.location}</span>
            <a
              href={`tel:${BRAND_INFO.phoneRaw}`}
              className="text-[#D4AF37] font-mono-num py-1"
            >
              Call: {BRAND_INFO.phoneDisplay}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
