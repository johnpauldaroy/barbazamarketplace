import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
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
import { buildSimpleCartItem, resolveProductImage } from '../lib/marketplace';

const defaultSummary = {
  average_rating: 0,
  ratings_count: 0,
  breakdown: [],
};

const formatReviewDate = (value) => {
  if (!value) return 'Unknown date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const StarRow = ({ value = 0, interactive = false, onSelect = null }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: 5 }).map((_, index) => {
      const starValue = index + 1;
      return (
        <button
          key={`star-${starValue}`}
          type="button"
          onClick={interactive ? () => onSelect?.(starValue) : undefined}
          className={`border-0 bg-transparent p-0 text-lg leading-none transition disabled:opacity-100 ${starValue <= value ? 'text-amber-400' : 'text-slate-300'} ${
            interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
          }`}
          aria-label={interactive ? `Set rating to ${starValue}` : undefined}
          disabled={!interactive}
        >
          ★
        </button>
      );
    })}
  </div>
);

const ProductDetailPage = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addedToCart, setAddedToCart] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState(defaultSummary);
  const [reviewsMeta, setReviewsMeta] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');

  const [myReview, setMyReview] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [loadingMyReview, setLoadingMyReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: '',
  });
  const [savingReview, setSavingReview] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);

  const [reportingReviewId, setReportingReviewId] = useState(null);
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
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load product');
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsError('');
    try {
      const data = await fetchProductReviews(id, { page: 1, per_page: 10 });
      const nextReviews = Array.isArray(data?.reviews) ? data.reviews : [];
      const nextSummary = data?.summary || defaultSummary;
      setReviews(nextReviews);
      setReviewSummary({
        ...defaultSummary,
        ...nextSummary,
        breakdown: Array.isArray(nextSummary?.breakdown) ? nextSummary.breakdown : [],
      });
      setReviewsMeta(data?.meta || null);
    } catch (loadError) {
      setReviews([]);
      setReviewsMeta(null);
      setReviewsError(loadError?.message || 'Failed to load reviews');
      setReviewSummary(defaultSummary);
    } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  const loadMyReview = useCallback(async () => {
    if (!isAuthenticated) {
      setMyReview(null);
      setCanReview(false);
      setReviewForm({ rating: 0, comment: '' });
      return;
    }

    setLoadingMyReview(true);
    try {
      const data = await fetchMyProductReview(id);
      const ownReview = data?.review || null;
      setMyReview(ownReview);
      setCanReview(Boolean(data?.can_review));
      setReviewForm({
        rating: Number(ownReview?.rating || 0),
        comment: ownReview?.comment || '',
      });
    } catch (_) {
      setMyReview(null);
      setCanReview(false);
      setReviewForm({ rating: 0, comment: '' });
    } finally {
      setLoadingMyReview(false);
    }
  }, [id, isAuthenticated]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    loadMyReview();
  }, [loadMyReview, user?.id]);

  const summaryRating = useMemo(() => {
    const fallback = Number(product?.review_summary?.average_rating || 0);
    return Number(reviewSummary?.average_rating || fallback);
  }, [product?.review_summary?.average_rating, reviewSummary?.average_rating]);

  const summaryCount = useMemo(() => {
    const fallback = Number(product?.review_summary?.ratings_count || 0);
    return Number(reviewSummary?.ratings_count || fallback);
  }, [product?.review_summary?.ratings_count, reviewSummary?.ratings_count]);

  const handleAddToCart = () => {
    if (!product) return;

    const stockValue = Number(product.stock || 0);
    const { product: cartProduct, variant } = buildSimpleCartItem(product);

    addToCart(cartProduct, variant, quantity, stockValue)
      .then(() => {
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
      })
      .catch((cartError) => {
        toast({
          title: 'Unable to add item',
          description: cartError?.message || 'Please try again.',
          variant: 'destructive',
        });
      });
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (reviewForm.rating < 1 || reviewForm.rating > 5) {
      toast({
        title: 'Rating required',
        description: 'Please select a rating between 1 and 5 stars.',
        variant: 'destructive',
      });
      return;
    }

    setSavingReview(true);
    try {
      const response = await upsertProductReview(id, {
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
      const savedReview = response?.review || null;
      if (savedReview) {
        setMyReview(savedReview);
      }
      if (response?.summary) {
        setReviewSummary({
          ...defaultSummary,
          ...response.summary,
          breakdown: Array.isArray(response.summary?.breakdown) ? response.summary.breakdown : [],
        });
      }

      toast({
        title: myReview ? 'Review updated' : 'Review added',
        description: 'Your product review has been saved.',
        variant: 'success',
      });
      await loadReviews();
      await loadMyReview();
    } catch (submitError) {
      toast({
        title: 'Unable to save review',
        description: submitError?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingReview(false);
    }
  };

  const handleReviewDelete = async () => {
    if (!myReview) return;
    setDeletingReview(true);
    try {
      const response = await deleteMyProductReview(id);
      setMyReview(null);
      setReviewForm({ rating: 0, comment: '' });
      if (response?.summary) {
        setReviewSummary({
          ...defaultSummary,
          ...response.summary,
          breakdown: Array.isArray(response.summary?.breakdown) ? response.summary.breakdown : [],
        });
      }

      toast({
        title: 'Review deleted',
        description: 'Your review has been removed.',
        variant: 'success',
      });
      await loadReviews();
      await loadMyReview();
    } catch (deleteError) {
      toast({
        title: 'Unable to delete review',
        description: deleteError?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingReview(false);
    }
  };

  const handleSubmitReport = async (reviewId) => {
    const reason = reportReason.trim();
    const details = reportDetails.trim();
    if (reason === '') {
      toast({
        title: 'Reason required',
        description: 'Please provide a report reason.',
        variant: 'destructive',
      });
      return;
    }

    setReporting(true);
    try {
      await reportProductReview(reviewId, { reason, details: details || undefined });
      toast({
        title: 'Review reported',
        description: 'Thanks. This review has been flagged for admin moderation.',
        variant: 'success',
      });
      setReportingReviewId(null);
      setReportReason('');
      setReportDetails('');
    } catch (reportError) {
      toast({
        title: 'Unable to report review',
        description: reportError?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[45vh] max-w-6xl items-center justify-center px-4 py-10 text-slate-500">
        Loading product details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[#0b1739]">Unable to load product</h1>
        <p className="mt-3 text-slate-500">{error}</p>
        <Link to="/products" className="mt-6 inline-block rounded-lg bg-[#2954C8] px-4 py-2 text-white">
          Back to Products
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[#0b1739]">Product not found</h1>
        <Link to="/products" className="mt-6 inline-block rounded-lg bg-[#2954C8] px-4 py-2 text-white">
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Helmet>
        <title>{product.title || product.name} - Barbaza MPC Marketplace</title>
      </Helmet>

      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link to="/" className="hover:text-[#2954C8]">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-[#2954C8]">Products</Link>
        <span>/</span>
        <span className="font-medium text-[#0b1739]">{product.title || product.name}</span>
      </nav>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-[#e3eaf6] bg-[#f6f9ff]">
          {product.image_url || product.image ? (
            <img
              src={resolveProductImage(product.image_url || product.image)}
              alt={product.title || product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex min-h-[380px] items-center justify-center text-slate-400">
              No image available
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <span className="inline-flex rounded-full bg-[#2954C8] px-3 py-1 text-xs font-medium text-white">
              {product.category || 'General'}
            </span>
            <h1 className="mt-3 text-3xl font-bold text-[#0b1739]">{product.title || product.name}</h1>
          </div>

          <div className="rounded-xl border border-[#e3eaf6] bg-white p-4">
            <p className="text-3xl font-bold text-[#2954C8]">PHP {Number(product.price || 0).toFixed(2)}</p>
            <div className="mt-3 flex items-center gap-3">
              <StarRow value={Math.round(summaryRating)} />
              <p className="text-sm text-slate-600">
                {summaryCount > 0 ? `${summaryRating.toFixed(1)} (${summaryCount} reviews)` : 'No reviews yet'}
              </p>
            </div>
            <p className={`mt-3 text-sm ${Number(product.stock || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {Number(product.stock || 0) > 0 ? `In stock (${product.stock} available)` : 'Out of stock'}
            </p>
          </div>

          <p className="text-slate-600">{product.description || 'No description provided.'}</p>

          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center overflow-hidden rounded-lg border border-[#d7e2f1] bg-white">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1}
                className="h-11 w-11 text-lg text-slate-600 disabled:opacity-40"
              >
                -
              </button>
              <span className="inline-flex min-w-[44px] justify-center px-2 font-semibold text-[#0b1739]">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(Number(product.stock || 0), value + 1))}
                disabled={quantity >= Number(product.stock || 0)}
                className="h-11 w-11 text-lg text-slate-600 disabled:opacity-40"
              >
                +
              </button>
            </div>

            <button
              type="button"
              className={`rounded-lg px-5 py-3 font-semibold text-white ${
                addedToCart ? 'bg-emerald-600' : 'bg-[#2954C8] hover:bg-[#1f44a5]'
              } disabled:cursor-not-allowed disabled:opacity-50`}
              onClick={handleAddToCart}
              disabled={Number(product.stock || 0) === 0 || addedToCart}
            >
              {addedToCart ? 'Added to Cart!' : 'Add to Cart'}
            </button>
          </div>

          <div className="space-y-2 border-t border-[#e3eaf6] pt-4 text-sm text-slate-600">
            <p>
              Category: <span className="font-medium text-[#0b1739]">{product.category || 'General'}</span>
            </p>
            <p>
              Store:{' '}
              {product?.store?.slug ? (
                <Link to={`/stores/${product.store.slug}`} className="font-medium text-[#2954C8] hover:underline">
                  {product.store?.name || 'Platform Store'}
                </Link>
              ) : (
                <span className="font-medium text-[#0b1739]">{product?.store?.name || 'Platform Store'}</span>
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5 rounded-2xl border border-[#e3eaf6] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-[#0b1739]">Ratings and Reviews</h2>
            <p className="text-sm text-slate-500">
              {summaryCount > 0 ? `${summaryRating.toFixed(1)} average from ${summaryCount} reviews` : 'No reviews yet'}
            </p>
          </div>

          {reviewSummary.breakdown?.length > 0 ? (
            <div className="grid gap-2 sm:max-w-md">
              {reviewSummary.breakdown.map((row) => {
                const count = Number(row?.count || 0);
                const percent = summaryCount > 0 ? Math.round((count / summaryCount) * 100) : 0;
                return (
                  <div key={`breakdown-${row.rating}`} className="grid grid-cols-[48px_minmax(0,1fr)_42px] items-center gap-2 text-sm text-slate-600">
                    <span>{row.rating}★</span>
                    <div className="h-2 rounded bg-slate-100">
                      <div className="h-2 rounded bg-[#2954C8]" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          ) : null}

          {reviewsLoading ? (
            <p className="text-sm text-slate-500">Loading reviews...</p>
          ) : reviewsError ? (
            <p className="text-sm text-rose-600">{reviewsError}</p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-slate-500">No published reviews for this product yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const isOwnReview = myReview?.id === review.id;
                return (
                  <article key={review.id} className="rounded-xl border border-[#e3eaf6] bg-[#fcfdff] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#0b1739]">{review.reviewer_name || 'Verified Buyer'}</p>
                        <p className="text-xs text-slate-500">{formatReviewDate(review.created_at)}</p>
                      </div>
                      <StarRow value={Number(review.rating || 0)} />
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                      {review.comment?.trim() || 'No written comment provided.'}
                    </p>

                    {isAuthenticated && !isOwnReview ? (
                      <div className="mt-4 border-t border-[#e9eff9] pt-3">
                        {reportingReviewId !== review.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              setReportingReviewId(review.id);
                              setReportReason('');
                              setReportDetails('');
                            }}
                            className="text-xs font-semibold text-[#2954C8] hover:underline"
                          >
                            Report review
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={reportReason}
                              onChange={(event) => setReportReason(event.target.value)}
                              placeholder="Reason (required)"
                              className="h-10 w-full rounded-lg border border-[#d7e2f1] px-3 text-sm outline-none focus:border-[#2954C8]"
                            />
                            <textarea
                              value={reportDetails}
                              onChange={(event) => setReportDetails(event.target.value)}
                              placeholder="Details (optional)"
                              rows={2}
                              className="w-full rounded-lg border border-[#d7e2f1] px-3 py-2 text-sm outline-none focus:border-[#2954C8]"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSubmitReport(review.id)}
                                disabled={reporting}
                                className="rounded-md bg-[#2954C8] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                              >
                                {reporting ? 'Submitting...' : 'Submit report'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setReportingReviewId(null)}
                                className="rounded-md border border-[#d7e2f1] px-3 py-2 text-xs font-semibold text-slate-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
              {reviewsMeta?.total > reviews.length ? (
                <p className="text-xs text-slate-500">
                  Showing {reviews.length} of {reviewsMeta.total} reviews.
                </p>
              ) : null}
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-[#e3eaf6] bg-white p-5 sm:p-6">
          <h3 className="text-xl font-bold text-[#0b1739]">Your Review</h3>

          {!isAuthenticated ? (
            <p className="mt-3 text-sm text-slate-500">
              <Link to="/login" className="font-semibold text-[#2954C8] hover:underline">
                Sign in
              </Link>{' '}
              to review this product after a delivered purchase.
            </p>
          ) : loadingMyReview ? (
            <p className="mt-3 text-sm text-slate-500">Checking review eligibility...</p>
          ) : !canReview ? (
            <p className="mt-3 text-sm text-slate-500">Available after delivered purchase.</p>
          ) : (
            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-[#0b1739]">Rating *</p>
                <StarRow
                  value={reviewForm.rating}
                  interactive
                  onSelect={(rating) => setReviewForm((current) => ({ ...current, rating }))}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#0b1739]" htmlFor="review-comment">
                  Comment (optional)
                </label>
                <textarea
                  id="review-comment"
                  value={reviewForm.comment}
                  onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
                  rows={4}
                  maxLength={2000}
                  placeholder="Share your experience with this product."
                  className="w-full rounded-lg border border-[#d7e2f1] px-3 py-2 text-sm outline-none focus:border-[#2954C8]"
                />
              </div>

              <button
                type="submit"
                disabled={savingReview}
                className="w-full rounded-lg bg-[#2954C8] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingReview ? 'Saving...' : myReview ? 'Update review' : 'Submit review'}
              </button>

              {myReview ? (
                <button
                  type="button"
                  onClick={handleReviewDelete}
                  disabled={deletingReview}
                  className="w-full rounded-lg border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600 disabled:opacity-60"
                >
                  {deletingReview ? 'Deleting...' : 'Delete my review'}
                </button>
              ) : null}
            </form>
          )}
        </aside>
      </section>
    </div>
  );
};

export default ProductDetailPage;
