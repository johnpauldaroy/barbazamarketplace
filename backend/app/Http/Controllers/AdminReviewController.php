<?php

namespace App\Http\Controllers;

use App\Models\ProductReview;
use App\Models\ProductReviewReport;
use Illuminate\Http\Request;

class AdminReviewController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:50',
            'search' => 'nullable|string|max:255',
            'product_id' => 'nullable|integer|exists:products,id',
            'store_id' => 'nullable|integer|exists:stores,id',
            'visibility' => 'nullable|string|in:all,hidden,visible',
            'reported' => 'nullable|string|in:all,reported,unreported',
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $perPage = (int) ($validated['per_page'] ?? 20);
        $productId = isset($validated['product_id']) ? (int) $validated['product_id'] : null;
        $storeId = isset($validated['store_id']) ? (int) $validated['store_id'] : null;
        $visibility = strtolower((string) ($validated['visibility'] ?? 'all'));
        $reported = strtolower((string) ($validated['reported'] ?? 'all'));

        $reviews = ProductReview::query()
            ->with([
                'product.store',
                'user',
                'hiddenByUser',
                'reports' => fn ($query) => $query->open()->with('reporter')->latest(),
            ])
            ->withCount([
                'reports',
                'reports as open_report_count' => fn ($query) => $query->open(),
            ])
            ->when($productId, fn ($query) => $query->where('product_id', $productId))
            ->when($storeId, fn ($query) => $query->whereHas('product', fn ($productQuery) => $productQuery->where('store_id', $storeId)))
            ->when($visibility === 'hidden', fn ($query) => $query->where('is_hidden', true))
            ->when($visibility === 'visible', fn ($query) => $query->where('is_hidden', false))
            ->when($reported === 'reported', fn ($query) => $query->whereHas('reports', fn ($reportQuery) => $reportQuery->open()))
            ->when($reported === 'unreported', fn ($query) => $query->whereDoesntHave('reports', fn ($reportQuery) => $reportQuery->open()))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($nestedQuery) use ($search) {
                    $nestedQuery
                        ->where('comment', 'like', "%{$search}%")
                        ->orWhereHas('product', fn ($productQuery) => $productQuery->where('title', 'like', "%{$search}%"))
                        ->orWhereHas('user', function ($userQuery) use ($search) {
                            $userQuery
                                ->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                });
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'reviews' => $reviews->getCollection()->map(
                fn (ProductReview $review) => $this->formatReview($review)
            )->values(),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
                'has_more_pages' => $reviews->hasMorePages(),
            ],
        ]);
    }

    public function updateVisibility(Request $request, int $id)
    {
        $payload = $request->validate([
            'is_hidden' => 'required|boolean',
            'hidden_reason' => 'nullable|string|max:255',
        ]);

        $review = ProductReview::query()->with(['product.store', 'user', 'reports.reporter'])->findOrFail($id);
        $isHidden = (bool) $payload['is_hidden'];

        $review->is_hidden = $isHidden;
        if ($isHidden) {
            $review->hidden_at = now();
            $review->hidden_by_user_id = $request->user()->id;
            $review->hidden_reason = $this->normalizeNullableString($payload['hidden_reason'] ?? null);
        } else {
            $review->hidden_at = null;
            $review->hidden_by_user_id = null;
            $review->hidden_reason = null;
        }

        $review->save();

        return response()->json([
            'message' => $isHidden ? 'Review hidden successfully.' : 'Review made visible successfully.',
            'review' => $this->formatReview($review->fresh([
                'product.store',
                'user',
                'hiddenByUser',
                'reports' => fn ($query) => $query->open()->with('reporter')->latest(),
            ])->loadCount([
                'reports',
                'reports as open_report_count' => fn ($query) => $query->open(),
            ])),
        ]);
    }

    public function updateReport(Request $request, int $id)
    {
        $payload = $request->validate([
            'status' => 'required|string|in:open,resolved',
        ]);

        $report = ProductReviewReport::query()
            ->with(['review.product.store', 'review.user', 'reporter', 'resolvedByUser'])
            ->findOrFail($id);

        $nextStatus = strtolower((string) $payload['status']);
        $report->status = $nextStatus;

        if ($nextStatus === ProductReviewReport::STATUS_RESOLVED) {
            $report->resolved_at = now();
            $report->resolved_by_user_id = $request->user()->id;
        } else {
            $report->resolved_at = null;
            $report->resolved_by_user_id = null;
        }

        $report->save();

        return response()->json([
            'message' => 'Report status updated.',
            'report' => $this->formatReport($report->fresh(['review.product.store', 'reporter', 'resolvedByUser'])),
        ]);
    }

    protected function formatReview(ProductReview $review): array
    {
        $product = $review->product;
        $store = $product?->store;
        $user = $review->user;

        return [
            'id' => $review->id,
            'product_id' => $review->product_id,
            'product' => $product ? [
                'id' => $product->id,
                'title' => $product->title,
                'store_id' => $product->store_id,
            ] : null,
            'store' => $store ? [
                'id' => $store->id,
                'name' => $store->name,
                'slug' => $store->slug,
            ] : null,
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ] : null,
            'rating' => (int) $review->rating,
            'comment' => $review->comment,
            'is_hidden' => (bool) $review->is_hidden,
            'hidden_at' => optional($review->hidden_at)->toISOString(),
            'hidden_reason' => $review->hidden_reason,
            'hidden_by_user' => $review->hiddenByUser ? [
                'id' => $review->hiddenByUser->id,
                'name' => $review->hiddenByUser->name,
            ] : null,
            'reports_count' => (int) ($review->reports_count ?? 0),
            'open_report_count' => (int) ($review->open_report_count ?? 0),
            'open_reports' => $review->reports->map(fn (ProductReviewReport $report) => $this->formatReport($report))->values(),
            'created_at' => optional($review->created_at)->toISOString(),
            'updated_at' => optional($review->updated_at)->toISOString(),
        ];
    }

    protected function formatReport(ProductReviewReport $report): array
    {
        return [
            'id' => $report->id,
            'review_id' => $report->review_id,
            'reporter' => $report->reporter ? [
                'id' => $report->reporter->id,
                'name' => $report->reporter->name,
                'email' => $report->reporter->email,
            ] : null,
            'reason' => $report->reason,
            'details' => $report->details,
            'status' => $report->status,
            'resolved_at' => optional($report->resolved_at)->toISOString(),
            'resolved_by_user' => $report->resolvedByUser ? [
                'id' => $report->resolvedByUser->id,
                'name' => $report->resolvedByUser->name,
            ] : null,
            'created_at' => optional($report->created_at)->toISOString(),
            'updated_at' => optional($report->updated_at)->toISOString(),
        ];
    }

    protected function normalizeNullableString($value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = trim((string) $value);
        return $normalized === '' ? null : $normalized;
    }
}
