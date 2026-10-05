import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Star, ShoppingBag, Heart, Check, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPKR, calculateDiscountPercentage } from '../data/products';
import { SafeImage } from './SafeImage';

export const QuickViewModal: React.FC = () => {
  const {
    quickViewProduct,
    setQuickViewProduct,
    addToCart,
    toggleWishlist,
    isInWishlist,
  } = useStore();

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [sizeError, setSizeError] = useState<string>('');

  useEffect(() => {
    if (quickViewProduct) {
      setSelectedSize(
        quickViewProduct.sizes && quickViewProduct.sizes.length > 0
          ? quickViewProduct.sizes[0]
          : ''
      );
      setQuantity(1);
      setSizeError('');
    }
  }, [quickViewProduct]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && quickViewProduct) {
        setQuickViewProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickViewProduct, setQuickViewProduct]);

  if (!quickViewProduct) return null;

  const discount = calculateDiscountPercentage(
    quickViewProduct.price,
    quickViewProduct.oldPrice
  );
  const wished = isInWishlist(quickViewProduct.id);

  const handleAddToCart = () => {
    if (quickViewProduct.sizes && quickViewProduct.sizes.length > 0 && !selectedSize) {
      setSizeError('Please select a size.');
      return;
    }
    setSizeError('');
    addToCart(quickViewProduct, quantity, selectedSize || undefined);
    setQuickViewProduct(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={() => setQuickViewProduct(null)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickview-title"
    >
      <div
        className="relative bg-[#121214] border border-white/15 max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 overflow-hidden shadow-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-right X button */}
        <button
          type="button"
          onClick={() => setQuickViewProduct(null)}
          className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center bg-[#0B0B0C]/80 text-[#F5F5F0] hover:text-[#D4AF37] border border-white/10 transition-colors"
          aria-label="Close quick view modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Image */}
        <div className="relative aspect-[4/5] md:aspect-auto bg-[#18181B] h-full">
          <SafeImage
            src={quickViewProduct.image}
            alt={quickViewProduct.name}
            fallbackTitle={quickViewProduct.name}
            className="w-full h-full object-cover"
          />
          {discount && (
            <span className="absolute top-4 left-4 bg-[#D4AF37] text-[#0B0B0C] text-xs font-mono-num font-bold px-2.5 py-1 uppercase">
              {discount}% OFF
            </span>
          )}
        </div>

        {/* Product Details Column */}
        <div className="p-6 sm:p-8 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
              <span className="uppercase tracking-wider">{quickViewProduct.category}</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-[#D4AF37] font-mono-num">
                <Star className="w-3.5 h-3.5 fill-current" />
                {quickViewProduct.rating.toFixed(1)} ({quickViewProduct.reviewsCount} reviews)
              </span>
            </div>

            <h2
              id="quickview-title"
              className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5F0]"
            >
              {quickViewProduct.name}
            </h2>

            <div className="flex items-baseline gap-3 font-mono-num">
              <span className="text-xl font-bold text-[#D4AF37]">
                {formatPKR(quickViewProduct.price)}
              </span>
              {quickViewProduct.oldPrice && (
                <span className="text-sm text-[#A1A1AA] line-through">
                  {formatPKR(quickViewProduct.oldPrice)}
                </span>
              )}
            </div>

            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              {quickViewProduct.shortDescription}
            </p>

            {/* Size Selector */}
            {quickViewProduct.sizes && quickViewProduct.sizes.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="uppercase tracking-wider text-[#A1A1AA]">
                    Select Size: <strong className="text-[#F5F5F0]">{selectedSize}</strong>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickViewProduct.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        setSizeError('');
                      }}
                      className={`px-3.5 py-2 text-xs font-mono-num font-medium border transition-colors ${
                        selectedSize === size
                          ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0B0B0C] font-bold'
                          : 'border-white/15 bg-[#18181B] text-[#F5F5F0] hover:border-[#D4AF37]/60'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                {sizeError && <p className="text-xs text-red-400">{sizeError}</p>}
              </div>
            )}

            {/* Quantity Selector */}
            <div className="pt-2 space-y-2">
              <span className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
                Quantity
              </span>
              <div className="inline-flex items-center border border-white/15 bg-[#18181B]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center text-[#F5F5F0] hover:text-[#D4AF37] transition-colors"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="w-10 text-center text-sm font-mono-num text-[#F5F5F0]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-9 h-9 flex items-center justify-center text-[#F5F5F0] hover:text-[#D4AF37] transition-colors"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[#D4AF37] text-[#0B0B0C] hover:bg-[#e5c247] text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>
              <button
                type="button"
                onClick={() => toggleWishlist(quickViewProduct)}
                className={`px-3.5 py-3 border transition-colors ${
                  wished
                    ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                    : 'border-white/15 text-[#F5F5F0] hover:border-[#D4AF37]'
                }`}
                aria-label="Toggle Wishlist"
              >
                <Heart className={`w-4 h-4 ${wished ? 'fill-current' : ''}`} />
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Link
                to={`/product/${quickViewProduct.id}`}
                onClick={() => setQuickViewProduct(null)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D4AF37] hover:underline uppercase tracking-wider"
              >
                <span>View Full Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={() => setQuickViewProduct(null)}
                className="text-xs text-[#A1A1AA] hover:text-[#F5F5F0] uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
