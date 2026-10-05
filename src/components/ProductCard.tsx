import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Eye, ShoppingBag, Star } from 'lucide-react';
import { Product } from '../types';
import { formatPKR, calculateDiscountPercentage } from '../data/products';
import { useStore } from '../context/StoreContext';
import { SafeImage } from './SafeImage';

interface ProductCardProps {
  product: Product;
  showNewBadge?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, showNewBadge = false }) => {
  const { addToCart, toggleWishlist, isInWishlist, setQuickViewProduct } = useStore();
  const wished = isInWishlist(product.id);
  const discountPercent = calculateDiscountPercentage(product.price, product.oldPrice);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const defaultSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined;
    const defaultColor = product.colors && product.colors.length > 0 ? product.colors[0].name : undefined;
    addToCart(product, 1, defaultSize, defaultColor);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewProduct(product);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <article className="group bg-[#121214] border border-white/10 hover:border-[#D4AF37]/40 transition-all duration-200 flex flex-col justify-between">
      {/* Image Container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#18181B]">
        <Link to={`/product/${product.id}`} className="block w-full h-full">
          <SafeImage
            src={product.image}
            alt={product.name}
            fallbackTitle={product.name}
            className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-200" />
        </Link>

        {/* Single Top-Left Status Label (Max 1 subtle tag) */}
        <div className="absolute top-3 left-3 pointer-events-none">
          {discountPercent ? (
            <span className="inline-block bg-[#D4AF37] text-[#0B0B0C] text-[11px] font-mono-num font-bold uppercase tracking-wider px-2.5 py-1">
              {discountPercent}% OFF
            </span>
          ) : showNewBadge || product.isNewArrival ? (
            <span className="inline-block bg-[#0B0B0C]/90 border border-[#D4AF37]/50 text-[#D4AF37] text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1">
              NEW ARRIVAL
            </span>
          ) : null}
        </div>

        {/* Top-Right Wishlist Button */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          className={`absolute top-3 right-3 w-9 h-9 flex items-center justify-center transition-colors ${
            wished
              ? 'bg-[#D4AF37] text-[#0B0B0C]'
              : 'bg-[#0B0B0C]/75 text-[#F5F5F0] hover:bg-[#D4AF37] hover:text-[#0B0B0C]'
          }`}
        >
          <Heart className={`w-4 h-4 ${wished ? 'fill-current' : ''}`} />
        </button>

        {/* Hover Actions Overlay (Quick View + Add to Cart) */}
        <div className="absolute inset-x-3 bottom-3 flex flex-col sm:flex-row gap-2 opacity-100 lg:opacity-0 lg:translate-y-2 lg:group-hover:opacity-100 lg:group-hover:translate-y-0 transition-all duration-200">
          <button
            type="button"
            onClick={handleQuickView}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#0B0B0C]/90 border border-white/20 text-[#F5F5F0] hover:border-[#D4AF37] hover:text-[#D4AF37] text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Quick View</span>
          </button>
          <button
            type="button"
            onClick={handleQuickAdd}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#D4AF37] text-[#0B0B0C] hover:bg-[#e5c247] text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Clean Unboxed Metadata Row */}
          <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-1">
            <span className="uppercase tracking-wider">{product.category}</span>
            <span className="flex items-center gap-1 text-[#D4AF37] font-mono-num">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{product.rating.toFixed(1)}</span>
            </span>
          </div>

          <Link
            to={`/product/${product.id}`}
            className="block font-sans text-base font-semibold text-[#F5F5F0] hover:text-[#D4AF37] transition-colors line-clamp-1"
          >
            {product.name}
          </Link>
        </div>

        {/* Price Row */}
        <div className="pt-2 border-t border-white/5 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2 font-mono-num">
            <span className="text-[15px] font-semibold text-[#F5F5F0]">
              {formatPKR(product.price)}
            </span>
            {product.oldPrice && (
              <span className="text-xs text-[#A1A1AA] line-through">
                {formatPKR(product.oldPrice)}
              </span>
            )}
          </div>
          {discountPercent && (
            <span className="text-[11px] font-mono-num font-semibold text-[#D4AF37]">
              {discountPercent}% OFF
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
