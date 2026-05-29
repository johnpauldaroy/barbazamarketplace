import React, { startTransition, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  ChevronRight,
  Filter,
  Loader2,
  Search,
  SlidersHorizontal,
  Tag,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchProducts } from '../api/EcommerceApi';
import ProductCard from '../components/ProductCard';
import { useCart } from '../hooks/useCart';
import { buildSimpleCartItem } from '../lib/marketplace';
import { cn } from '../lib/utils';

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'stock', label: 'Stock availability' },
];

const ProductsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sentinelRef = useRef(null);
  const pagingRef = useRef(false);
  const { addToCart } = useCart();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(false);
    setTotal(0);
    setError('');
    setLoading(true);
  }, [debouncedSearch, selectedCategory, sortBy]);

  useEffect(() => {
    let cancelled = false;
    const isFirst = page === 1;
    if (isFirst) setLoading(true); else setLoadingMore(true);

    fetchProducts({
      page,
      per_page: PAGE_SIZE,
      search: debouncedSearch || undefined,
      category: selectedCategory || undefined,
      sort: sortBy,
    })
      .then((data) => {
        if (cancelled) return;
        const incoming = Array.isArray(data?.products) ? data.products : [];
        const cats = Array.isArray(data?.categories) ? data.categories : [];
        const meta = data?.meta || {};
        setCategories(cats);
        setHasMore(Boolean(meta.has_more_pages));
        setTotal(Number(meta.total || incoming.length));
        setProducts((prev) => {
          if (isFirst) return incoming;
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...incoming.filter((p) => !ids.has(p.id))];
        });
        setError('');
      })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load products'); })
      .finally(() => {
        if (cancelled) return;
        pagingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      });

    return () => { cancelled = true; };
  }, [page, debouncedSearch, selectedCategory, sortBy]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || loading || loadingMore || error || !hasMore) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || pagingRef.current) return;
      pagingRef.current = true;
      setPage((p) => p + 1);
    }, { rootMargin: '240px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, loadingMore, error]);

  const handleQuickAdd = (product) => {
    const { product: p, variant } = buildSimpleCartItem(product);
    addToCart(p, variant, 1, variant.inventory_quantity).catch(console.error);
  };

  const clearFilters = () => {
    startTransition(() => {
      setSearchQuery('');
      setSelectedCategory('');
      setSortBy('newest');
    });
  };

  const hasActiveFilters = debouncedSearch || selectedCategory || sortBy !== 'newest';

  const SidebarContent = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Category
        </h3>
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => { startTransition(() => setSelectedCategory('')); setSidebarOpen(false); }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              !selectedCategory ? 'bg-[#eef3fb] text-[#2954C8]' : 'text-slate-600 hover:bg-[#f4f7fd]'
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            All categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => { startTransition(() => setSelectedCategory(cat)); setSidebarOpen(false); }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                selectedCategory === cat ? 'bg-[#eef3fb] text-[#2954C8]' : 'text-slate-600 hover:bg-[#f4f7fd]'
              )}
            >
              <Tag className="h-3.5 w-3.5" />
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Sort by
        </h3>
        <div className="space-y-0.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { startTransition(() => setSortBy(opt.value)); setSidebarOpen(false); }}
              className={cn(
                'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                sortBy === opt.value ? 'bg-[#eef3fb] text-[#2954C8]' : 'text-slate-600 hover:bg-[#f4f7fd]'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#dfe7f4] py-2 text-sm font-medium text-slate-600 hover:bg-[#f4f7fd]"
        >
          <X className="h-3.5 w-3.5" />
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Marketplace — e-KoopMart</title>
        <meta name="description" content="Browse quality products from Barbaza MPC cooperative members." />
      </Helmet>

      {/* Page header */}
      <div className="border-b border-[#dfe7f4] bg-white">
        <div className="section py-8">
          {/* Breadcrumb */}
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
            <Link to="/" className="hover:text-[#2954C8]">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-slate-600">Marketplace</span>
          </nav>
          <h1 className="text-2xl font-bold text-[#0b1739] sm:text-3xl">Marketplace</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Browse products from Barbaza MPC cooperative members and local community producers.
          </p>
        </div>
      </div>

      <div className="section py-8">
        {/* Top bar — search full-width on mobile, controls row below */}
        <div className="mb-6 space-y-3">
          {/* Search — always full width */}
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
              placeholder="Search products..."
              className="h-11 w-full rounded-lg border border-[#dfe7f4] bg-white pl-10 pr-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#2954C8] focus:ring-2 focus:ring-[#2954C8]/10"
            />
          </div>

          {/* Controls row: sort + filter on mobile, count on desktop */}
          <div className="flex items-center gap-2">
            {/* Mobile sort select */}
            <div className="relative flex-1 lg:hidden">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => startTransition(() => setSortBy(e.target.value))}
                className="h-11 w-full appearance-none rounded-lg border border-[#dfe7f4] bg-white pl-9 pr-8 text-sm text-slate-700 outline-none focus:border-[#2954C8]"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Mobile filter toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-11 shrink-0 items-center gap-2 rounded-lg border border-[#dfe7f4] bg-white px-4 text-sm font-medium text-slate-700 lg:hidden"
            >
              <Filter className="h-4 w-4" />
              Filters
              {selectedCategory && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2954C8] text-[10px] font-bold text-white">1</span>
              )}
            </button>

            {/* Desktop product count */}
            <div className="hidden flex-1 items-center justify-end gap-2 text-sm text-slate-500 lg:flex">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#2954C8]" />
              ) : (
                <span>
                  {products.length > 0 ? `${products.length} of ${total.toLocaleString()} products` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="mb-4 flex flex-wrap gap-2">
            {debouncedSearch && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe7f4] bg-white px-3 py-1 text-xs font-medium text-slate-600">
                Search: "{debouncedSearch}"
                <button type="button" onClick={() => setSearchQuery('')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {selectedCategory && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe7f4] bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {selectedCategory}
                <button type="button" onClick={() => setSelectedCategory('')}><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-[110px] rounded-xl border border-[#dfe7f4] bg-white p-5">
              <SidebarContent />
            </div>
          </aside>

          {/* Product grid */}
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <div key={i} className="h-[340px] animate-pulse rounded-xl bg-[#e8eef8]" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
                {error}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-[#dfe7f4] bg-white py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3fb] text-[#2954C8]">
                  <Search className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-base font-semibold text-[#0b1739]">No products found</p>
                  <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filters.</p>
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg bg-[#2954C8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1f44a5]"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} onAddToCart={handleQuickAdd} />
                  ))}
                </div>

                <div ref={sentinelRef} className="flex h-16 items-center justify-center">
                  {loadingMore ? (
                    <span className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin text-[#2954C8]" />
                      Loading more products
                    </span>
                  ) : hasMore ? (
                    <span className="text-sm text-slate-400">Scroll to load more</span>
                  ) : (
                    <span className="text-sm text-slate-400">
                      Showing all {total.toLocaleString()} products
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-white p-5 shadow-2xl lg:hidden">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-base font-semibold text-[#0b1739]">Filters</p>
              <button type="button" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </>
      )}
    </>
  );
};

export default ProductsPage;
