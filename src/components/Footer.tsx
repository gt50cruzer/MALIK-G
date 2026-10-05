import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MessageCircle, MapPin, X } from 'lucide-react';
import { BRAND_INFO } from '../data/products';

type PolicyModalType = 'shipping' | 'returns' | 'size-guide' | null;

export const Footer: React.FC = () => {
  const [activeModal, setActiveModal] = useState<PolicyModalType>(null);

  return (
    <>
      <footer className="bg-[#0B0B0C] border-t border-white/10 text-[#A1A1AA] pt-16 pb-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 pb-12 border-b border-white/10">
            {/* Column 1: Brand Identity */}
            <div className="space-y-4">
              <Link
                to="/"
                className="inline-block font-display text-2xl font-bold tracking-[0.12em] text-[#D4AF37]"
              >
                MALIK G COLLECTION
              </Link>
              <p className="text-sm text-[#A1A1AA] leading-relaxed max-w-xs">
                Fashion, footwear, fragrances and accessories for modern style.
              </p>
              <div className="pt-2 flex items-center gap-3">
                <a
                  href={`tel:${BRAND_INFO.phoneRaw}`}
                  className="inline-flex items-center justify-center w-10 h-10 border border-white/15 text-[#F5F5F0] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors"
                  aria-label="Call Malik G Collection"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href={BRAND_INFO.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-10 h-10 border border-white/15 text-[#F5F5F0] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors"
                  aria-label="WhatsApp Malik G Collection"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h3 className="font-display text-lg font-semibold tracking-wider text-[#F5F5F0] uppercase mb-4">
                Quick Links
              </h3>
              <ul className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm">
                <li>
                  <Link to="/" className="hover:text-[#D4AF37] transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/shop" className="hover:text-[#D4AF37] transition-colors">
                    Shop
                  </Link>
                </li>
                <li>
                  <Link to="/shirts" className="hover:text-[#D4AF37] transition-colors">
                    Shirts
                  </Link>
                </li>
                <li>
                  <Link to="/pants" className="hover:text-[#D4AF37] transition-colors">
                    Pants
                  </Link>
                </li>
                <li>
                  <Link to="/shoes" className="hover:text-[#D4AF37] transition-colors">
                    Shoes
                  </Link>
                </li>
                <li>
                  <Link to="/watches" className="hover:text-[#D4AF37] transition-colors">
                    Watches
                  </Link>
                </li>
                <li>
                  <Link to="/perfumes" className="hover:text-[#D4AF37] transition-colors">
                    Perfumes
                  </Link>
                </li>
                <li>
                  <Link to="/new-arrivals" className="hover:text-[#D4AF37] transition-colors">
                    New Arrivals
                  </Link>
                </li>
                <li>
                  <Link to="/sale" className="text-[#D4AF37] hover:underline transition-colors">
                    Sale
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Customer Service */}
            <div>
              <h3 className="font-display text-lg font-semibold tracking-wider text-[#F5F5F0] uppercase mb-4">
                Customer Service
              </h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/contact" className="hover:text-[#D4AF37] transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-[#D4AF37] transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveModal('shipping')}
                    className="hover:text-[#D4AF37] transition-colors text-left"
                  >
                    Shipping
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveModal('returns')}
                    className="hover:text-[#D4AF37] transition-colors text-left"
                  >
                    Returns
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveModal('size-guide')}
                    className="hover:text-[#D4AF37] transition-colors text-left"
                  >
                    Size Guide
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Store Contact */}
            <div>
              <h3 className="font-display text-lg font-semibold tracking-wider text-[#F5F5F0] uppercase mb-4">
                Contact
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#D4AF37] shrink-0 mt-1" />
                  <div>
                    <span className="block text-xs text-[#A1A1AA]">Phone &amp; Orders</span>
                    <a
                      href={`tel:${BRAND_INFO.phoneRaw}`}
                      className="text-[#F5F5F0] hover:text-[#D4AF37] font-mono-num transition-colors"
                    >
                      {BRAND_INFO.phoneDisplay}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <MessageCircle className="w-4 h-4 text-[#D4AF37] shrink-0 mt-1" />
                  <div>
                    <span className="block text-xs text-[#A1A1AA]">WhatsApp Concierge</span>
                    <a
                      href={BRAND_INFO.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#F5F5F0] hover:text-[#D4AF37] font-mono-num transition-colors"
                    >
                      {BRAND_INFO.whatsappDisplay}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-1" />
                  <div>
                    <span className="block text-xs text-[#A1A1AA]">Store Location</span>
                    <span className="text-[#F5F5F0]">{BRAND_INFO.shortLocation}</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A1A1AA]">
            <p>© 2026 Malik G Collection. All Rights Reserved.</p>
            <p>Sialkot, Punjab, Pakistan · Direct WhatsApp Ordering</p>
          </div>
        </div>
      </footer>

      {/* Customer Service Information Modal (Shipping / Returns / Size Guide) */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-[#121214] border border-white/15 max-w-lg w-full p-6 sm:p-8 text-[#F5F5F0] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 text-[#A1A1AA] hover:text-[#F5F5F0]"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {activeModal === 'shipping' && (
              <div className="space-y-4">
                <h3 className="font-display text-2xl font-bold text-[#D4AF37]">
                  Shipping &amp; Dispatch Information
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  We dispatch orders daily from our Sialkot store across all cities in Pakistan via reliable courier partners.
                </p>
                <ul className="space-y-2 text-sm text-[#F5F5F0] border-t border-white/10 pt-4">
                  <li>· <strong>Order Confirmation:</strong> Every order is confirmed directly via WhatsApp with your unique Order ID (<span className="font-mono-num">MGC-XXXXXX</span>).</li>
                  <li>· <strong>Estimated Delivery Time:</strong> 2 to 4 working days across Pakistan.</li>
                  <li>· <strong>Sialkot Local Dispatch:</strong> Fast local coordination available via WhatsApp at <span className="font-mono-num">0321 7126828</span>.</li>
                </ul>
              </div>
            )}

            {activeModal === 'returns' && (
              <div className="space-y-4">
                <h3 className="font-display text-2xl font-bold text-[#D4AF37]">
                  Returns &amp; Exchange Policy
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Your satisfaction is our priority at Malik G Collection. If a size does not fit as expected, we offer hassle-free size exchanges within 7 days of delivery.
                </p>
                <ul className="space-y-2 text-sm text-[#F5F5F0] border-t border-white/10 pt-4">
                  <li>· Items must be unused, unwashed, and in original packaging with tags attached.</li>
                  <li>· Perfumes must remain sealed in their original cellophane box for exchange.</li>
                  <li>· Contact us on WhatsApp at <span className="font-mono-num">0321 7126828</span> with your Order ID to initiate an exchange.</li>
                </ul>
              </div>
            )}

            {activeModal === 'size-guide' && (
              <div className="space-y-4">
                <h3 className="font-display text-2xl font-bold text-[#D4AF37]">
                  Malik G Collection Size Guide
                </h3>
                <div className="space-y-4 text-xs sm:text-sm">
                  <div>
                    <h4 className="font-semibold text-[#F5F5F0] mb-2">Men&apos;s Shirts (Chest in Inches)</h4>
                    <div className="grid grid-cols-5 border border-white/10 text-center font-mono-num">
                      <div className="p-2 bg-white/5 font-semibold">S</div>
                      <div className="p-2 bg-white/5 font-semibold">M</div>
                      <div className="p-2 bg-white/5 font-semibold">L</div>
                      <div className="p-2 bg-white/5 font-semibold">XL</div>
                      <div className="p-2 bg-white/5 font-semibold">XXL</div>
                      <div className="p-2 border-t border-white/10">38&quot;</div>
                      <div className="p-2 border-t border-white/10">40&quot;</div>
                      <div className="p-2 border-t border-white/10">42&quot;</div>
                      <div className="p-2 border-t border-white/10">44&quot;</div>
                      <div className="p-2 border-t border-white/10">46&quot;</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#F5F5F0] mb-2">Men&apos;s Footwear (EU to UK)</h4>
                    <div className="grid grid-cols-6 border border-white/10 text-center font-mono-num">
                      <div className="p-2 bg-white/5">EU 39</div>
                      <div className="p-2 bg-white/5">EU 40</div>
                      <div className="p-2 bg-white/5">EU 41</div>
                      <div className="p-2 bg-white/5">EU 42</div>
                      <div className="p-2 bg-white/5">EU 43</div>
                      <div className="p-2 bg-white/5">EU 44</div>
                      <div className="p-2 border-t border-white/10">UK 6</div>
                      <div className="p-2 border-t border-white/10">UK 7</div>
                      <div className="p-2 border-t border-white/10">UK 8</div>
                      <div className="p-2 border-t border-white/10">UK 9</div>
                      <div className="p-2 border-t border-white/10">UK 10</div>
                      <div className="p-2 border-t border-white/10">UK 11</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 bg-[#D4AF37] text-[#0B0B0C] text-xs font-semibold uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
