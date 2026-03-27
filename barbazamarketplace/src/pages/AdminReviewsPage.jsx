import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Eye, EyeOff, Filter, RefreshCw, Search } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/use-toast';
import {
  fetchAdminReviews,
  updateAdminReviewReportStatus,
  updateAdminReviewVisibility,
} from '../api/EcommerceApi';

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const AdminReviewsPage = () => {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [reported, setReported] = useState('all');
  const [productId, setProductId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [mutatingId, setMutatingId] = useState(null);
  const [mutatingReportId, setMutatingReportId] = useState(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadReviews = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const response = await fetchAdminReviews({
        page,
        per_page: 12,
        search: debouncedSearch || undefined,
        visibility,
        reported,
        product_id: productId || undefined,
        store_id: storeId || undefined,
      });
      setReviews(Array.isArray(response?.reviews) ? response.reviews : []);
      setMeta(response?.meta || null);
    } catch (loadError) {
      setReviews([]);
      setMeta(null);
      setError(loadError?.message || 'Unable to load reviews.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, page, productId, reported, storeId, visibility]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, visibility, reported, productId, storeId]);

  const totalLabel = useMemo(() => {
    const total = Number(meta?.total || 0);
    return total.toLocaleString('en-US');
  }, [meta?.total]);

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setVisibility('all');
    setReported('all');
    setProductId('');
    setStoreId('');
    setPage(1);
  };

  const handleToggleVisibility = async (review) => {
    if (!review?.id) return;

    const nextHidden = !review.is_hidden;
    let hiddenReason;
    if (nextHidden) {
      hiddenReason = window.prompt('Hide reason (optional):', review.hidden_reason || '');
      if (hiddenReason === null) return;
    }

    setMutatingId(review.id);
    try {
      const response = await updateAdminReviewVisibility(review.id, {
        is_hidden: nextHidden,
        hidden_reason: nextHidden ? (hiddenReason || undefined) : undefined,
      });
      const nextReview = response?.review;
      setReviews((current) =>
        current.map((item) => (item.id === review.id ? { ...item, ...nextReview } : item))
      );
      toast({
        title: nextHidden ? 'Review hidden' : 'Review visible',
        description: nextHidden
          ? 'The review has been hidden from public listings.'
          : 'The review is visible again.',
        variant: 'success',
      });
    } catch (mutationError) {
      toast({
        title: 'Visibility update failed',
        description: mutationError?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setMutatingId(null);
    }
  };

  const handleReportStatus = async (reportId, nextStatus) => {
    setMutatingReportId(reportId);
    try {
      await updateAdminReviewReportStatus(reportId, nextStatus);
      await loadReviews(true);
      toast({
        title: 'Report updated',
        description: `Report marked as ${nextStatus}.`,
        variant: 'success',
      });
    } catch (mutationError) {
      toast({
        title: 'Report update failed',
        description: mutationError?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setMutatingReportId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none bg-white/80 shadow-xl backdrop-blur-md">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">Review Moderation</CardTitle>
            <p className="text-sm text-slate-500">Manage product review visibility and resolve abuse reports.</p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => loadReviews(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="relative xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="pl-10"
                placeholder="Search review text, product, user..."
              />
            </div>

            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2954C8]"
            >
              <option value="all">All visibility</option>
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>

            <select
              value={reported}
              onChange={(event) => setReported(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2954C8]"
            >
              <option value="all">All reports</option>
              <option value="reported">With open reports</option>
              <option value="unreported">No open reports</option>
            </select>

            <Input
              value={productId}
              onChange={(event) => setProductId(event.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Product ID"
            />

            <Input
              value={storeId}
              onChange={(event) => setStoreId(event.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Store ID"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={clearFilters}>
              <Filter className="h-4 w-4" />
              Reset filters
            </Button>
            <p className="text-sm text-slate-500">
              Showing {reviews.length} of {totalLabel} reviews
            </p>
          </div>

          {loading ? (
            <div className="rounded-xl border border-[#ECF1FA] bg-slate-50 px-4 py-10 text-center text-slate-500">
              Loading reviews...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">
              {error}
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-xl border border-[#ECF1FA] bg-slate-50 px-4 py-10 text-center text-slate-500">
              No reviews found for the selected filters.
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <article key={review.id} className="rounded-2xl border border-[#ECF1FA] bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">
                        Product #{review?.product?.id}: {review?.product?.title || 'Untitled Product'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Store: {review?.store?.name || 'N/A'} | Reviewer: {review?.user?.name || 'N/A'} ({review?.user?.email || 'no-email'})
                      </p>
                      <p className="text-xs text-slate-500">
                        Created: {formatDateTime(review.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{review.rating} / 5</Badge>
                      {review.is_hidden ? <Badge variant="destructive">Hidden</Badge> : <Badge variant="success">Visible</Badge>}
                      {Number(review.open_report_count || 0) > 0 ? (
                        <Badge variant="warning">{review.open_report_count} open reports</Badge>
                      ) : (
                        <Badge variant="outline">No open reports</Badge>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                    {review.comment?.trim() || 'No comment provided.'}
                  </p>

                  {review.is_hidden && review.hidden_reason ? (
                    <p className="mt-2 text-xs text-rose-600">
                      Hidden reason: {review.hidden_reason}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={review.is_hidden ? 'outline' : 'destructive'}
                      className="gap-2"
                      onClick={() => handleToggleVisibility(review)}
                      disabled={mutatingId === review.id}
                    >
                      {review.is_hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      {mutatingId === review.id
                        ? 'Updating...'
                        : review.is_hidden
                          ? 'Unhide review'
                          : 'Hide review'}
                    </Button>
                  </div>

                  {Array.isArray(review.open_reports) && review.open_reports.length > 0 ? (
                    <div className="mt-4 space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                        <AlertTriangle className="h-4 w-4" />
                        Open reports
                      </div>
                      {review.open_reports.map((report) => (
                        <div key={report.id} className="rounded-lg border border-amber-200 bg-white p-3 text-sm">
                          <p className="font-medium text-slate-800">
                            {report.reason}
                          </p>
                          {report.details ? (
                            <p className="mt-1 whitespace-pre-wrap text-slate-600">{report.details}</p>
                          ) : null}
                          <p className="mt-1 text-xs text-slate-500">
                            Reporter: {report?.reporter?.name || 'Unknown'} | Created: {formatDateTime(report.created_at)}
                          </p>
                          <div className="mt-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleReportStatus(report.id, 'resolved')}
                              disabled={mutatingReportId === report.id}
                            >
                              {mutatingReportId === report.id ? 'Resolving...' : 'Resolve report'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}

              <div className="flex items-center justify-between rounded-xl border border-[#ECF1FA] bg-slate-50 px-4 py-3 text-sm">
                <p className="text-slate-500">
                  Page {meta?.current_page || 1} of {meta?.last_page || 1}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={Number(meta?.current_page || 1) <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={!meta?.has_more_pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReviewsPage;
