import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Filter,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { fetchProducts, fetchStoreBySlug, submitStoreInquiry } from '../api/EcommerceApi';
import ProductCard from '../components/ProductCard';
import StoreLogo from '../components/StoreLogo';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { buildCartItem, hasMultipleVariants } from '../lib/marketplace';

const STORE_PRODUCTS_PAGE_SIZE = 24;
const STORE_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest in catalog' },
  { value: 'name', label: 'Name: A to Z' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'stock', label: 'Stock availability' },
];

const buildAddress = (store) =>
  [
    store?.address_line_1,
    store?.address_line_2,
    store?.city,
    store?.province,
    store?.postal_code,
    store?.country,
  ]
    .filter(Boolean)
    .join(', ');

const StoreDetailPage = () => {
  const { slug } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [totalProducts, setTotalProducts] = useState(0);
  const [loadingStore, setLoadingStore] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [storeError, setStoreError] = useState('');
  const [productsError, setProductsError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [coverImageFailed, setCoverImageFailed] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    website: '',
  });

  useEffect(() => {
    setInquiryForm((currentForm) => ({
      ...currentForm,
      name: user?.name || '',
      email: user?.email || '',
    }));
  }, [user?.email, user?.name]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    setCoverImageFailed(false);
    setSelectedCategory('');
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSortBy('newest');
  }, [store?.cover_image, slug]);

  useEffect(() => {
    let isCancelled = false;

    const loadStore = async () => {
      setLoadingStore(true);
      setStoreError('');
      try {
        const response = await fetchStoreBySlug(slug);
        if (!isCancelled) {
          setStore(response);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setStoreError(loadError?.message || 'Failed to load store details');
          setStore(null);
        }
      } finally {
        if (!isCancelled) {
          setLoadingStore(false);
        }
      }
    };

    loadStore();

    return () => {
      isCancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let isCancelled = false;

    const loadProducts = async () => {
      if (!store?.id) {
        setProducts([]);
        setCategories([]);
        setTotalProducts(0);
        setLoadingProducts(false);
        return;
      }

      setLoadingProducts(true);
      setProductsError('');
      try {
        const response = await fetchProducts({
          store_id: store.id,
          category: selectedCategory || undefined,
          search: debouncedSearchQuery || undefined,
          page: 1,
          per_page: STORE_PRODUCTS_PAGE_SIZE,
          sort: sortBy,
        });
        if (!isCancelled) {
          setProducts(Array.isArray(response?.products) ? response.products : []);
          setCategories(Array.isArray(response?.categories) ? response.categories : []);
          setTotalProducts(Number(response?.meta?.total || 0));
        }
      } catch (loadError) {
        if (!isCancelled) {
          setProducts([]);
          setCategories([]);
          setTotalProducts(0);
          setProductsError(loadError?.message || 'Failed to load store products');
        }
      } finally {
        if (!isCancelled) {
          setLoadingProducts(false);
        }
      }
    };

    loadProducts();

    return () => {
      isCancelled = true;
    };
  }, [store?.id, selectedCategory, debouncedSearchQuery, sortBy]);

  const addressLabel = useMemo(() => buildAddress(store), [store]);

  const handleQuickAdd = (product) => {
    // More than one option means the shopper must choose a unit first.
    if (hasMultipleVariants(product)) {
      navigate(`/product/${product.id}`);
      return;
    }

    const { product: cartProduct, variant } = buildCartItem(product);
    addToCart(cartProduct, variant, 1, variant.inventory_quantity).catch((cartError) => {
      console.error(cartError);
    });
  };

  const handleInquirySubmit = async (event) => {
    event.preventDefault();
    if (!slug) return;

    setSubmittingInquiry(true);
    setSubmitError('');
    setSubmitSuccess('');
    try {
      await submitStoreInquiry(slug, inquiryForm);
      setSubmitSuccess('Your inquiry has been sent to the seller.');
      setInquiryForm((currentForm) => ({
        ...currentForm,
        phone: '',
        message: '',
        website: '',
      }));
      setIsContactDialogOpen(false);
    } catch (submitRequestError) {
      setSubmitError(submitRequestError?.message || 'Failed to submit inquiry.');
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const clearCatalogFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedCategory('');
    setSortBy('newest');
  };

  if (loadingStore) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-[#2954C8]" />
          Loading store
        </span>
      </div>
    );
  }

  if (storeError && !store) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-[#0b1739]">Unable to load store</h1>
        <p className="mt-3 text-slate-500">{storeError}</p>
        <Link to="/stores" className="mt-6 inline-block">
          <Button>Back to stores</Button>
        </Link>
      </div>
    );
  }

  if (!store) {
    return null;
  }

  return (
    <div className="pb-16">
      <Helmet>
        <title>{store.name} — e-KoopMart Cooperative Store</title>
        <meta name="description" content={`Browse products from ${store.name}, a Barbaza MPC cooperative member store${store.city ? ` in ${store.city}` : ''}. Shop local and support the community.`} />
        <link rel="canonical" href={`https://ekoopmart.barbazampc.coop/stores/${store.slug}`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${store.name} — e-KoopMart`} />
        <meta property="og:description" content={`Browse products from ${store.name}, a Barbaza MPC cooperative member store.`} />
        <meta property="og:url" content={`https://ekoopmart.barbazampc.coop/stores/${store.slug}`} />
        {store.cover_image && <meta property="og:image" content={store.cover_image} />}
        <meta property="og:site_name" content="e-KoopMart" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${store.name} — e-KoopMart`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": store.name,
          "description": store.description || `A Barbaza MPC cooperative member store on e-KoopMart.`,
          "url": `https://ekoopmart.barbazampc.coop/stores/${store.slug}`,
          "image": store.cover_image || undefined,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": [store.address_line_1, store.address_line_2].filter(Boolean).join(', ') || undefined,
            "addressLocality": store.city || "Barbaza",
            "addressRegion": store.province || "Antique",
            "postalCode": store.postal_code || "5706",
            "addressCountry": "PH"
          },
          "parentOrganization": {
            "@type": "Organization",
            "name": "Barbaza Multi-Purpose Cooperative"
          }
        })}</script>
      </Helmet>

      <section className="relative overflow-hidden border-b border-white/70">
        <div className="absolute inset-0 bg-[#0b1739]" />
        {store?.cover_image && !coverImageFailed ? (
          <img
            src={store.cover_image}
            alt={`${store.name} cover`}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setCoverImageFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#0b1739_0%,#15337f_55%,#2ea7ff_100%)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,17,42,0.82)_0%,rgba(9,17,42,0.70)_45%,rgba(9,17,42,0.86)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(78,138,255,0.30),transparent_42%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-14 text-white sm:px-6 lg:px-8">
          <div className="w-full rounded-[28px] border border-white/20 bg-black/20 p-6 backdrop-blur-[2px] sm:p-8">
            <Badge className="border border-white/20 bg-white/10 text-white">Storefront</Badge>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <StoreLogo
                src={store?.logo_image}
                name={store.name}
                className="h-14 w-14 bg-white/20 text-white"
                iconClassName="h-7 w-7"
              />
              <div>
                <h1 className="text-4xl font-bold sm:text-5xl">{store.name}</h1>
                <p className="mt-1 text-sm text-white/90">{Number(store?.product_count || 0)} products listed</p>
              </div>
            </div>

            <p className="mt-6 max-w-3xl text-sm leading-8 text-white/90 sm:text-base">
              {store?.description?.trim() || 'No store description provided yet.'}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardContent className="space-y-6 p-6">
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
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search product"
                        className="pl-11"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <label className="flex items-center gap-3 rounded-xl border border-[#d7e2f1] bg-white px-4">
                      <Filter className="h-4 w-4 text-[#2954C8]" />
                      <select
                        value={selectedCategory}
                        onChange={(event) => setSelectedCategory(event.target.value)}
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
                        onChange={(event) => setSortBy(event.target.value)}
                        className="h-11 w-full bg-transparent text-sm text-slate-700 outline-none"
                      >
                        {STORE_SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <Button variant="outline" className="gap-2" onClick={clearCatalogFilters}>
                      <X className="h-4 w-4" />
                      Clear filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <p className="px-1 text-sm text-slate-500">
                Showing {products.length} of {totalProducts.toLocaleString('en-US')} products
              </p>

              {loadingProducts ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`store-product-skeleton-${index}`}
                      className="h-[420px] rounded-[30px] border border-[#e5edf8] bg-[#f5f8fe] animate-pulse"
                    />
                  ))}
                </div>
              ) : productsError ? (
                <Card className="border-rose-200 bg-rose-50 text-rose-700">
                  <CardContent className="p-6">{productsError}</CardContent>
                </Card>
              ) : products.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-sm text-slate-500">
                    No products matched your store filters.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} onAddToCart={handleQuickAdd} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              {store?.contact_email ? (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-[#2954C8]" />
                  {store.contact_email}
                </p>
              ) : null}

              {store?.contact_phone ? (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-[#2954C8]" />
                  {store.contact_phone}
                </p>
              ) : null}

              {addressLabel ? (
                <p className="inline-flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2954C8]" />
                  <span>{addressLabel}</span>
                </p>
              ) : (
                <p className="text-slate-500">No address listed.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Seller</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-slate-500">
                Send a message directly to this seller for product availability, pricing, or delivery concerns.
              </p>
              {store?.facebook_url ? (
                <a href={store.facebook_url} target="_blank" rel="noopener noreferrer" className="block w-full">
                  <Button className="w-full gap-2">
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.885v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                    </svg>
                    Message on Facebook
                  </Button>
                </a>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => {
                    setSubmitError('');
                    setSubmitSuccess('');
                    setIsContactDialogOpen(true);
                  }}
                >
                  Contact Seller
                </Button>
              )}
              {submitSuccess ? <p className="mt-3 text-xs text-emerald-600">{submitSuccess}</p> : null}
            </CardContent>
          </Card>
        </div>
      </section>

      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Contact Seller</DialogTitle>
            <DialogDescription>
              Ask about product availability, wholesale pricing, or delivery options.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-3" onSubmit={handleInquirySubmit}>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-500">Name</label>
              <Input
                value={inquiryForm.name}
                onChange={(event) => setInquiryForm((currentForm) => ({ ...currentForm, name: event.target.value }))}
                placeholder="Your name"
                required={!isAuthenticated}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-500">Email</label>
              <Input
                type="email"
                value={inquiryForm.email}
                onChange={(event) => setInquiryForm((currentForm) => ({ ...currentForm, email: event.target.value }))}
                placeholder="you@example.com"
                required={!isAuthenticated}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-500">Phone (optional)</label>
              <Input
                value={inquiryForm.phone}
                onChange={(event) => setInquiryForm((currentForm) => ({ ...currentForm, phone: event.target.value }))}
                placeholder="09XXXXXXXXX"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-500">Message</label>
              <textarea
                value={inquiryForm.message}
                onChange={(event) =>
                  setInquiryForm((currentForm) => ({ ...currentForm, message: event.target.value }))
                }
                placeholder="Ask about product availability, wholesale pricing, or delivery options."
                className="h-32 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#2954C8] focus:ring-2 focus:ring-[#2954C8]/20"
                required
              />
            </div>

            <div className="hidden" aria-hidden="true">
              <label className="text-xs font-bold uppercase text-slate-500">Website</label>
              <Input
                tabIndex={-1}
                autoComplete="off"
                value={inquiryForm.website}
                onChange={(event) =>
                  setInquiryForm((currentForm) => ({ ...currentForm, website: event.target.value }))
                }
              />
            </div>

            {submitError ? <p className="text-xs text-rose-600">{submitError}</p> : null}

            <Button type="submit" className="w-full" disabled={submittingInquiry}>
              {submittingInquiry ? 'Sending...' : 'Send Inquiry'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoreDetailPage;
