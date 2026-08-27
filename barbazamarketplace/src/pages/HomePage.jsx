import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CircleDollarSign,
  Leaf,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from 'lucide-react';
import { fetchProducts, fetchStores } from '../api/EcommerceApi';
import ProductCard from '../components/ProductCard';
import { useCart } from '../hooks/useCart';
import { buildSimpleCartItem } from '../lib/marketplace';

const CATEGORIES = [
  { label: 'Fresh Produce', icon: Leaf, color: 'bg-green-50 text-green-700', border: 'border-green-100' },
  { label: 'Handicrafts', icon: ShoppingBag, color: 'bg-amber-50 text-amber-700', border: 'border-amber-100' },
  { label: 'Dry Goods', icon: ShieldCheck, color: 'bg-blue-50 text-blue-700', border: 'border-blue-100' },
  { label: 'Local Products', icon: CircleDollarSign, color: 'bg-purple-50 text-purple-700', border: 'border-purple-100' },
];

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: 'Verified cooperative products',
    desc: 'Every item is sourced from accountable Barbaza MPC members and trusted local partners.',
  },
  {
    icon: Truck,
    title: 'Shop essentials with ease',
    desc: 'Families can easily browse and order essential goods in one organized marketplace.',
  },
  {
    icon: CircleDollarSign,
    title: 'Fair and sustainable pricing',
    desc: 'Prices stay affordable for buyers while sustaining member livelihoods and cooperative growth.',
  },
  {
    icon: Leaf,
    title: 'Community impact',
    desc: 'Every purchase helps strengthen local income, shared progress, and the cooperative mission.',
  },
];

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchProducts({ page: 1, per_page: 8, sort: 'name' })
      .then((data) => {
        if (mounted) setFeaturedProducts(Array.isArray(data?.products) ? data.products : []);
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchStores({ per_page: 100 })
      .then((data) => {
        if (!mounted) return;
        const stores = Array.isArray(data?.stores) ? data.stores : [];
        const unique = Array.from(
          new Set(
            stores
              .map((s) => [s?.city, s?.province].filter(Boolean).join(', '))
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));
        setLocations(unique.slice(0, 6));
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleQuickAdd = (product) => {
    const { product: p, variant } = buildSimpleCartItem(product);
    addToCart(p, variant, 1, variant.inventory_quantity).catch(console.error);
  };

  return (
    <>
      <Helmet>
        <title>e-KoopMart — Barbaza MPC Community Marketplace</title>
        <meta name="description" content="Shop quality products from Barbaza Multi-Purpose Cooperative members. When local members thrive, our community grows." />
        <link rel="canonical" href="https://ekoopmart.barbazampc.coop/" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="e-KoopMart — Barbaza MPC Community Marketplace" />
        <meta property="og:description" content="Shop quality products from Barbaza Multi-Purpose Cooperative members. When local members thrive, our community grows." />
        <meta property="og:url" content="https://ekoopmart.barbazampc.coop/" />
        <meta property="og:image" content="https://ekoopmart.barbazampc.coop/logo512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="e-KoopMart — Barbaza MPC Community Marketplace" />
        <meta name="twitter:description" content="Shop quality products from Barbaza Multi-Purpose Cooperative members." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Barbaza Multi-Purpose Cooperative",
          "alternateName": "e-KoopMart",
          "url": "https://ekoopmart.barbazampc.coop",
          "logo": "https://ekoopmart.barbazampc.coop/logo512.png",
          "description": "Barbaza MPC's online marketplace connecting members, families, and local producers through trusted community commerce.",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Cubay",
            "addressLocality": "Barbaza",
            "addressRegion": "Antique",
            "postalCode": "5706",
            "addressCountry": "PH"
          },
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+63-919-065-4532",
            "contactType": "customer service",
            "email": "marketing@barbazampc.coop",
            "availableLanguage": ["English", "Filipino"]
          },
          "sameAs": [
            "https://facebook.com",
            "https://instagram.com"
          ]
        })}</script>
      </Helmet>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-[#0b1739]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(46,167,255,0.22),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(41,84,200,0.18),transparent_50%)]"
        />
        <div className="section relative py-10 md:py-20">
          {/* Mobile hero image — shows below lg */}
          <div className="mb-6 overflow-hidden rounded-xl lg:hidden">
            {/* A fixed height stretched this square source into anything from
                1.6:1 to 4:1 across devices; a set ratio keeps the crop stable. */}
            <img
              src="/assets/images/local_farmer_antique.png"
              alt="Local farmers in Barbaza"
              loading="eager"
              width="640"
              height="640"
              className="aspect-[4/3] w-full object-cover object-center sm:aspect-[16/9]"
            />
          </div>

          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            {/* Copy */}
            <div className="text-white">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                <Star className="h-3 w-3 fill-current text-yellow-300" />
                Barbaza MPC Community Marketplace
              </span>
              <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                When local members thrive,{' '}
                <span className="text-[#7ec8ff]">our community grows.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/65">
                Behind every product is a local member working to build a better future. Explore
                products from our cooperative members through our marketplace built to strengthen
                livelihoods, encourage shared progress, and make everyday shopping more meaningful.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#0b1739] shadow-lg hover:bg-[#f0f6ff] transition-colors"
                >
                  Browse marketplace
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/stores"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  View all stores
                </Link>
              </div>
              {/* Stats */}
              <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/15 pt-6 text-sm sm:gap-6">
                <div>
                  <p className="text-xl font-bold text-white sm:text-2xl">100+</p>
                  <p className="text-xs text-white/55 sm:text-sm">Products listed</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-white sm:text-2xl">Local</p>
                  <p className="text-xs text-white/55 sm:text-sm">Member stores</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-white sm:text-2xl">Fair</p>
                  <p className="text-xs text-white/55 sm:text-sm">Cooperative prices</p>
                </div>
              </div>
            </div>

            {/* Hero image */}
            <div className="hidden lg:block">
              <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                <img
                  src="/assets/images/local_farmer_antique.png"
                  alt="Local farmers in Barbaza"
                  className="h-[420px] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1739]/50 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/20 bg-white/15 p-4 backdrop-blur-md">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Featured</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    Fresh crops sourced from local cooperative farmers
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORY STRIP ── */}
      <section className="border-b border-[#dfe7f4] bg-white">
        <div className="section py-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CATEGORIES.map(({ label, icon: Icon, color, border }) => (
              <Link
                key={label}
                to={`/products?category=${encodeURIComponent(label)}`}
                className={`flex items-center gap-3 rounded-xl border ${border} ${color} px-4 py-3.5 text-sm font-semibold transition-all hover:shadow-sm hover:scale-[1.02]`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/60">
                  <Icon className="h-4 w-4" />
                </div>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOCATION STRIP ── */}
      {locations.length > 0 && (
        <section className="border-b border-[#dfe7f4] bg-[#f8fafd]">
          <div className="section py-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#2954C8]" />
                <p className="text-sm font-semibold text-[#0b1739]">Shop by Location</p>
              </div>
              <Link
                to="/products"
                className="flex items-center gap-1 text-xs font-semibold text-[#2954C8] hover:text-[#1f44a5]"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <Link
                  key={loc}
                  to={`/products?location=${encodeURIComponent(loc)}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe7f4] bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:border-[#2954C8] hover:bg-[#eef3fb] hover:text-[#2954C8] hover:shadow-sm"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {loc}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURED PRODUCTS ── */}
      <section className="section py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#2954C8]">Featured catalog</p>
            <h2 className="mt-1.5 text-2xl font-bold text-[#0b1739] sm:text-3xl">
              Popular picks from the cooperative
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-500">
              Discover fresh essentials and local favorites from Barbaza MPC member stores.
            </p>
          </div>
          <Link
            to="/products"
            className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-[#2954C8] hover:text-[#1f44a5] sm:flex"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[360px] animate-pulse rounded-xl bg-[#e8eef8]" />
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="rounded-xl border border-[#dfe7f4] bg-white p-12 text-center text-sm text-slate-400">
            No products available yet.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={handleQuickAdd} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-lg border border-[#dfe7f4] bg-white px-6 py-2.5 text-sm font-semibold text-[#2954C8] shadow-sm"
          >
            View all products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── PROMO BANNER ── */}
      <section className="section pb-14">
        <div className="relative overflow-hidden rounded-2xl bg-[#0b1739]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(46,167,255,0.2),transparent_55%)]"
          />
          <div className="relative flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between lg:p-12">
            <div className="max-w-lg text-white">
              <span className="inline-block rounded-full bg-white/15 px-3 py-0.5 text-xs font-semibold text-white/80">
                Barbaza MPC
              </span>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                Supporting local products, cooperative values, and shared community progress.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                Barbaza MPC connects members, families, and local producers through one marketplace
                that promotes trusted products and strengthens the cooperative mission.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:shrink-0">
              <Link
                to="/about"
                className="rounded-lg bg-white px-6 py-3 text-center text-sm font-semibold text-[#0b1739] hover:bg-[#f0f6ff] transition-colors"
              >
                Learn more
              </Link>
              <Link
                to="/products"
                className="rounded-lg border border-white/25 bg-white/10 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Shop now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST / WHY SECTION ── */}
      <section className="border-t border-[#dfe7f4] bg-white">
        <div className="section py-14">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#2954C8]">
              Why shop with Barbaza MPC
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#0b1739] sm:text-3xl">
              A marketplace built for members, families, and the wider community
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_ITEMS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-[#dfe7f4] bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef3fb] text-[#2954C8]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-[#0b1739]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePage;
