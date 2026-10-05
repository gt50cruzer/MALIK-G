import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPKR } from '../data/products';
import { SafeImage } from '../components/SafeImage';

export const Cart: React.FC = () => {
  const {
    cart,
    updateCartQuantity,
    removeFromCart,
    cartSubtotal,
    cartDiscountTotal,
    grandTotal,
  } = useStore();

  if (cart.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-6">
        <div className="w-16 h-16 mx-auto bg-[#121214] border border-white/10 flex items-center justify-center">
          <ShoppingBag className="w-7 h-7 text-[#D4AF37]" />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#F5F5F0]">
          Your shopping bag is empty.
        </h1>
        <p className="text-sm text-[#A1A1AA] max-w-md mx-auto">
          Explore our latest collection of men&apos;s shirts, trousers, handcrafted footwear, luxury watches, and perfumes.
        </p>
        <div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] text-xs sm:text-sm font-bold uppercase tracking-[0.15em] transition-colors"
          >
            <span>START SHOPPING</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] mb-1">
            Malik G Collection
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#F5F5F0]">
            Shopping Bag
          </h1>
        </div>
        <Link
          to="/shop"
          className="text-xs font-semibold uppercase tracking-wider text-[#D4AF37] hover:underline"
        >
          Continue Shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left: Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          {cart.map((item) => {
            const itemKey = `${item.product.id}-${item.selectedSize || 'default'}-${item.selectedColor || 'default'}`;
            const lineSubtotal = item.product.price * item.quantity;

            return (
              <div
                key={itemKey}
                className="bg-[#121214] border border-white/10 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <Link
                    to={`/product/${item.product.id}`}
                    className="w-20 h-24 sm:w-24 sm:h-28 bg-[#18181B] shrink-0 overflow-hidden border border-white/10"
                  >
                    <SafeImage
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>

                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                      {item.product.category}
                    </span>
                    <Link
                      to={`/product/${item.product.id}`}
                      className="block font-semibold text-base sm:text-lg text-[#F5F5F0] hover:text-[#D4AF37]"
                    >
                      {item.product.name}
                    </Link>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#A1A1AA] pt-1">
                      {item.selectedColor && (
                        <span>
                          Color: <strong className="text-[#F5F5F0]">{item.selectedColor}</strong>
                        </span>
                      )}
                      {item.selectedSize && (
                        <span>
                          Size: <strong className="text-[#F5F5F0] font-mono-num">{item.selectedSize}</strong>
                        </span>
                      )}
                    </div>

                    <div className="pt-1 flex items-baseline gap-2 font-mono-num">
                      <span className="text-sm text-[#D4AF37] font-semibold">
                        {formatPKR(item.product.price)}
                      </span>
                      {item.product.oldPrice && (
                        <span className="text-xs text-[#A1A1AA] line-through">
                          {formatPKR(item.product.oldPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quantity Controls, Line Subtotal & Remove */}
                <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
                  {/* [-] 1 [+] Stepper */}
                  <div className="inline-flex items-center border border-white/15 bg-[#18181B]">
                    <button
                      type="button"
                      onClick={() =>
                        updateCartQuantity(
                          item.product.id,
                          item.selectedSize,
                          item.selectedColor,
                          -1
                        )
                      }
                      className="w-9 h-9 flex items-center justify-center text-[#F5F5F0] hover:text-[#D4AF37] transition-colors"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="w-10 text-center text-sm font-mono-num font-semibold text-[#F5F5F0]">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateCartQuantity(
                          item.product.id,
                          item.selectedSize,
                          item.selectedColor,
                          1
                        )
                      }
                      className="w-9 h-9 flex items-center justify-center text-[#F5F5F0] hover:text-[#D4AF37] transition-colors"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  {/* Item Subtotal */}
                  <div className="text-right min-w-[95px]">
                    <span className="block text-[10px] uppercase tracking-wider text-[#A1A1AA]">
                      Subtotal
                    </span>
                    <span className="font-mono-num text-sm sm:text-base font-bold text-[#F5F5F0]">
                      {formatPKR(lineSubtotal)}
                    </span>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() =>
                      removeFromCart(
                        item.product.id,
                        item.selectedSize,
                        item.selectedColor
                      )
                    }
                    className="p-2 text-[#A1A1AA] hover:text-red-400 transition-colors"
                    aria-label={`Remove ${item.product.name} from cart`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Order Summary Box (No Delivery Fee) */}
        <div className="lg:col-span-4">
          <div className="bg-[#121214] border border-white/10 p-6 sm:p-8 space-y-6 sticky top-28">
            <h2 className="font-display text-2xl font-bold text-[#F5F5F0] border-b border-white/10 pb-4">
              Order Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-[#A1A1AA]">
                <span>Subtotal</span>
                <span className="font-mono-num text-[#F5F5F0] font-semibold">
                  {formatPKR(cartSubtotal)}
                </span>
              </div>

              {cartDiscountTotal > 0 && (
                <div className="flex items-center justify-between text-[#A1A1AA]">
                  <span>Offer Savings</span>
                  <span className="font-mono-num text-[#D4AF37]">
                    -{formatPKR(cartDiscountTotal)}
                  </span>
                </div>
              )}

              <div className="pt-4 border-t border-white/10 flex items-baseline justify-between">
                <span className="text-base font-bold text-[#F5F5F0] uppercase tracking-wider">
                  Total
                </span>
                <span className="font-mono-num text-xl sm:text-2xl font-bold text-[#D4AF37]">
                  {formatPKR(grandTotal)}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Link
                to="/checkout"
                className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] text-xs sm:text-sm font-bold uppercase tracking-[0.12em] transition-colors"
              >
                <span>PROCEED TO CHECKOUT</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/shop"
                className="w-full flex items-center justify-center py-3.5 px-6 border border-white/20 text-[#F5F5F0] hover:border-[#D4AF37] hover:text-[#D4AF37] text-xs font-semibold uppercase tracking-[0.12em] transition-colors"
              >
                CONTINUE SHOPPING
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
