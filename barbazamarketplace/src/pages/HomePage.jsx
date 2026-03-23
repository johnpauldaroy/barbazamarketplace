import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Star,
  Truck,
} from 'lucide-react';
import { fetchProducts } from '../api/EcommerceApi';
import ProductCard from '../components/ProductCard';
import { useCart } from '../hooks/useCart';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { buildSimpleCartItem } from '../lib/marketplace';

const VALUE_PILLARS = [
  {
    icon: ShieldCheck,
    title: 'Trusted member products',
    description: 'Products are sourced from Barbaza MPC members and local partners with accountability, care, and community trust.',
  },
  {
    icon: Truck,
    title: 'Convenient community shopping',
    description: 'Families can browse essential goods more easily while the cooperative manages orders in one organized marketplace.',
  },
  {
    icon: CircleDollarSign,
    title: 'Fair and sustainable pricing',
    description: 'Prices are set to remain affordable for buyers while helping sustain member livelihoods and cooperative growth.',
  },
  {
    icon: Sprout,
    title: 'Community impact',
    description: 'Every purchase helps strengthen local income, shared progress, and the long-term mission of Barbaza MPC.',
  },
];

const HERO_SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80',
    statLabel: 'Seasonal goods',
    statValue: 'Farm-to-community supply',
    accentIcon: Sprout,
    accentTitle: 'Community produce',
    accentText: 'Locally grown goods from trusted cooperative suppliers.',
  },
  {
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1400&q=80',
    statLabel: 'Handmade products',
    statValue: 'Crafted by local members',
    accentIcon: ShoppingBag,
    accentTitle: 'Member-made crafts',
    accentText: 'Handmade products that help create income for Barbaza MPC members.',
  },
  {
    image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1400&q=80',
    statLabel: 'Shopping promise',
    statValue: 'Trusted, local, fair',
    accentIcon: ShieldCheck,
    accentTitle: 'Stronger together',
    accentText: 'Every order supports members, families, and the wider community.',
  },
];

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const { addToCart } = useCart();

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      setProductsLoading(true);
      setProductsError('');

      try {
        const data = await fetchProducts({ page: 1, per_page: 4, sort: 'name' });
        const items = Array.isArray(data?.products) ? data.products : [];
        if (isMounted) setFeaturedProducts(items);
      } catch (error) {
        if (isMounted) setProductsError(error?.message || 'Failed to load products');
      } finally {
        if (isMounted) setProductsLoading(false);
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setActiveSlide((current) => (current + 1) % HERO_SLIDES.length);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const handleQuickAdd = (product) => {
    const { product: cartProduct, variant } = buildSimpleCartItem(product);
    addToCart(cartProduct, variant, 1, variant.inventory_quantity).catch((error) => {
      console.error(error);
    });
  };

  const currentHeroSlide = HERO_SLIDES[activeSlide];
  const CurrentAccentIcon = currentHeroSlide.accentIcon;

  return (
    <div className="pb-16">
      <Helmet>
        <title>Barbaza MPC - Cooperative Marketplace</title>
        <meta
          name="description"
          content="Shop quality products while supporting our cooperative members and strengthening our community."
        />
      </Helmet>

      <section className="relative overflow-hidden border-b border-white/60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(46,167,255,0.18),_transparent_28%),linear-gradient(135deg,#0b1739_0%,#15337f_55%,#2ea7ff_100%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
          <div className="max-w-2xl text-white">
            <Badge className="border border-white/15 bg-white/10 text-white">
              Marketplace refresh
            </Badge>
            <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Supporting local members, shared growth, and community-centered commerce.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/78 sm:text-lg">
              Explore products from cooperative members and local producers through a marketplace built to strengthen livelihoods, encourage shared progress, and make everyday shopping more meaningful for the whole community.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products">
                <Button size="lg" className="gap-2 bg-white text-[#0b1739] shadow-none hover:bg-[#eef5ff]">
                  Browse products
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/about">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/25 bg-white/5 text-white hover:border-white hover:bg-white/10 hover:text-white"
                >
                  Learn about the cooperative
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="surface-card relative overflow-hidden border-white/10 bg-white/12 p-4 backdrop-blur-md">
              <div className="relative h-[440px] overflow-hidden rounded-[26px]">
                {HERO_SLIDES.map((slide, index) => (
                  <div
                    key={slide.title}
                    className={`absolute inset-0 transition-all duration-700 ${
                      index === activeSlide
                        ? 'scale-100 opacity-100'
                        : 'scale-[1.03] opacity-0'
                    }`}
                  >
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b1739]/60 via-transparent to-[#0b1739]/25" />
                  </div>
                ))}

                <div className="absolute inset-x-0 bottom-0 flex justify-end p-4">
                  <div className="hidden items-center gap-2 md:flex">
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-[#0b1739] transition hover:bg-white"
                      onClick={() =>
                        setActiveSlide((current) =>
                          current === 0 ? HERO_SLIDES.length - 1 : current - 1
                        )
                      }
                      aria-label="Previous slide"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-[#0b1739] transition hover:bg-white"
                      onClick={() =>
                        setActiveSlide((current) => (current + 1) % HERO_SLIDES.length)
                      }
                      aria-label="Next slide"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              <Card className="absolute bottom-6 left-6 z-10 max-w-[300px] border-white/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] backdrop-blur-none">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#2954C8]">
                      <CurrentAccentIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0b1739]">{currentHeroSlide.accentTitle}</p>
                      <p className="text-sm leading-6 text-slate-600">{currentHeroSlide.accentText}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="absolute right-6 top-6 z-10 max-w-[260px] border-white/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur-none">
                <CardContent className="flex items-center gap-3 p-4">
                  <Star className="h-5 w-5 text-[#f6c343]" />
                  <div>
                      <p className="text-sm font-semibold text-[#0b1739]">{currentHeroSlide.statLabel}</p>
                    <p className="text-xs leading-5 text-slate-600">{currentHeroSlide.statValue}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-4 flex items-center justify-center gap-2">
                {HERO_SLIDES.map((slide, index) => (
                  <button
                    key={slide.statLabel}
                    type="button"
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeSlide ? 'w-8 bg-white' : 'w-2.5 bg-white/45 hover:bg-white/70'
                    }`}
                    onClick={() => setActiveSlide(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="secondary">Why shop with Barbaza MPC</Badge>
            <h2 className="mt-3 text-3xl font-bold text-[#0b1739]">A marketplace built for members, families, and the wider community.</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-500">
            Barbaza MPC brings cooperative products closer to the community through a trusted online marketplace that supports local producers, fair trade, and shared economic growth.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {VALUE_PILLARS.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="bg-white/95">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#2954C8]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-[#0b1739]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-500">{item.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="surface-card overflow-hidden p-6 sm:p-8">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="secondary">Featured catalog</Badge>
              <h2 className="mt-3 text-3xl font-bold text-[#0b1739]">Popular picks from the cooperative marketplace</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                Freshly surfaced products now use the same premium card language, spacing, and CTAs across the storefront.
              </p>
            </div>
            <Link to="/products">
              <Button variant="outline" className="gap-2">
                View full marketplace
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`featured-skeleton-${index}`}
                  className="h-[420px] rounded-[30px] border border-[#e5edf8] bg-[#f5f8fe] animate-pulse"
                />
              ))}
            </div>
          ) : productsError ? (
            <Card className="border-rose-200 bg-rose-50 text-rose-700">
              <CardContent className="p-6">{productsError}</CardContent>
            </Card>
          ) : featuredProducts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-slate-500">No products available yet.</CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} onAddToCart={handleQuickAdd} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <Card className="overflow-hidden bg-gradient-to-r from-[#0b1739] via-[#1b44b7] to-[#2ea7ff] text-white">
          <CardContent className="flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <Badge className="bg-white/12 text-white">Barbaza MPC community marketplace</Badge>
              <h2 className="mt-4 text-3xl font-bold">Supporting local products, cooperative values, and shared community progress.</h2>
              <p className="mt-3 text-sm leading-7 text-white/75">
                Barbaza MPC connects members, families, and local producers through one marketplace that helps promote trusted products and strengthen the cooperative mission.
              </p>
            </div>
            <Link to="/admin">
              <Button size="lg" className="bg-white text-[#0b1739] shadow-none hover:bg-[#eef5ff]">
                Learn more
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default HomePage;
