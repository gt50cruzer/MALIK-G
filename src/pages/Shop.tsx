import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import { PRODUCTS, calculateDiscountPercentage } from '../data/products';
import { CategoryType } from '../types';
import { ProductCard } from '../components/ProductCard';

interface ShopProps {
  presetCategory?: CategoryType;
  mode?: 'all' | 'new-arrivals' | 'sale';
}

type PriceFilterType = 'all' | 'under-2000' | '2000-5000' | '5000-10000' | 'above-10000';
type SortOptionType = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'best-rated';

const CATEGORIES: ('All' | CategoryType)[] = [
  'All',
  'Shirts',
  'Pants',
  'Shoes',
  'Watches',
  'Perfumes',
];

const APPAREL_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const PANTS_SIZES = ['30', '32', '34', '36', '38', '40'];
const SHOE_SIZES = ['39', '40', '41', '42', '43', '44'];

export const Shop: React.FC<ShopProps> = ({ presetCategory, mode = 'all' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [selectedCategory, setSelectedCategory] = useState<'All' | CategoryType>(
    presetCategory || 'All'
  );
  const [priceRange, setPriceRange] = useState<PriceFilterType>('all');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOptionType>(
    mode === 'new-arrivals' ? 'newest' : 'featured'
  );
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);

  // Sync presetCategory when navigating between /shop, /shirts, /pants, /shoes, /watches, /perfumes
  useEffect(() => {
    setSelectedCategory(presetCategory || 'All');
    setSelectedSize('');
  }, [presetCategory, mode]);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setSearchQuery(q);
  }, [searchParams]);

  const clearAllFilters = () => {
    if (!presetCategory) {
      setSelectedCategory('All');
    }
    setPriceRange('all');
    setSelectedSize('');
    setSortBy(mode === 'new-arrivals' ? 'newest' : 'featured');
    setSearchQuery('');
    if (searchParams.has('q')) {
      setSearchParams({});
    }
  };

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      // Mode filter (New Arrivals or Sale)
      if (mode === 'new-arrivals' && !product.isNewArrival) {
        return false;
      }
      if (mode === 'sale') {
        const discount = calculateDiscountPercentage(product.price, product.oldPrice);
        if (!discount || discount <= 0) return false;
      }

      // Category filter
      if (selectedCategory !== 'All' && product.category !== selectedCategory) {
        return false;
      }

      // Price filter
      if (priceRange === 'under-2000' && product.price >= 2000) return false;
      if (priceRange === '2000-5000' && (product.price < 2000 || product.price > 5000))
        return false;
      if (priceRange === '5000-10000' && (product.price < 5000 || product.price > 10000))
        return false;
      if (priceRange === 'above-10000' && product.price <= 10000) return false;

      // Size filter
      if (selectedSize) {
        if (!product.sizes || !product.sizes.includes(selectedSize)) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const inName = product.name.toLowerCase().includes(q);
        const inCat = product.category.toLowerCase().includes(q);
        const inDesc =
          product.description.toLowerCase().includes(q) ||
          product.shortDescription.toLowerCase().includes(q);
        const inTags = product.tags.some((t) => t.toLowerCase().includes(q));
        if (!inName && !inCat && !inDesc && !inTags) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'best-rated') return b.rating - a.rating || b.reviewsCount - a.reviewsCount;
      if (sortBy === 'newest') {
        return (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0);
      }
      // featured
      return (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0);
    });
  }, [mode, selectedCategory, priceRange, selectedSize, sortBy, searchQuery]);

  // Page Heading & Subtitle
  const pageTitle = useMemo(() => {
    if (mode === 'new-arrivals') return 'NEW ARRIVALS';
    if (mode === 'sale') return 'EXCLUSIVE SALE';
    if (presetCategory) return presetCategory.toUpperCase();
    return 'THE COMPLETE COLLECTION';
  }, [mode, presetCategory]);

  const pageSubtitle = useMemo(() => {
    if (mode === 'new-arrivals')
      return 'Explore our latest seasonal arrivals in shirts, trousers, footwear, luxury timepieces, and signature fragrances.';
    if (mode === 'sale')
      return 'Limited-time offers on genuine Malik G Collection apparel, footwear, watches, and Eau de Parfums.';
    if (presetCategory === 'Shirts')
      return 'Smart styles for every occasion — crafted from breathable Oxford, fine twill, and ring-spun denim.';
    if (presetCategory === 'Pants')
      return 'Comfort meets modern style — tailored formal trousers, stretch chinos, and export-grade denim.';
    if (presetCategory === 'Shoes')
      return 'Step into premium style — hand-burnished leather formal shoes, loafers, and minimalist sneakers.';
    if (presetCategory === 'Watches')
      return 'Time made stylish — precision chronographs, executive steel bracelets, and dress leather watches.';
    if (presetCategory === 'Perfumes')
      return 'Make your presence unforgettable — long-lasting Oud, Black Musk, Amber, and Woody Eau de Parfums.';
    return 'Browse our complete catalog of menswear, footwear, watches, fragrances, and leather essentials.';
  }, [mode, presetCategory]);

  const hasActiveFilters =
    (!presetCategory && selectedCategory !== 'All') ||
    priceRange !== 'all' ||
    selectedSize !== '' ||
    searchQuery.trim() !== '';

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Page Header */}
      <div className="border-b border-white/10 pb-8 mb-8">
        <div className="flex items-center gap-2 text-xs text-[#A1A1AA] uppercase tracking-wider mb-3">
          <Link to="/" className="hover:text-[#D4AF37]">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#D4AF37]">{pageTitle}</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-5xl font-bold text-[#F5F5F0] tracking-tight">
              {pageTitle}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#A1A1AA] max-w-2xl">
              {pageSubtitle}
            </p>
          </div>
          <div className="text-xs font-mono-num text-[#A1A1AA]">
            Showing <strong className="text-[#F5F5F0]">{filteredProducts.length}</strong> products
          </div>
        </div>
      </div>

      {/* Top Controls Bar (Mobile Filter Toggle + Search + Sort Dropdown) */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-md">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
            className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 bg-[#121214] border border-white/15 text-xs font-semibold uppercase tracking-wider text-[#F5F5F0]"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" />
            <span>Filters</span>
          </button>

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by keyword (e.g. oxford, denim, oud)..."
              className="w-full bg-[#121214] border border-white/15 focus:border-[#D4AF37] text-xs sm:text-sm text-[#F5F5F0] pl-10 pr-8 py-2.5 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  if (searchParams.has('q')) setSearchParams({});
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#F5F5F0]"
                aria-label="Clear search filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sort By Selector */}
        <div className="flex items-center gap-3">
          <label htmlFor="sort-select" className="text-xs uppercase tracking-wider text-[#A1A1AA]">
            Sort By:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOptionType)}
            className="bg-[#121214] border border-white/15 focus:border-[#D4AF37] text-xs sm:text-sm text-[#F5F5F0] px-3.5 py-2.5 focus:outline-none"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price Low to High</option>
            <option value="price-desc">Price High to Low</option>
            <option value="best-rated">Best Rated</option>
          </select>
        </div>
      </div>

      {/* Main Layout: Left Filter Sidebar + Right Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Filter Sidebar */}
        <aside
          className={`lg:col-span-3 space-y-8 bg-[#121214] border border-white/10 p-6 h-fit ${
            mobileFiltersOpen ? 'block' : 'hidden lg:block'
          }`}
          aria-label="Product Filters"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="font-display text-xl font-bold text-[#F5F5F0] tracking-wide">
              Filters
            </h2>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-[#D4AF37] hover:underline uppercase tracking-wider"
              >
                Reset All
              </button>
            )}
          </div>

          {/* 1. CATEGORY FILTER */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D4AF37]">
              Category
            </h3>
            <div className="space-y-1.5">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedSize('');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm text-left transition-colors ${
                      isSelected
                        ? 'bg-[#D4AF37] text-[#0B0B0C] font-bold'
                        : 'text-[#A1A1AA] hover:text-[#F5F5F0] hover:bg-white/5'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="font-mono-num text-xs opacity-80">
                      {cat === 'All'
                        ? PRODUCTS.length
                        : PRODUCTS.filter((p) => p.category === cat).length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. PRICE FILTER */}
          <div className="space-y-3 pt-6 border-t border-white/10">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D4AF37]">
              Price Range
            </h3>
            <div className="space-y-1.5">
              {[
                { id: 'all', label: 'All Prices' },
                { id: 'under-2000', label: 'Under Rs. 2,000' },
                { id: '2000-5000', label: 'Rs. 2,000 - Rs. 5,000' },
                { id: '5000-10000', label: 'Rs. 5,000 - Rs. 10,000' },
                { id: 'above-10000', label: 'Above Rs. 10,000' },
              ].map((range) => (
                <button
                  key={range.id}
                  type="button"
                  onClick={() => setPriceRange(range.id as PriceFilterType)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm text-left transition-colors ${
                    priceRange === range.id
                      ? 'bg-[#D4AF37] text-[#0B0B0C] font-bold'
                      : 'text-[#A1A1AA] hover:text-[#F5F5F0] hover:bg-white/5'
                  }`}
                >
                  <span>{range.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. SIZE FILTER */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D4AF37]">
                Size
              </h3>
              {selectedSize && (
                <button
                  type="button"
                  onClick={() => setSelectedSize('')}
                  className="text-[11px] text-[#A1A1AA] hover:text-[#F5F5F0]"
                >
                  Clear ({selectedSize})
                </button>
              )}
            </div>

            {/* Shirts / Apparel Sizes */}
            {(selectedCategory === 'All' || selectedCategory === 'Shirts') && (
              <div className="space-y-2">
                <span className="block text-[11px] text-[#A1A1AA] uppercase tracking-wider">
                  Shirts (S - XXL)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {APPAREL_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(selectedSize === size ? '' : size)}
                      className={`px-3 py-1.5 text-xs font-mono-num border transition-colors ${
                        selectedSize === size
                          ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0B0B0C] font-bold'
                          : 'border-white/15 bg-[#18181B] text-[#F5F5F0] hover:border-[#D4AF37]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Footwear Sizes (39 - 44) */}
            {(selectedCategory === 'All' || selectedCategory === 'Shoes') && (
              <div className="space-y-2">
                <span className="block text-[11px] text-[#A1A1AA] uppercase tracking-wider">
                  Shoes (EU 39 - 44)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SHOE_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(selectedSize === size ? '' : size)}
                      className={`px-3 py-1.5 text-xs font-mono-num border transition-colors ${
                        selectedSize === size
                          ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0B0B0C] font-bold'
                          : 'border-white/15 bg-[#18181B] text-[#F5F5F0] hover:border-[#D4AF37]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pants Waist Sizes (30 - 40) */}
            {(selectedCategory === 'All' || selectedCategory === 'Pants') && (
              <div className="space-y-2">
                <span className="block text-[11px] text-[#A1A1AA] uppercase tracking-wider">
                  Waist (30 - 40)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PANTS_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(selectedSize === size ? '' : size)}
                      className={`px-3 py-1.5 text-xs font-mono-num border transition-colors ${
                        selectedSize === size
                          ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0B0B0C] font-bold'
                          : 'border-white/15 bg-[#18181B] text-[#F5F5F0] hover:border-[#D4AF37]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Product Grid */}
        <div className="lg:col-span-9">
          {filteredProducts.length === 0 ? (
            <div className="bg-[#121214] border border-white/10 p-12 text-center space-y-4">
              <h3 className="font-display text-2xl font-bold text-[#F5F5F0]">
                No products match your search.
              </h3>
              <p className="text-sm text-[#A1A1AA] max-w-md mx-auto">
                We couldn&apos;t find any items matching your active filters. Try clearing your size or price range filter to view more items.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-block px-6 py-3 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showNewBadge={mode === 'new-arrivals'}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
