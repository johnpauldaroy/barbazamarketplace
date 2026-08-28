import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {
  ChevronRight,
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Star,
  Store,
  Tag,
} from 'lucide-react';
import {
  deleteMyProductReview,
  fetchMyProductReview,
  fetchProductById,
  fetchProductReviews,
  reportProductReview,
  upsertProductReview,
} from '../api/EcommerceApi';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/use-toast';
import { buildCartItem, getAvailableQuantity, getDefaultVariant, getProductVariants, resolveProductImage } from '../lib/marketplace';

const defaultSummary = { average_rating: 0, ratings_count: 0, breakdown: [] };

const fmtDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const StarRow = ({ value = 0, interactive = false, onSelect = null, size = 'md' }) => {
  const cls = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const v = i + 1;
        return (
          <button
            key={v}
            type="button"
            disabled={!interactive}
            onClick={interactive ? () => onSelect?.(v) : undefined}
            className={`border-0 bg-transparent p-0 leading-none transition ${
              v <= value ? 'text-amber-400' : 'text-slate-200'
            } ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
            aria-label={interactive ? `Rate ${v}` : undefined}
          >
            <Star className={`${cls} ${v <= value ? 'fill-current' : ''}`} />
          </button>
        );
      })}
    </div>
  );
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addedToCart, setAddedToCart] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState(defaultSummary);
  const [reviewsMeta, setReviewsMeta] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');

  const [myReview, setMyReview] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [loadingMyReview, setLoadingMyReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [savingReview, setSavingReview] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);

  const [reportingId, setReportingId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchProductById(id);
      setProduct(data);
      setQuantity(1);
    } catch (e) {
      setError(e?.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsError('');
    try {
      const data = await fetchProductReviews(id, { page: 1, per_page: 10 });
      const r = Array.isArray(data?.reviews) ? data.reviews : [];
      const s = data?.summary || defaultSummary;
      setReviews(r);
      setReviewSummary({ ...defaultSummary, ...s, breakdown: Array.isArray(s?.breakdown) ? s.breakdown : [] });
      setReviewsMeta(data?.meta || null);
    } catch (e) {
      setReviewsError(e?.message || 'Failed to load reviews');
      setReviewSummary(defaultSummary);
    } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  const loadMyReview = useCallback(async () => {
    if (!isAuthenticated) { setMyReview(null); setCanReview(false); return; }
    setLoadingMyReview(true);
    try {
      const data = await fetchMyProductReview(id);
      const own = data?.review || null;
      setMyReview(own);
      setCanReview(Boolean(data?.can_review));
      setReviewForm({ rating: Number(own?.rating || 0), comment: own?.comment || '' });
    } catch {
      setMyReview(null);
      setCanReview(false);
    } finally {
      setLoadingMyReview(false);
    }
  }, [id, isAuthenticated]);

  useEffect(() => { loadProduct(); }, [loadProduct]);
  useEffect(() => { loadReviews(); }, [loadReviews]);
  useEffect(() => { loadMyReview(); }, [loadMyReview, user?.id]);

  const variants = useMemo(
    () => getProductVariants(product).filter((variant) => variant.is_active !== false),
    [product]
  );

  const selectedVariant = useMemo(() => {
    if (!product) return null;
    return variants.find((variant) => variant.id === selectedVariantId) || getDefaultVariant(product);
  }, [product, variants, selectedVariantId]);

  const availableQuantity = useMemo(
    () => getAvailableQuantity(product, selectedVariant),
    [product, selectedVariant]
  );

  // Switching unit changes how many are purchasable, so clamp the quantity.
  useEffect(() => {
    setQuantity((current) => Math.min(Math.max(1, current), Math.max(1, availableQuantity)));
  }, [availableQuantity]);

  const summaryRating = useMemo(() => Number(reviewSummary?.average_rating || product?.review_summary?.average_rating || 0), [reviewSummary, product]);
  const summaryCount  = useMemo(() => Number(reviewSummary?.ratings_count  || product?.review_summary?.ratings_count  || 0), [reviewSummary, product]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAddingToCart(true);
    try {
      const { product: cp, variant } = buildCartItem(product, selectedVariant);
      await addToCart(cp, variant, quantity, availableQuantity);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2500);
    } catch (e) {
      toast({ title: 'Unable to add item', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setAddingToCart(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (reviewForm.rating < 1) {
      toast({ title: 'Rating required', description: 'Select 1–5 stars.', variant: 'destructive' });
      return;
    }
    setSavingReview(true);
    try {
      const res = await upsertProductReview(id, { rating: reviewForm.rating, comment: reviewForm.comment });
      if (res?.review) setMyReview(res.review);
      if (res?.summary) setReviewSummary({ ...defaultSummary, ...res.summary, breakdown: Array.isArray(res.summary?.breakdown) ? res.summary.breakdown : [] });
      toast({ title: myReview ? 'Review updated' : 'Review submitted', variant: 'success' });
      await loadReviews();
      await loadMyReview();
    } catch (e) {
      toast({ title: 'Could not save review', description: e?.message, variant: 'destructive' });
    } finally {
      setSavingReview(false);
    }
  };

  const handleReviewDelete = async () => {
    if (!myReview) return;
    setDeletingReview(true);
    try {
      const res = await deleteMyProductReview(id);
      setMyReview(null);
      setReviewForm({ rating: 0, comment: '' });
      if (res?.summary) setReviewSummary({ ...defaultSummary, ...res.summary, breakdown: Array.isArray(res.summary?.breakdown) ? res.summary.breakdown : [] });
      toast({ title: 'Review deleted', variant: 'success' });
      await loadReviews();
      await loadMyReview();
    } catch (e) {
      toast({ title: 'Could not delete review', description: e?.message, variant: 'destructive' });
    } finally {
      setDeletingReview(false);
    }
  };

  const handleReport = async (reviewId) => {
    if (!reportReason.trim()) {
      toast({ title: 'Reason required', variant: 'destructive' });
      return;
    }
    setReporting(true);
    try {
      await reportProductReview(reviewId, { reason: reportReason.trim(), details: reportDetails.trim() || undefined });
      toast({ title: 'Review reported', variant: 'success' });
      setReportingId(null);
      setReportReason('');
      setReportDetails('');
    } catch (e) {
      toast({ title: 'Could not report review', description: e?.message, variant: 'destructive' });
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="section flex min-h-[50vh] items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#2954C8]" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="section py-16 text-center">
        <p className="text-lg font-semibold text-[#0b1739]">{error || 'Product not found'}</p>
        <Link to="/products" className="mt-4 inline-block rounded-lg bg-[#2954C8] px-5 py-2.5 text-sm font-semibold text-white">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  // What the shopper can actually buy of the selected unit.
  const stock = availableQuantity;
  const imageUrl = resolveProductImage(product.image_url || product.image);

  return (
    <>
      <Helmet>
        <title>{product.title || product.name} — e-KoopMart</title>
        <meta name="description" content={product.description ? `${String(product.description).substring(0, 155)}...` : `Buy ${product.title || product.name} from ${product.store?.name || 'a Barbaza MPC cooperative member store'} on e-KoopMart.`} />
        <link rel="canonical" href={`https://ekoopmart.barbazampc.coop/product/${product.id}`} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={`${product.title || product.name} — e-KoopMart`} />
        <meta property="og:description" content={`Buy ${product.title || product.name} from ${product.store?.name || 'a Barbaza MPC member store'}.`} />
        <meta property="og:url" content={`https://ekoopmart.barbazampc.coop/product/${product.id}`} />
        {imageUrl && <meta property="og:image" content={imageUrl} />}
        <meta property="og:site_name" content="e-KoopMart" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.title || product.name} — e-KoopMart`} />
        {imageUrl && <meta name="twitter:image" content={imageUrl} />}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.title || product.name,
          "description": product.description || undefined,
          "image": imageUrl || undefined,
          "sku": String(product.id),
          "brand": { "@type": "Brand", "name": product.store?.name || "Barbaza MPC" },
          "offers": {
            "@type": "Offer",
            "priceCurrency": "PHP",
            "price": product.price,
            "availability": Number(product.stock) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": { "@type": "Organization", "name": product.store?.name || "Barbaza MPC" }
          },
          ...(product.review_summary?.ratings_count > 0 && {
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": product.review_summary.average_rating,
              "reviewCount": product.review_summary.ratings_count
            }
          })
        })}</script>
      </Helmet>

      {/* Breadcrumb */}
      <div className="border-b border-[#dfe7f4] bg-white">
        <div className="section py-4">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400">
            <Link to="/" className="hover:text-[#2954C8]">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/products" className="hover:text-[#2954C8]">Marketplace</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-slate-600 clamp-1">{product.title || product.name}</span>
          </nav>
        </div>
      </div>

      <div className="section py-8">
        {/* Product section */}
        <div className="grid gap-8 lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_520px]">
          {/* Image */}
          <div className="overflow-hidden rounded-xl border border-[#dfe7f4] bg-[#f4f7fd]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.title || product.name}
                className="h-full max-h-[520px] w-full object-contain p-4"
              />
            ) : (
              <div className="flex min-h-[340px] items-center justify-center text-slate-400">
                <Package className="h-12 w-12 opacity-40" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-5">
            <div>
              {product.category && (
                <span className="badge-blue mb-2 inline-flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {product.category}
                </span>
              )}
              <h1 className="text-2xl font-bold text-[#0b1739] sm:text-3xl">
                {product.title || product.name}
              </h1>
              {product?.store && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                  <Store className="h-4 w-4" />
                  {product?.store?.slug ? (
                    <Link to={`/stores/${product.store.slug}`} className="font-medium text-[#2954C8] hover:underline">
                      {product.store.name}
                    </Link>
                  ) : (
                    <span>{product?.store?.name || 'Platform Store'}</span>
                  )}
                </div>
              )}
            </div>

            {/* Rating */}
            {summaryCount > 0 && (
              <div className="flex items-center gap-2">
                <StarRow value={Math.round(summaryRating)} />
                <span className="text-sm text-slate-500">
                  {summaryRating.toFixed(1)} ({summaryCount} {summaryCount === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}

            {/* Price */}
            <div className="rounded-xl border border-[#dfe7f4] bg-white p-5">
              <p className="text-3xl font-extrabold text-[#0b1739]">
                PHP {Number(selectedVariant?.price ?? product.price ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className={`mt-1.5 text-sm font-medium ${stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {stock > 0 ? `In stock · ${stock} available` : 'Out of stock'}
              </p>
            </div>

            {/* Unit / packaging picker */}
            {variants.length > 1 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-[#0b1739]">Choose an option</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((variant) => {
                    const isSelected = selectedVariant?.id === variant.id;
                    const soldOut = Number(variant.available_quantity || 0) <= 0;

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariantId(variant.id)}
                        disabled={soldOut}
                        aria-pressed={isSelected}
                        className={`rounded-lg border px-4 py-2.5 text-left transition ${
                          isSelected
                            ? 'border-[#2954C8] bg-[#eef3fb] ring-1 ring-[#2954C8]'
                            : 'border-[#dfe7f4] bg-white hover:border-[#2954C8]'
                        } ${soldOut ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        <span className="block text-sm font-semibold text-[#0b1739]">{variant.name}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {soldOut
                            ? 'Sold out'
                            : `PHP ${Number(variant.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedVariant && product.base_unit && Number(selectedVariant.base_unit_quantity) !== 1 && (
                  <p className="mt-2 text-xs text-slate-500">
                    1 {selectedVariant.name} = {Number(selectedVariant.base_unit_quantity)} {product.base_unit.code}
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <p className="text-sm leading-relaxed text-slate-600">{product.description}</p>
            )}

            {/* Qty + Add to Cart */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center overflow-hidden rounded-lg border border-[#dfe7f4] bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="flex h-11 w-11 items-center justify-center text-slate-600 transition hover:bg-[#f4f7fd] disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[44px] text-center text-sm font-semibold text-[#0b1739]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                  disabled={quantity >= stock}
                  className="flex h-11 w-11 items-center justify-center text-slate-600 transition hover:bg-[#f4f7fd] disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={stock === 0 || addedToCart || addingToCart}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed ${
                  addedToCart
                    ? 'bg-green-600'
                    : 'bg-[#2954C8] hover:bg-[#1f44a5] disabled:bg-slate-300'
                }`}
              >
                {addingToCart ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                {addedToCart ? 'Added to cart!' : addingToCart ? 'Adding...' : 'Add to cart'}
              </button>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-10 grid gap-6 xl:grid-cols-[1fr_360px]">
          {/* Reviews list */}
          <div className="rounded-xl border border-[#dfe7f4] bg-white p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-[#0b1739]">
                Ratings &amp; Reviews
                {summaryCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-slate-400">
                    ({summaryCount})
                  </span>
                )}
              </h2>
              {summaryCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-[#0b1739]">{summaryRating.toFixed(1)}</span>
                  <StarRow value={Math.round(summaryRating)} size="sm" />
                </div>
              )}
            </div>

            {/* Rating breakdown */}
            {reviewSummary.breakdown?.length > 0 && (
              <div className="mb-5 space-y-2 sm:max-w-sm">
                {reviewSummary.breakdown.map((row) => {
                  const pct = summaryCount > 0 ? Math.round((Number(row?.count || 0) / summaryCount) * 100) : 0;
                  return (
                    <div key={row.rating} className="grid grid-cols-[40px_1fr_36px] items-center gap-2 text-xs text-slate-500">
                      <span>{row.rating}★</span>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-[#2954C8]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-right">{row.count}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {reviewsLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading reviews...
              </div>
            ) : reviewsError ? (
              <p className="text-sm text-red-500">{reviewsError}</p>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-slate-400">No reviews yet. Be the first to review!</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => {
                  const isOwn = myReview?.id === review.id;
                  return (
                    <article key={review.id} className="rounded-lg border border-[#dfe7f4] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[#0b1739]">
                            {review.reviewer_name || 'Verified Buyer'}
                          </p>
                          <p className="text-xs text-slate-400">{fmtDate(review.created_at)}</p>
                        </div>
                        <StarRow value={Number(review.rating || 0)} size="sm" />
                      </div>
                      {review.comment?.trim() && (
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                          {review.comment.trim()}
                        </p>
                      )}
                      {isAuthenticated && !isOwn && (
                        <div className="mt-3 border-t border-[#f0f4fc] pt-2">
                          {reportingId !== review.id ? (
                            <button
                              type="button"
                              onClick={() => { setReportingId(review.id); setReportReason(''); setReportDetails(''); }}
                              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                            >
                              Report
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                placeholder="Reason (required)"
                                className="h-9 w-full rounded-lg border border-[#dfe7f4] px-3 text-sm outline-none focus:border-[#2954C8]"
                              />
                              <textarea
                                value={reportDetails}
                                onChange={(e) => setReportDetails(e.target.value)}
                                placeholder="Details (optional)"
                                rows={2}
                                className="w-full rounded-lg border border-[#dfe7f4] px-3 py-2 text-sm outline-none focus:border-[#2954C8]"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleReport(review.id)}
                                  disabled={reporting}
                                  className="rounded-lg bg-[#2954C8] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                                >
                                  {reporting ? 'Submitting...' : 'Submit'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReportingId(null)}
                                  className="rounded-lg border border-[#dfe7f4] px-3 py-1.5 text-xs font-semibold text-slate-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
                {reviewsMeta?.total > reviews.length && (
                  <p className="text-xs text-slate-400">
                    Showing {reviews.length} of {reviewsMeta.total} reviews
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Write a review */}
          <aside className="h-fit rounded-xl border border-[#dfe7f4] bg-white p-6">
            <h3 className="mb-4 text-base font-bold text-[#0b1739]">Write a review</h3>
            {!isAuthenticated ? (
              <p className="text-sm text-slate-500">
                <Link to="/login" className="font-semibold text-[#2954C8] hover:underline">Sign in</Link>
                {' '}to review after a delivered purchase.
              </p>
            ) : loadingMyReview ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking eligibility...
              </div>
            ) : !canReview ? (
              <p className="text-sm text-slate-500">Available after a delivered purchase.</p>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Your rating *
                  </p>
                  <StarRow
                    value={reviewForm.rating}
                    interactive
                    onSelect={(r) => setReviewForm((f) => ({ ...f, rating: r }))}
                  />
                </div>
                <div>
                  <label htmlFor="review-comment" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Comment (optional)
                  </label>
                  <textarea
                    id="review-comment"
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                    rows={4}
                    maxLength={2000}
                    placeholder="Share your experience..."
                    className="w-full rounded-lg border border-[#dfe7f4] px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#2954C8] focus:ring-2 focus:ring-[#2954C8]/10"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingReview}
                  className="w-full rounded-lg bg-[#2954C8] py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f44a5] disabled:opacity-60"
                >
                  {savingReview ? 'Saving...' : myReview ? 'Update review' : 'Submit review'}
                </button>
                {myReview && (
                  <button
                    type="button"
                    onClick={handleReviewDelete}
                    disabled={deletingReview}
                    className="w-full rounded-lg border border-red-200 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    {deletingReview ? 'Deleting...' : 'Delete my review'}
                  </button>
                )}
              </form>
            )}
          </aside>
        </div>
      </div>
    </>
  );
};

export default ProductDetailPage;
