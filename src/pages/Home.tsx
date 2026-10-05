import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Phone } from 'lucide-react';
import { BRAND_INFO, CATEGORY_CARDS } from '../data/products';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';

export const Home: React.FC = () => {
  const { products } = useStore();
  // Display 8 trending/featured products from live catalog
  const trendingProducts = products.filter((p) => p.isTrending).slice(0, 8);
  const displayProducts =
    trendingProducts.length >= 8 ? trendingProducts : products.slice(0, 8);

  const scrollToCategories = () => {
    const el = document.getElementById('featured-categories');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-20 sm:space-y-28 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[78vh] flex items-center bg-[#0B0B0C] overflow-hidden border-b border-white/10">
        {/* Background Editorial Campaign Image with Measured Scrim */}
        <div className="absolute inset-0">
          <SafeImage
            src={BRAND_INFO.heroImage}
            alt="Malik G Collection Luxury Menswear Campaign"
            className="w-full h-full object-cover object-center opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0C] via-[#0B0B0C]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0C] via-transparent to-[#0B0B0C]/40" />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-medium">
              <span>Malik G Collection</span>
              <span>·</span>
              <span>Sialkot, Pakistan</span>
            </div>

            <h1
              className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold text-[#F5F5F0] tracking-tight leading-[1.08]"
              style={{ textWrap: 'balance' }}
            >
              STYLE THAT DEFINES YOU
            </h1>

            <p className="text-base sm:text-lg text-[#A1A1AA] leading-relaxed max-w-xl">
              Discover premium fashion, footwear, fragrances and accessories at Malik G Collection.
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Link
                to="/shop"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] text-xs sm:text-sm font-bold uppercase tracking-[0.15em] transition-colors whitespace-nowrap"
              >
                <span>SHOP NOW</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={scrollToCategories}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-[#121214]/90 hover:bg-white/10 text-[#F5F5F0] border border-white/20 hover:border-[#D4AF37] text-xs sm:text-sm font-semibold uppercase tracking-[0.15em] transition-colors whitespace-nowrap"
              >
                <span>EXPLORE COLLECTION</span>
              </button>
            </div>

            {/* Subtle Value Assurances */}
            <div className="pt-8 border-t border-white/10 grid grid-cols-3 gap-4 text-xs text-[#A1A1AA]">
              <div>
                <span className="block text-[#F5F5F0] font-semibold">Premium Quality</span>
                <span>Curated Menswear &amp; Luxury</span>
              </div>
              <div>
                <span className="block text-[#F5F5F0] font-semibold">Nationwide Dispatch</span>
                <span>All Cities Across Pakistan</span>
              </div>
              <div>
                <span className="block text-[#F5F5F0] font-semibold">Sialkot Flagship</span>
                <span>Direct WhatsApp Ordering</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED CATEGORIES SECTION (5 Large Category Cards) */}
      <section
        id="featured-categories"
        className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] mb-2">
              01. Curated Departments
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#F5F5F0]">
              Explore By Category
            </h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#D4AF37] hover:underline"
          >
            <span>View Full Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 5-Card Architectural Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          {CATEGORY_CARDS.map((cat, idx) => {
            // First 2 cards span 3 columns on lg; bottom 3 cards span 2 columns on lg
            const colSpanClass = idx < 2 ? 'lg:col-span-3' : 'lg:col-span-2';
            return (
              <div
                key={cat.id}
                className={`group relative overflow-hidden bg-[#121214] border border-white/10 hover:border-[#D4AF37]/50 transition-all duration-300 min-h-[340px] sm:min-h-[380px] flex flex-col justify-end ${colSpanClass}`}
              >
                <div className="absolute inset-0">
                  <SafeImage
                    src={cat.image}
                    alt={`${cat.title} Collection at Malik G Collection`}
                    fallbackTitle={cat.title}
                    className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
                </div>

                <div className="relative z-10 p-6 sm:p-8 space-y-3">
                  <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-wider text-[#F5F5F0]">
                    {cat.title}
                  </h3>
                  <p className="text-sm text-[#A1A1AA] max-w-sm">{cat.subtitle}</p>
                  <div className="pt-2">
                    <Link
                      to={cat.path}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] text-[#0B0B0C] hover:bg-[#e5c247] text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
                    >
                      <span>{cat.buttonText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. TRENDING NOW SECTION (8 Featured Products) */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] mb-2">
              02. Signature Selection
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#F5F5F0]">
              TRENDING NOW
            </h2>
          </div>
          <div className="flex items-center gap-6 text-xs sm:text-sm">
            <Link
              to="/new-arrivals"
              className="text-[#A1A1AA] hover:text-[#F5F5F0] uppercase tracking-wider transition-colors"
            >
              New Arrivals
            </Link>
            <Link
              to="/sale"
              className="text-[#D4AF37] hover:underline uppercase tracking-wider font-semibold"
            >
              View Sale Offers
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-8 py-4 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0B0B0C] text-xs sm:text-sm font-bold uppercase tracking-[0.15em] transition-colors"
          >
            <span>Explore Complete Collection ({products.length} Products)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 4. THE SIALKOT STOREFRONT SHOWCASE */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#121214] border border-white/10 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          <div className="lg:col-span-7 relative min-h-[340px] sm:min-h-[440px] bg-[#18181B]">
            <SafeImage
              src={BRAND_INFO.storefrontImage}
              alt="Malik G Collection Storefront in Sialkot, Pakistan"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent lg:hidden" />
          </div>

          <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-center space-y-6">
            <div className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
              03. Our Flagship Store
            </div>
            <h2
              className="font-display text-3xl sm:text-4xl font-bold text-[#F5F5F0] leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Visit Malik G Collection in Sialkot
            </h2>
            <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
              Malik G Collection is a fashion and lifestyle store based in Sialkot, Pakistan, offering stylish clothing, footwear, watches, fragrances and accessories for customers looking for modern quality and everyday style.
            </p>

            <div className="space-y-2.5 pt-2 border-t border-white/10 text-sm">
              <div className="flex items-center gap-3 text-[#F5F5F0]">
                <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>{BRAND_INFO.location}</span>
              </div>
              <div className="flex items-center gap-3 text-[#F5F5F0]">
                <Phone className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <a
                  href={`tel:${BRAND_INFO.phoneRaw}`}
                  className="font-mono-num hover:text-[#D4AF37] transition-colors"
                >
                  {BRAND_INFO.phoneDisplay}
                </a>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                to="/about"
                className="px-6 py-3 bg-[#D4AF37] text-[#0B0B0C] hover:bg-[#e5c247] text-xs font-bold uppercase tracking-wider transition-colors"
              >
                About Our Store
              </Link>
              <Link
                to="/contact"
                className="px-6 py-3 border border-white/20 text-[#F5F5F0] hover:border-[#D4AF37] hover:text-[#D4AF37] text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                Contact &amp; Directions
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
