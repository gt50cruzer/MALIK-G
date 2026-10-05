import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Package, Heart, Settings, LogOut, ArrowLeft } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface CustomerAccountProps {
  section: 'account' | 'orders' | 'settings';
}

export const CustomerAccount: React.FC<CustomerAccountProps> = ({ section }) => {
  const navigate = useNavigate();
  const { customerUser, logoutCustomer, showToast } = useStore();

  useEffect(() => {
    if (!customerUser) {
      navigate('/sign-in', { replace: true });
    }
  }, [customerUser, navigate]);

  if (!customerUser) {
    return null;
  }

  const firstNameTrimmed = customerUser.fullName.trim();
  const initial = firstNameTrimmed
    ? firstNameTrimmed.charAt(0).toUpperCase()
    : customerUser.email.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await logoutCustomer();
    showToast('Signed out successfully.', 'info');
    navigate('/', { replace: true });
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#D4AF37] text-[#0B0B0C] font-display text-xl font-bold flex items-center justify-center shrink-0">
              {initial}
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5F0]">
                {customerUser.fullName}
              </h1>
              <p className="text-xs text-[#A1A1AA]">{customerUser.email}</p>
            </div>
          </div>

          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#D4AF37] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </Link>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
          <Link
            to="/account"
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              section === 'account'
                ? 'bg-[#D4AF37] text-[#0B0B0C]'
                : 'bg-[#121214] border border-white/10 text-[#A1A1AA] hover:text-[#F5F5F0]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Account</span>
          </Link>
          <Link
            to="/account/orders"
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              section === 'orders'
                ? 'bg-[#D4AF37] text-[#0B0B0C]'
                : 'bg-[#121214] border border-white/10 text-[#A1A1AA] hover:text-[#F5F5F0]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Order History</span>
          </Link>
          <Link
            to="/wishlist"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#121214] border border-white/10 text-[#A1A1AA] hover:text-[#F5F5F0] transition-colors"
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Wishlist</span>
          </Link>
          <Link
            to="/account/settings"
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              section === 'settings'
                ? 'bg-[#D4AF37] text-[#0B0B0C]'
                : 'bg-[#121214] border border-white/10 text-[#A1A1AA] hover:text-[#F5F5F0]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </Link>
        </div>

        {section === 'account' && (
          <div className="bg-[#121214] border border-white/10 p-6 sm:p-8 space-y-6">
            <h2 className="font-display text-xl font-bold text-[#F5F5F0]">
              Profile Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
                  Full Name
                </span>
                <p className="font-medium text-[#F5F5F0]">{customerUser.fullName}</p>
              </div>
              <div className="space-y-1">
                <span className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
                  Email Address
                </span>
                <p className="font-mono-num text-[#F5F5F0]">{customerUser.email}</p>
              </div>
            </div>
          </div>
        )}

        {section === 'orders' && (
          <div className="bg-[#121214] border border-white/10 p-8 text-center space-y-3">
            <Package className="w-8 h-8 text-[#D4AF37] mx-auto" />
            <h2 className="font-display text-xl font-bold text-[#F5F5F0]">
              Order History
            </h2>
            <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
              No orders linked to this customer account yet.
            </p>
            <div className="pt-2">
              <Link
                to="/shop"
                className="inline-block px-6 py-3 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider"
              >
                Explore Collection
              </Link>
            </div>
          </div>
        )}

        {section === 'settings' && (
          <div className="bg-[#121214] border border-white/10 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-[#F5F5F0]">
                Account Settings
              </h2>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Signed in as {customerUser.email}.
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-[#A1A1AA]">
                End your current customer session on this device.
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-300 hover:bg-red-500/20 uppercase tracking-wider transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
