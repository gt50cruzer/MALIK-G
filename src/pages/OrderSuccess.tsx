import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, MessageCircle, ShoppingBag, Phone } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPKR } from '../data/products';

export const OrderSuccess: React.FC = () => {
  const { lastOrder, buildOrderWhatsAppUrl } = useStore();

  if (!lastOrder) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-6">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#F5F5F0]">
          No Recent Order Found
        </h1>
        <p className="text-sm text-[#A1A1AA]">
          Explore our collection to place a new order.
        </p>
        <Link
          to="/shop"
          className="inline-block px-8 py-4 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider"
        >
          CONTINUE SHOPPING
        </Link>
      </div>
    );
  }

  const whatsappOrderUrl = buildOrderWhatsAppUrl(lastOrder);
  const snapshots =
    lastOrder.orderItems && lastOrder.orderItems.length > 0
      ? lastOrder.orderItems
      : lastOrder.items.map((item) => ({
          productId: item.product.id,
          productNameSnapshot: item.product.name,
          productImageSnapshot: item.product.image,
          selectedColor: item.selectedColor || 'Standard',
          selectedSize: item.selectedSize || 'N/A',
          quantity: item.quantity,
          unitPrice: item.product.price,
          originalPriceSnapshot: item.product.oldPrice || item.product.price,
          subtotal: item.product.price * item.quantity,
        }));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <div className="bg-[#121214] border border-white/15 p-6 sm:p-10 space-y-8 shadow-2xl">
        {/* Top Confirmation Header */}
        <div className="text-center space-y-3 border-b border-white/10 pb-8">
          <div className="w-16 h-16 mx-auto bg-[#D4AF37]/15 border border-[#D4AF37] flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#F5F5F0] tracking-wide">
            ORDER PLACED SUCCESSFULLY!
          </h1>
          <p className="text-sm sm:text-base text-[#A1A1AA]">
            Thank you for shopping with Malik G Collection. Your order has been saved in our system.
          </p>
        </div>

        {/* Order Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#18181B] border border-white/10 p-5 text-sm">
          <div>
            <span className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
              Order ID
            </span>
            <span className="font-mono-num text-base font-bold text-[#D4AF37]">
              {lastOrder.orderNumber}
            </span>
          </div>

          <div>
            <span className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
              Order Status
            </span>
            <span className="font-semibold text-[#F5F5F0]">
              {lastOrder.status || 'Pending'}
            </span>
          </div>

          <div>
            <span className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
              Customer Name
            </span>
            <span className="font-semibold text-[#F5F5F0]">
              {lastOrder.customer.fullName}
            </span>
          </div>

          <div>
            <span className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
              Phone
            </span>
            <span className="font-mono-num font-semibold text-[#F5F5F0]">
              {lastOrder.customer.phone}
            </span>
          </div>

          <div>
            <span className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
              Email
            </span>
            <span className="text-[#F5F5F0]">{lastOrder.customer.email}</span>
          </div>

          <div>
            <span className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
              Location / City
            </span>
            <span className="text-[#F5F5F0]">{lastOrder.customer.city}</span>
          </div>

          <div className="sm:col-span-2">
            <span className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
              Full Address
            </span>
            <span className="text-[#F5F5F0]">{lastOrder.customer.address}</span>
          </div>
        </div>

        {/* Ordered Items List */}
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-[#F5F5F0]">
            Ordered Items
          </h2>
          <div className="divide-y divide-white/10 border-t border-b border-white/10">
            {snapshots.map((item, idx) => (
              <div
                key={`${item.productId}-${idx}`}
                className="py-3.5 flex items-center justify-between gap-4 text-sm"
              >
                <div>
                  <span className="font-semibold text-[#F5F5F0]">
                    {item.productNameSnapshot}
                  </span>
                  <span className="block text-xs text-[#A1A1AA]">
                    Color: {item.selectedColor} · Size: {item.selectedSize} · Qty: {item.quantity}
                  </span>
                </div>
                <span className="font-mono-num font-semibold text-[#F5F5F0]">
                  {formatPKR(item.subtotal)}
                </span>
              </div>
            ))}
          </div>

          {/* Total Calculation */}
          <div className="space-y-2 pt-2 text-sm">
            <div className="flex justify-between text-base font-bold pt-2">
              <span className="text-[#F5F5F0]">Total Amount</span>
              <span className="font-mono-num text-xl text-[#D4AF37]">
                {formatPKR(lastOrder.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href={whatsappOrderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 px-4 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider text-center transition-colors"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>SEND ON WHATSAPP</span>
          </a>

          <Link
            to="/shop"
            className="flex items-center justify-center gap-2 py-3.5 px-4 border border-white/20 hover:border-[#D4AF37] text-[#F5F5F0] hover:text-[#D4AF37] text-xs font-bold uppercase tracking-wider text-center transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>CONTINUE SHOPPING</span>
          </Link>

          <Link
            to="/contact"
            className="flex items-center justify-center gap-2 py-3.5 px-4 border border-white/20 hover:border-[#D4AF37] text-[#F5F5F0] hover:text-[#D4AF37] text-xs font-semibold uppercase tracking-wider text-center transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span>CONTACT US</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
