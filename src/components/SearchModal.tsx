import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPKR } from '../data/products';
import { SafeImage } from './SafeImage';

const SUGGESTED_TERMS = ['shirt', 'black shirt', 'shoes', 'watch', 'perfume', 'pants', 'denim'];

export const SearchModal: React.FC = () => {
  const { products, searchOpen, setSearchOpen } = useStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [searchOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  if (!searchOpen) return null;

  const trimmed = query.trim().toLowerCase();

  const matchingProducts = trimmed
    ? products.filter((p) => {
        const inName = p.name.toLowerCase().includes(trimmed);
        const inCategory = p.category.toLowerCase().includes(trimmed);
        const inDesc =
          p.description.toLowerCase().includes(trimmed) ||
          p.shortDescription.toLowerCase().includes(trimmed);
        const inTags = p.tags.some((t) => t.toLowerCase().includes(trimmed));
        return inName || inCategory || inDesc || inTags;
      })
    : [];

  const handleSelectProduct = (productId: string) => {
    setSearchOpen(false);
    navigate(`/product/${productId}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center pt-12 sm:pt-20 px-4 overflow-y-auto pb-12"
      onClick={() => setSearchOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Search Malik G Collection"
    >
      <div
        className="w-full max-w-3xl bg-[#121214] border border-white/15 p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#F5F5F0]">
            Search Malik G Collection
          </h2>
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            className="p-2 text-[#A1A1AA] hover:text-[#F5F5F0]"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Box */}
        <div className="relative mt-6">
          <Search className="w-5 h-5 text-[#D4AF37] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product name, category, or tag (e.g., black shirt, watch, denim)..."
            className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] text-[#F5F5F0] pl-12 pr-24 py-3.5 text-sm sm:text-base focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs uppercase tracking-wider bg-white/10 text-[#F5F5F0] hover:bg-[#D4AF37] hover:text-[#0B0B0C] transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Search Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#A1A1AA] mr-1">Popular searches:</span>
          {SUGGESTED_TERMS.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => setQuery(term)}
              className={`px-3 py-1 text-xs border transition-colors ${
                query.toLowerCase() === term
                  ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0B0B0C] font-semibold'
                  : 'border-white/10 bg-[#18181B] text-[#A1A1AA] hover:text-[#F5F5F0] hover:border-white/30'
              }`}
            >
              {term}
            </button>
          ))}
        </div>

        {/* Results Area */}
        <div className="mt-6 pt-6 border-t border-white/10">
          {!trimmed ? (
            <div className="text-center py-8 text-sm text-[#A1A1AA]">
              Type above or click a popular search term to explore our collection of shirts, trousers, shoes, watches, and perfumes.
            </div>
          ) : matchingProducts.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <p className="font-display text-xl text-[#F5F5F0]">No products found.</p>
              <p className="text-xs text-[#A1A1AA]">
                No products match your search &ldquo;{query}&rdquo;. Try searching for shirt, pants, shoes, watch, or perfume.
              </p>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="mt-2 inline-block px-5 py-2 bg-[#D4AF37] text-[#0B0B0C] text-xs font-semibold uppercase tracking-wider"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                <span>Showing {matchingProducts.length} matching products</span>
                <Link
                  to={`/shop?q=${encodeURIComponent(trimmed)}`}
                  onClick={() => setSearchOpen(false)}
                  className="text-[#D4AF37] hover:underline flex items-center gap-1"
                >
                  <span>View all in Shop</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {matchingProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product.id)}
                    className="flex items-center gap-3.5 p-2.5 bg-[#18181B] border border-white/10 hover:border-[#D4AF37]/50 text-left transition-colors group"
                  >
                    <div className="w-16 h-20 shrink-0 bg-[#0B0B0C] overflow-hidden">
                      <SafeImage
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                        {product.category}
                      </span>
                      <h4 className="text-sm font-semibold text-[#F5F5F0] group-hover:text-[#D4AF37] truncate">
                        {product.name}
                      </h4>
                      <div className="mt-1 flex items-baseline gap-2 font-mono-num">
                        <span className="text-xs font-bold text-[#D4AF37]">
                          {formatPKR(product.price)}
                        </span>
                        {product.oldPrice && (
                          <span className="text-[11px] text-[#A1A1AA] line-through">
                            {formatPKR(product.oldPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
