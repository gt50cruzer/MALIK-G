import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPKR } from '../data/products';
import { SafeImage } from '../components/SafeImage';

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const {
    cart,
    cartSubtotal,
    cartDiscountTotal,
    deliveryFee,
    grandTotal,
    placeOrder,
    savedCustomer,
  } = useStore();

  const [fullName, setFullName] = useState(savedCustomer?.fullName || '');
  const [phone, setPhone] = useState(savedCustomer?.phone || '');
  const [email, setEmail] = useState(savedCustomer?.email || '');
  const [city, setCity] = useState(savedCustomer?.city || 'Sialkot');
  const [address, setAddress] = useState(savedCustomer?.address || '');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash on Delivery' | 'Bank Transfer / WhatsApp'
  >('Cash on Delivery');

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (cart.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-6">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#F5F5F0]">
          Your shopping bag is empty.
        </h1>
        <p className="text-sm text-[#A1A1AA] max-w-md mx-auto">
          Please add items to your cart before proceeding to checkout.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider"
        >
          <span>START SHOPPING</span>
        </Link>
      </div>
    );
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.fullName = 'Please enter your full name.';
    }

    const cleanedPhone = phone.replace(/[\s-]/g, '');
    const pkPhoneRegex = /^(\+92|0092|92|0)?3[0-9]{9}$/;
    if (!cleanedPhone) {
      newErrors.phone = 'Phone number is required.';
    } else if (!pkPhoneRegex.test(cleanedPhone)) {
      newErrors.phone =
        'Please enter a valid Pakistani mobile number (e.g. 03217126828 or +923217126828).';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!city.trim()) {
      newErrors.city = 'City is required.';
    }

    if (!address.trim() || address.trim().length < 8) {
      newErrors.address = 'Please provide your complete street and house delivery address.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    placeOrder(
      {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        city: city.trim(),
        address: address.trim(),
        notes: notes.trim() || undefined,
      },
      paymentMethod
    );

    navigate('/order-success');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="border-b border-white/10 pb-6 mb-10 flex items-center justify-between">
        <div>
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#D4AF37] uppercase tracking-wider mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Shopping Bag</span>
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#F5F5F0]">
            Checkout
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-[#A1A1AA]">
          <Lock className="w-4 h-4 text-[#D4AF37]" />
          <span>Secure Checkout · Malik G Collection</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Customer Details & Payment Method */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-[#121214] border border-white/10 p-6 sm:p-8 space-y-6">
            <h2 className="font-display text-2xl font-bold text-[#F5F5F0] border-b border-white/10 pb-3">
              1. Customer &amp; Delivery Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="sm:col-span-1 space-y-1.5">
                <label
                  htmlFor="checkout-name"
                  className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                >
                  Full Name <span className="text-[#D4AF37]">*</span>
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors({ ...errors, fullName: '' });
                  }}
                  placeholder="e.g. Muhammad Usman"
                  className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
                />
                {errors.fullName && (
                  <p className="text-xs text-red-400">{errors.fullName}</p>
                )}
              </div>

              {/* Phone Number */}
              <div className="sm:col-span-1 space-y-1.5">
                <label
                  htmlFor="checkout-phone"
                  className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                >
                  Phone Number <span className="text-[#D4AF37]">*</span>
                </label>
                <input
                  id="checkout-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors({ ...errors, phone: '' });
                  }}
                  placeholder="03217126828 or +923217126828"
                  className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm font-mono-num text-[#F5F5F0] focus:outline-none"
                />
                {errors.phone && (
                  <p className="text-xs text-red-400">{errors.phone}</p>
                )}
              </div>

              {/* Email */}
              <div className="sm:col-span-1 space-y-1.5">
                <label
                  htmlFor="checkout-email"
                  className="block text-xs uppercase tracking-wider text-[#A1A1AA]"
                >
                  Email (Optional)
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  placeholder="you@example.com"
                  className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
                />
                {errors.email && (
                  <p className="text-xs text-red-400">{errors.email}</p>
                )}
              </div>

              {/* City */}
              <div className="sm:col-span-1 space-y-1.5">
                <label
                  htmlFor="checkout-city"
                  className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                >
                  City <span className="text-[#D4AF37]">*</span>
                </label>
                <input
                  id="checkout-city"
                  type="text"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    if (errors.city) setErrors({ ...errors, city: '' });
                  }}
                  placeholder="Sialkot, Lahore, Islamabad, Karachi..."
                  className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
                />
                {errors.city && (
                  <p className="text-xs text-red-400">{errors.city}</p>
                )}
              </div>

              {/* Complete Address */}
              <div className="sm:col-span-2 space-y-1.5">
                <label
                  htmlFor="checkout-address"
                  className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                >
                  Complete Address <span className="text-[#D4AF37]">*</span>
                </label>
                <textarea
                  id="checkout-address"
                  rows={3}
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (errors.address) setErrors({ ...errors, address: '' });
                  }}
                  placeholder="House #, Street, Area / Sector, Nearest Landmark..."
                  className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
                />
                {errors.address && (
                  <p className="text-xs text-red-400">{errors.address}</p>
                )}
              </div>

              {/* Order Notes */}
              <div className="sm:col-span-2 space-y-1.5">
                <label
                  htmlFor="checkout-notes"
                  className="block text-xs uppercase tracking-wider text-[#A1A1AA]"
                >
                  Order Notes (Optional)
                </label>
                <textarea
                  id="checkout-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special delivery instructions, gift packaging requests..."
                  className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-[#F5F5F0] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="bg-[#121214] border border-white/10 p-6 sm:p-8 space-y-5">
            <h2 className="font-display text-2xl font-bold text-[#F5F5F0] border-b border-white/10 pb-3">
              2. Payment Method
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('Cash on Delivery')}
                className={`p-4 border text-left transition-colors flex flex-col justify-between gap-2 ${
                  paymentMethod === 'Cash on Delivery'
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                    : 'border-white/15 bg-[#18181B] hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#F5F5F0]">
                    Cash on Delivery
                  </span>
                  {paymentMethod === 'Cash on Delivery' && (
                    <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                  )}
                </div>
                <p className="text-xs text-[#A1A1AA]">
                  Pay in cash at your doorstep when you receive your parcel.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Bank Transfer / WhatsApp')}
                className={`p-4 border text-left transition-colors flex flex-col justify-between gap-2 ${
                  paymentMethod === 'Bank Transfer / WhatsApp'
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                    : 'border-white/15 bg-[#18181B] hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#F5F5F0]">
                    Bank Transfer / WhatsApp
                  </span>
                  {paymentMethod === 'Bank Transfer / WhatsApp' && (
                    <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                  )}
                </div>
                <p className="text-xs text-[#A1A1AA]">
                  Coordinate direct bank transfer or JazzCash/EasyPaisa via WhatsApp (0321 7126828).
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-5">
          <div className="bg-[#121214] border border-white/10 p-6 sm:p-8 space-y-6 sticky top-28">
            <h2 className="font-display text-2xl font-bold text-[#F5F5F0] border-b border-white/10 pb-4">
              Order Summary ({cart.reduce((s, i) => s + i.quantity, 0)} Items)
            </h2>

            {/* Itemized List */}
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={`${item.product.id}-${item.selectedSize || 'def'}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-14 bg-[#18181B] shrink-0 overflow-hidden border border-white/10">
                      <SafeImage
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-[#F5F5F0] truncate">
                        {item.product.name}
                      </p>
                      <p className="text-[11px] text-[#A1A1AA]">
                        Qty: {item.quantity}
                        {item.selectedSize ? ` · Size: ${item.selectedSize}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono-num text-xs sm:text-sm font-semibold text-[#F5F5F0] shrink-0">
                    {formatPKR(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-3 pt-4 border-t border-white/10 text-sm">
              <div className="flex items-center justify-between text-[#A1A1AA]">
                <span>Subtotal</span>
                <span className="font-mono-num text-[#F5F5F0] font-semibold">
                  {formatPKR(cartSubtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[#A1A1AA]">
                <span>Discount</span>
                <span className="font-mono-num text-[#D4AF37]">
                  {cartDiscountTotal > 0 ? `-${formatPKR(cartDiscountTotal)}` : 'Rs. 0'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[#A1A1AA]">
                <span>Delivery</span>
                <span className="font-mono-num text-[#F5F5F0] font-semibold">
                  {deliveryFee === 0 ? (
                    <span className="text-[#D4AF37]">FREE DELIVERY</span>
                  ) : (
                    formatPKR(deliveryFee)
                  )}
                </span>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-baseline justify-between">
                <span className="text-base font-bold text-[#F5F5F0] uppercase tracking-wider">
                  Total
                </span>
                <span className="font-mono-num text-2xl font-bold text-[#D4AF37]">
                  {formatPKR(grandTotal)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 px-6 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] text-xs sm:text-sm font-bold uppercase tracking-[0.15em] transition-colors"
            >
              PLACE ORDER
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-[#A1A1AA] pt-1">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span>Dispatched from Malik G Collection, Sialkot</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
