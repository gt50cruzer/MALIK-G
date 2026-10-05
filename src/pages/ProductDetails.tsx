import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star,
  ShoppingBag,
  Heart,
  MessageCircle,
  Check,
  Truck,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import {
  BRAND_INFO,
  formatPKR,
  calculateDiscountPercentage,
} from '../data/products';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    products,
    addToCart,
    toggleWishlist,
    isInWishlist,
    addRecentlyViewed,
    recentlyViewed,
  } = useStore();

  const product = products.find((p) => p.id === id);

  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (product) {
      setSelectedImage(product.image);
      setSelectedSize(product.sizes && product.sizes.length > 0 ? product.sizes[0] : '');
      setSelectedColor(
        product.colors && product.colors.length > 0 ? product.colors[0].name : ''
      );
      setQuantity(1);
      setValidationError('');
      addRecentlyViewed(product.id);
    }
  }, [product, addRecentlyViewed]);

  if (!product) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-5">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#F5F5F0]">
          Product Not Found
        </h1>
        <p className="text-sm text-[#A1A1AA] max-w-md mx-auto">
          The product you are looking for may have been moved or is no longer available.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Shop</span>
        </Link>
      </div>
    );
  }

  const discount = calculateDiscountPercentage(product.price, product.oldPrice);
  const wished = isInWishlist(product.id);

  const validateOptions = (): boolean => {
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setValidationError('Please select a size before continuing.');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleAddToCart = () => {
    if (!validateOptions()) return;
    addToCart(product, quantity, selectedSize || undefined, selectedColor || undefined);
  };

  const handleBuyNow = () => {
    if (!validateOptions()) return;
    const added = addToCart(
      product,
      quantity,
      selectedSize || undefined,
      selectedColor || undefined
    );
    if (added) {
      navigate('/checkout');
    }
  };

  const productPageUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/product/${product.id}`
      : `/product/${product.id}`;

  const whatsappMessage = `Hello Malik G Collection, I am interested in ${product.name}${
    selectedColor ? ` | Color: ${selectedColor}` : ''
  }${selectedSize ? ` | Size: ${selectedSize}` : ''} (${formatPKR(
    product.price
  )}). Product Link: ${productPageUrl} — Please share availability and details.`;
  const whatsappUrl = `${BRAND_INFO.whatsappUrl}?text=${encodeURIComponent(whatsappMessage)}`;

  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const recentProducts = recentlyViewed
    .filter((rId) => rId !== product.id)
    .map((rId) => products.find((p) => p.id === rId))
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-20">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-[#A1A1AA] uppercase tracking-wider">
        <Link to="/" className="hover:text-[#D4AF37]">
          Home
        </Link>
        <span>/</span>
        <Link to={`/${product.category.toLowerCase()}`} className="hover:text-[#D4AF37]">
          {product.category}
        </Link>
        <span>/</span>
        <span className="text-[#F5F5F0] truncate">{product.name}</span>
      </nav>

      {/* Main Contiguous Purchase Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
        {/* Left: Product Image Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-[4/5] bg-[#121214] border border-white/10 overflow-hidden">
            <SafeImage
              src={selectedImage || product.image}
              alt={product.name}
              fallbackTitle={product.name}
              className="w-full h-full object-cover object-center"
            />
            {discount && (
              <span className="absolute top-4 left-4 bg-[#D4AF37] text-[#0B0B0C] text-xs font-mono-num font-bold uppercase px-3 py-1">
                {discount}% OFF
              </span>
            )}
          </div>

          {/* Thumbnail Selector */}
          {product.gallery && product.gallery.length > 1 && (
            <div className="flex items-center gap-3">
              {product.gallery.map((imgUrl, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedImage(imgUrl)}
                  className={`w-20 h-24 border overflow-hidden transition-colors ${
                    (selectedImage || product.image) === imgUrl
                      ? 'border-[#D4AF37]'
                      : 'border-white/15 opacity-60 hover:opacity-100'
                  }`}
                >
                  <SafeImage
                    src={imgUrl}
                    alt={`${product.name} view ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Sticky Purchase Details Module */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Category, SKU, Rating */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#A1A1AA]">
              <div className="flex items-center gap-2 uppercase tracking-wider">
                <span className="text-[#D4AF37] font-semibold">{product.category}</span>
                <span>·</span>
                <span className="font-mono-num">SKU: {product.sku}</span>
              </div>

              <div className="flex items-center gap-1.5 text-[#D4AF37] font-mono-num">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-bold">{product.rating.toFixed(1)}</span>
                <span className="text-[#A1A1AA]">({product.reviewsCount} Reviews)</span>
              </div>
            </div>

            {/* Product Title */}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F5F5F0] leading-tight">
              {product.name}
            </h1>

            {/* Price & Stock Status */}
            <div className="flex flex-wrap items-baseline justify-between gap-4 pt-2 pb-4 border-b border-white/10">
              <div className="flex items-baseline gap-3 font-mono-num">
                <span className="text-2xl sm:text-3xl font-bold text-[#D4AF37]">
                  {formatPKR(product.price)}
                </span>
                {product.oldPrice && (
                  <>
                    <span className="text-base text-[#A1A1AA] line-through">
                      {formatPKR(product.oldPrice)}
                    </span>
                    <span className="text-xs font-bold text-[#D4AF37]">
                      Save {formatPKR(product.oldPrice - product.price)} ({discount}% OFF)
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs font-medium">
                {product.inStock ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <Check className="w-4 h-4" />
                    <span>In Stock — Ready to Ship</span>
                  </span>
                ) : (
                  <span className="text-red-400">Out of Stock</span>
                )}
              </div>
            </div>

            {/* Full Description */}
            <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
              {product.description}
            </p>

            <div className="text-xs text-[#A1A1AA] space-y-1 bg-[#121214] border border-white/10 p-4">
              <div>
                <strong className="text-[#F5F5F0] uppercase tracking-wider">Material / Specification: </strong>
                <span>{product.fabricOrMaterial}</span>
              </div>
            </div>

            {/* Color Selector (if applicable) */}
            {product.colors && product.colors.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <span className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
                  Color: <strong className="text-[#F5F5F0]">{selectedColor}</strong>
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {product.colors.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedColor(c.name)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs border transition-colors ${
                        selectedColor === c.name
                          ? 'border-[#D4AF37] bg-white/10 text-[#F5F5F0] font-semibold'
                          : 'border-white/15 bg-[#121214] text-[#A1A1AA] hover:text-[#F5F5F0]'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/30"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selector */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="uppercase tracking-wider text-[#A1A1AA]">
                    Available Size: <strong className="text-[#F5F5F0]">{selectedSize}</strong>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        setValidationError('');
                      }}
                      className={`min-w-[48px] px-4 py-2.5 text-xs font-mono-num font-semibold border transition-colors ${
                        selectedSize === size
                          ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0B0B0C]'
                          : 'border-white/15 bg-[#121214] text-[#F5F5F0] hover:border-[#D4AF37]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                {validationError && (
                  <p className="text-xs text-red-400 font-medium">{validationError}</p>
                )}
              </div>
            )}

            {/* Quantity Selector */}
            <div className="space-y-2.5 pt-2">
              <span className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
                Quantity
              </span>
              <div className="inline-flex items-center border border-white/15 bg-[#121214]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 flex items-center justify-center text-lg text-[#F5F5F0] hover:text-[#D4AF37] transition-colors"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="w-12 text-center text-sm font-mono-num font-semibold text-[#F5F5F0]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-11 h-11 flex items-center justify-center text-lg text-[#F5F5F0] hover:text-[#D4AF37] transition-colors"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Primary Action Buttons: ADD TO CART, BUY NOW, ADD TO WISHLIST, ORDER ON WHATSAPP */}
            <div className="pt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex items-center justify-center gap-2 py-4 px-6 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] text-xs sm:text-sm font-bold uppercase tracking-[0.12em] transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>ADD TO CART</span>
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="flex items-center justify-center gap-2 py-4 px-6 bg-[#F5F5F0] hover:bg-white text-[#0B0B0C] text-xs sm:text-sm font-bold uppercase tracking-[0.12em] transition-colors"
                >
                  <span>BUY NOW</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => toggleWishlist(product)}
                  className={`flex items-center justify-center gap-2 py-3.5 px-5 border text-xs font-semibold uppercase tracking-wider transition-colors ${
                    wished
                      ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                      : 'border-white/20 bg-[#121214] text-[#F5F5F0] hover:border-[#D4AF37]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${wished ? 'fill-current' : ''}`} />
                  <span>{wished ? 'SAVED IN WISHLIST' : 'ADD TO WISHLIST'}</span>
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3.5 px-5 border border-[#D4AF37]/50 bg-[#121214] hover:bg-[#D4AF37] text-[#D4AF37] hover:text-[#0B0B0C] text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>ORDER ON WHATSAPP</span>
                </a>
              </div>
            </div>

            {/* Delivery & Authenticity Guarantees */}
            <div className="pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#A1A1AA]">
              <div className="flex items-start gap-3">
                <Truck className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[#F5F5F0] font-semibold">
                    Nationwide Dispatch
                  </span>
                  <span>Fast courier dispatch from our Sialkot flagship store.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[#F5F5F0] font-semibold">
                    Malik G Quality Guarantee
                  </span>
                  <span>Inspected and packed at our Sialkot store.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="pt-12 border-t border-white/10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5F0] mb-8">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Viewed Products */}
      {recentProducts.length > 0 && (
        <section className="pt-12 border-t border-white/10">
          <h2 className="font-display text-2xl font-bold text-[#F5F5F0] mb-6">
            Recently Viewed
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {recentProducts.map(
              (item) => item && <ProductCard key={item.id} product={item} />
            )}
          </div>
        </section>
      )}
    </div>
  );
};
