import React, { startTransition, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Filter,
  Loader2,
  Search,
  SlidersHorizontal,
  Store,
  Tag,
  X,
} from 'lucide-react';
import { fetchProducts } from '../api/EcommerceApi';
import ProductCard from '../components/ProductCard';
import { useCart } from '../hooks/useCart';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { buildSimpleCartItem } from '../lib/marketplace';
import { cn } from '../lib/utils';

const PRODUCTS_PAGE_SIZE = 9;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest in catalog' },
  { value: 'name', label: 'Name: A to Z' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'stock', label: 'Stock availability' },
];

const ProductsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [productsLoading, setProductsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [productsError, setProductsError] = useState('');
  const loadMoreRef = useRef(null);
  const isPagingRef = useRef(false);
  const { addToCart } = useCart();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMoreProducts(false);
    setTotalProducts(0);
    setProductsError('');
    setProductsLoading(true);
  }, [debouncedSearchQuery, selectedCategory, sortBy]);

  useEffect(() => {
    let isCancelled = false;

    const loadProducts = async () => {
      const isFirstPage = page === 1;

      if (isFirstPage) {
        setProductsLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const data = await fetchProducts({
          page,
          per_page: PRODUCTS_PAGE_SIZE,
          search: debouncedSearchQuery || undefined,
          category: selectedCategory || undefined,
          sort: sortBy,
        });

        if (isCancelled) return;

        const incomingProducts = Array.isArray(data?.products) ? data.products : [];
        const incomingCategories = Array.isArray(data?.categories) ? data.categories : [];
        const meta = data?.meta || {};

        setCategories(incomingCategories);
        setHasMoreProducts(Boolean(meta.has_more_pages));
        setTotalProducts(Number(meta.total || incomingProducts.length));
        setProducts((currentProducts) => {
          if (isFirstPage) return incomingProducts;

          const existingIds = new Set(currentProducts.map((product) => product.id));
          const uniqueIncoming = incomingProducts.filter((product) => !existingIds.has(product.id));
          return [...currentProducts, ...uniqueIncoming];
        });
        setProductsError('');
      } catch (error) {
        if (isCancelled) return;
        setProductsError(error?.message || 'Failed to load products');
      } finally {
        if (isCancelled) return;
        isPagingRef.current = false;
        setProductsLoading(false);
        setLoadingMore(false);
      }
    };

    loadProducts();

    return () => {
      isCancelled = true;
    };
  }, [page, debouncedSearchQuery, selectedCategory, sortBy]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;

    if (!sentinel || productsLoading || loadingMore || productsError || !hasMoreProducts) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || isPagingRef.current) return;
        isPagingRef.current = true;
        setPage((currentPage) => currentPage + 1);
      },
      { rootMargin: '240px 0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreProducts, loadingMore, productsError, productsLoading]);

  const handleQuickAdd = (product) => {
    const { product: cartProduct, variant } = buildSimpleCartItem(product);
    addToCart(cartProduct, variant, 1, variant.inventory_quantity).catch((error) => {
      console.error(error);
    });
  };

  const clearFilters = () => {
    startTransition(() => {
      setSearchQuery('');
      setSelectedCategory('');
      setSortBy('newest');
    });
  };

  const handleSearchChange = (event) => {
    const { value } = event.target;
    startTransition(() => {
      setSearchQuery(value);
    });
  };

  const handleCategoryChange = (value) => {
    startTransition(() => {
      setSelectedCategory(value);
    });
  };

  const handleSortChange = (value) => {
    startTransition(() => {
      setSortBy(value);
    });
  };

  return (
    <div className="pb-16">
      <Helmet>
        <title>Products - Barbaza MPC Marketplace</title>
        <meta
          name="description"
          content="Browse quality products from Barbaza Multi-Purpose Cooperative members."
        />
      </Helmet>

      <section className="border-b border-white/60">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <Badge variant="secondary">Marketplace catalog</Badge>
            <h1 className="mt-4 text-4xl font-bold text-[#0b1739] sm:text-5xl">
              Explore trusted products from Barbaza MPC members and local community producers.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-500 sm:text-base">
              Browse fresh produce, everyday essentials, and member-made goods in a cleaner marketplace designed for convenient community shopping and stronger cooperative visibility.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <aside className="lg:sticky lg:top-[126px]">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="border-b border-[#ecf1fa] p-6">
                  <p className="text-lg font-semibold text-[#0b1739]">Filter by category</p>
                </div>

                <div className="space-y-2 p-4">
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('')}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all',
                      !selectedCategory
                        ? 'bg-[#eef5ff] text-[#2954C8]'
                        : 'text-slate-600 hover:bg-[#f8fbff]'
                    )}
                  >
                    <Store className="h-4 w-4" />
                    All categories
                  </button>

                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategoryChange(category)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all',
                        selectedCategory === category
                          ? 'bg-[#eef5ff] text-[#2954C8]'
                          : 'text-slate-600 hover:bg-[#f8fbff]'
                      )}
                    >
                      <Tag className="h-4 w-4" />
                      {category}
                    </button>
                  ))}
                </div>

                <div className="border-t border-[#ecf1fa] p-6">
                  <p className="text-lg font-semibold text-[#0b1739]">Sort by</p>
                  <div className="mt-4 space-y-2">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSortChange(option.value)}
                        className={cn(
                          'w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all',
                          sortBy === option.value
                            ? 'bg-[#eef5ff] text-[#2954C8]'
                            : 'text-slate-600 hover:bg-[#f8fbff]'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <Button variant="outline" className="mt-5 w-full gap-2" onClick={clearFilters}>
                    <X className="h-4 w-4" />
                    Clear filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          </aside>

          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-[#0b1739]">Products</p>
                  </div>

                  <div className="relative w-full max-w-md">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Search product"
                      className="pl-11"
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 lg:hidden">
                  <label className="flex items-center gap-3 rounded-xl border border-[#d7e2f1] bg-white px-4">
                    <Filter className="h-4 w-4 text-[#2954C8]" />
                    <select
                      value={selectedCategory}
                      onChange={(event) => handleCategoryChange(event.target.value)}
                      className="h-11 w-full bg-transparent text-sm text-slate-700 outline-none"
                    >
                      <option value="">All categories</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-[#d7e2f1] bg-white px-4">
                    <SlidersHorizontal className="h-4 w-4 text-[#2954C8]" />
                    <select
                      value={sortBy}
                      onChange={(event) => handleSortChange(event.target.value)}
                      className="h-11 w-full bg-transparent text-sm text-slate-700 outline-none"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </CardContent>
            </Card>

            {productsLoading ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`products-skeleton-${index}`}
                    className="h-[440px] rounded-[30px] border border-[#e5edf8] bg-[#f5f8fe] animate-pulse"
                  />
                ))}
              </div>
            ) : productsError ? (
              <Card className="border-rose-200 bg-rose-50 text-rose-700">
                <CardContent className="p-6">{productsError}</CardContent>
              </Card>
            ) : products.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eef5ff] text-[#2954C8]">
                    <Search className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[#0b1739]">No products matched your filters</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Reset the search or category filters to see the full marketplace again.
                    </p>
                  </div>
                  <Button onClick={clearFilters}>Reset filters</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between px-1 text-sm text-slate-500">
                  <p>
                    Showing {products.length} of {totalProducts.toLocaleString('en-US')} products
                  </p>
                  {loadingMore ? (
                    <span className="inline-flex items-center gap-2 text-[#2954C8]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading more
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} onAddToCart={handleQuickAdd} />
                  ))}
                </div>

                <div ref={loadMoreRef} className="flex min-h-[72px] items-center justify-center">
                  {loadingMore ? (
                    <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin text-[#2954C8]" />
                      Loading more products
                    </span>
                  ) : hasMoreProducts ? (
                    <span className="text-sm text-slate-400">Scroll to load more products</span>
                  ) : (
                    <span className="text-sm text-slate-400">You have reached the end of the catalog</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProductsPage;
