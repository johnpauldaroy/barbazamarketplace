import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, Search, Store } from 'lucide-react';
import { fetchStores } from '../api/EcommerceApi';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';

const STORES_PAGE_SIZE = 12;

const resolveLocation = (store) =>
  [store?.city, store?.province, store?.country].filter(Boolean).join(', ');

const StoresPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
    setStores([]);
    setHasMore(false);
    setError('');
  }, [debouncedQuery]);

  useEffect(() => {
    let isCancelled = false;
    const isFirstPage = page === 1;

    const loadStores = async () => {
      if (isFirstPage) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await fetchStores({
          page,
          per_page: STORES_PAGE_SIZE,
          search: debouncedQuery || undefined,
        });

        if (isCancelled) return;

        const incomingStores = Array.isArray(response?.stores) ? response.stores : [];
        setHasMore(Boolean(response?.meta?.has_more_pages));
        setStores((currentStores) => (isFirstPage ? incomingStores : [...currentStores, ...incomingStores]));
        setError('');
      } catch (loadError) {
        if (isCancelled) return;
        setError(loadError?.message || 'Failed to load stores');
      } finally {
        if (isCancelled) return;
        setLoading(false);
        setLoadingMore(false);
      }
    };

    loadStores();

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, page]);

  const storeCountLabel = useMemo(() => {
    if (loading) return 'Loading stores...';
    return `${stores.length} store${stores.length === 1 ? '' : 's'} found`;
  }, [loading, stores.length]);

  return (
    <div className="pb-16">
      <Helmet>
        <title>Stores - Barbaza MPC Marketplace</title>
        <meta
          name="description"
          content="Browse active merchant stores and discover products by store."
        />
      </Helmet>

      <section className="border-b border-[#dfe7f4] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <Badge variant="secondary">Store directory</Badge>
          <h1 className="mt-3 text-2xl font-bold text-[#0b1739] sm:text-3xl lg:text-4xl">
            Discover merchant stores
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Open a store page to view products, business details, and contact information for direct inquiries.
          </p>

          <div className="relative mt-6 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by store name, city, or description"
              className="h-11 pl-10"
            />
          </div>
          <p className="mt-2.5 text-sm text-slate-500">{storeCountLabel}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`store-skeleton-${index}`}
                className="h-[220px] rounded-[30px] border border-[#e5edf8] bg-[#f5f8fe] animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <Card className="border-rose-200 bg-rose-50 text-rose-700">
            <CardContent className="p-6">{error}</CardContent>
          </Card>
        ) : stores.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-slate-500">
              No stores matched your search.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {stores.map((store) => {
                const locationLabel = resolveLocation(store);
                return (
                  <Card key={store.id} className="overflow-hidden rounded-[28px]">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#eef5ff] text-[#2954C8]">
                          {store.logo_image
                            ? <img src={store.logo_image} alt={store.name} className="h-full w-full object-cover" />
                            : <Store className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-[#0b1739]">{store.name}</p>
                          <p className="text-xs text-slate-400">{store.slug}</p>
                        </div>
                      </div>

                      <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-600">
                        {store?.description?.trim() || 'No store description available.'}
                      </p>

                      {locationLabel ? (
                        <p className="mt-3 inline-flex items-center gap-2 text-xs text-slate-500">
                          <MapPin className="h-3.5 w-3.5" />
                          {locationLabel}
                        </p>
                      ) : null}

                      <Link to={`/stores/${store.slug}`} className="mt-5 inline-block w-full">
                        <Button className="w-full">Open Store</Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-8 flex justify-center">
              {hasMore ? (
                <Button
                  variant="outline"
                  onClick={() => setPage((currentPage) => currentPage + 1)}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading
                    </span>
                  ) : (
                    'Load more stores'
                  )}
                </Button>
              ) : (
                <p className="text-sm text-slate-400">You reached the end of the store directory.</p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default StoresPage;
