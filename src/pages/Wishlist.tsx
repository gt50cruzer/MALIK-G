import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { PRODUCTS, formatPKR } from '../data/products';
import { SafeImage } from '../components/SafeImage';

export const Wishlist: React.FC = () => {
  const { wishlist, toggleWishlist, addToCart } = useStore();

  const wishedProducts = wishlist
    .map((id) => PRODUCTS.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  if (wishedProducts.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-6">
        <div className="w-16 h-16 mx-auto bg-[#121214] border border-white/10 flex items-center justify-center">
          <Heart className="w-7 h-7 text-[#D4AF37]" />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#F5F5F0]">
          Your wishlist is empty.
        </h1>
        <p className="text-sm text-[#A1A1AA] max-w-md mx-auto">
          Save your favorite shirts, trousers, leather footwear, timepieces, and fragrances to revisit them anytime.
        </p>
        <div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] text-xs sm:text-sm font-bold uppercase tracking-[0.15em] transition-colors"
          >
            <span>EXPLORE PRODUCTS</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] mb-1">
            Saved Items
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#F5F5F0]">
            My Wishlist ({wishedProducts.length})
          </h1>
        </div>
        <Link
          to="/shop"
          className="text-xs font-semibold uppercase tracking-wider text-[#D4AF37] hover:underline"
        >
          Continue Shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {wishedProducts.map((product) => (
          <div
            key={product.id}
            className="bg-[#121214] border border-white/10 flex flex-col justify-between"
          >
            <div>
              <Link
                to={`/product/${product.id}`}
                className="block relative aspect-[4/5] bg-[#18181B] overflow-hidden"
              >
                <SafeImage
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </Link>
              <div className="p-4 space-y-1.5">
                <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                  {product.category}
                </span>
                <Link
                  to={`/product/${product.id}`}
                  className="block font-semibold text-base text-[#F5F5F0] hover:text-[#D4AF37] line-clamp-1"
                >
                  {product.name}
                </Link>
                <div className="flex items-baseline gap-2 font-mono-num pt-1">
                  <span className="text-sm font-bold text-[#D4AF37]">
                    {formatPKR(product.price)}
                  </span>
                  {product.oldPrice && (
                    <span className="text-xs text-[#A1A1AA] line-through">
                      {formatPKR(product.oldPrice)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 pt-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  addToCart(
                    product,
                    1,
                    product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined
                  )
                }
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add to Cart</span>
              </button>
              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                className="p-2.5 border border-white/15 text-[#A1A1AA] hover:text-red-400 hover:border-red-400/50 transition-colors"
                aria-label={`Remove ${product.name} from wishlist`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
