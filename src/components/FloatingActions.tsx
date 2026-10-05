import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BRAND_INFO } from '../data/products';

export const FloatingActions: React.FC = () => {
  const { toasts, removeToast } = useStore();

  const whatsappHref = `${BRAND_INFO.whatsappUrl}?text=${encodeURIComponent(
    'Hello Malik G Collection, I would like to know more about your products.'
  )}`;

  return (
    <>
      {/* Toast Notifications Stack */}
      <div
        className="fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className="pointer-events-auto cursor-pointer bg-[#121214] border-l-4 border-[#D4AF37] border-t border-r border-b border-white/15 px-4 py-3 shadow-2xl flex items-center justify-between gap-3 transition-all duration-200"
          >
            <p className="text-xs sm:text-sm font-medium text-[#F5F5F0]">{toast.message}</p>
            <span className="text-[10px] uppercase tracking-wider text-[#D4AF37] shrink-0">
              Dismiss
            </span>
          </div>
        ))}
      </div>

      {/* Floating Mobile Call Button (Bottom Left on Mobile) */}
      <a
        href={`tel:${BRAND_INFO.phoneRaw}`}
        className="md:hidden fixed bottom-5 left-4 z-40 inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#121214] border border-[#D4AF37]/60 text-[#F5F5F0] shadow-xl text-xs font-semibold uppercase tracking-wider"
        aria-label="Call Malik G Collection"
      >
        <Phone className="w-4 h-4 text-[#D4AF37]" />
        <span>Call Now</span>
      </a>

      {/* Floating WhatsApp Concierge Button (Bottom Right on all pages) */}
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-4 sm:right-6 z-40 inline-flex items-center gap-2.5 px-4 py-3 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] shadow-2xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-transform duration-200 hover:-translate-y-0.5"
        aria-label="Chat with Malik G Collection on WhatsApp"
      >
        <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
        <span>WhatsApp</span>
      </a>
    </>
  );
};
