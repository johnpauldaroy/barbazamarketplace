<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\ProductReviewReport;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductReviewController extends Controller
{
    public function index(Request $request, int $id)
    {
        $validated = $request->validate([
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:30',
        ]);

        $product = Product::query()->findOrFail($id);
        $perPage = (int) ($validated['per_page'] ?? 10);

        $reviews = ProductReview::query()
            ->with('user')
            ->visible()
            ->where('product_id', $product->id)
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'reviews' => $reviews->getCollection()
                ->map(fn (ProductReview $review) => $this->formatPublicReview($review))
                ->values(),
            'summary' => $this->buildSummary($product->id),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
                'has_more_pages' => $reviews->hasMorePages(),
            ],
        ]);
    }

    public function me(Request $request, int $id)
    {
        $product = Product::query()->findOrFail($id);
        $user = $request->user();
        $review = ProductReview::query()
            ->where('product_id', $product->id)
            ->where('user_id', $user->id)
            ->first();
        $canReview = $this->hasDeliveredPurchase($user->id, $product->id);

        return response()->json([
            'review' => $review ? $this->formatOwnReview($review) : null,
            'can_review' => $canReview,
            'is_verified_buyer' => $canReview,
        ]);
    }

    public function upsert(Request $request, int $id)
    {
        $product = Product::query()->findOrFail($id);
        $user = $request->user();

        if (!$this->hasDeliveredPurchase($user->id, $product->id)) {
            return response()->json([
                'message' => 'Reviews are available after you receive a delivered order for this product.',
            ], 403);
        }

        $payload = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:2000',
        ]);

        $review = ProductReview::query()->updateOrCreate(
            [
                'product_id' => $product->id,
                'user_id' => $user->id,
            ],
            [
                'rating' => (int) $payload['rating'],
                'comment' => $this->normalizeNullableString($payload['comment'] ?? null),
            ]
        );

        return response()->json([
            'message' => 'Review saved successfully.',
            'review' => $this->formatOwnReview($review->fresh()),
            'summary' => $this->buildSummary($product->id),
        ]);
    }

    public function destroyMine(Request $request, int $id)
    {
        $product = Product::query()->findOrFail($id);
        $user = $request->user();

        $review = ProductReview::query()
            ->where('product_id', $product->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$review) {
            return response()->json([
                'message' => 'Review not found for this product.',
            ], 404);
        }

        $review->delete();

        return response()->json([
            'message' => 'Review deleted successfully.',
            'summary' => $this->buildSummary($product->id),
        ]);
    }

    public function report(Request $request, int $reviewId)
    {
        $user = $request->user();
        $review = ProductReview::query()->with('product')->findOrFail($reviewId);

        if ((int) $review->user_id === (int) $user->id) {
            return response()->json([
                'message' => 'You cannot report your own review.',
            ], 422);
        }

        $payload = $request->validate([
            'reason' => 'required|string|max:120',
            'details' => 'nullable|string|max:1000',
        ]);

        $existingOpenReport = ProductReviewReport::query()
            ->where('review_id', $review->id)
            ->where('reporter_user_id', $user->id)
            ->open()
            ->first();

        if ($existingOpenReport) {
            return response()->json([
                'message' => 'You already have an active report for this review.',
                'report' => $this->formatReport($existingOpenReport),
            ]);
        }

        $report = ProductReviewReport::query()->create([
            'review_id' => $review->id,
            'reporter_user_id' => $user->id,
            'reason' => trim((string) $payload['reason']),
            'details' => $this->normalizeNullableString($payload['details'] ?? null),
            'status' => ProductReviewReport::STATUS_OPEN,
        ]);

        return response()->json([
            'message' => 'Review reported successfully.',
            'report' => $this->formatReport($report),
        ], 201);
    }

    protected function hasDeliveredPurchase(int $userId, int $productId): bool
    {
        return OrderItem::query()
            ->where('product_id', $productId)
            ->whereHas('order', function ($query) use ($userId) {
                $query
                    ->where('user_id', $userId)
                    ->where('status', 'delivered');
            })
            ->exists();
    }

    protected function buildSummary(int $productId): array
    {
        $query = ProductReview::query()
            ->visible()
            ->where('product_id', $productId);

        $ratingsCount = (int) $query->count();
        $averageRating = $ratingsCount > 0 ? round((float) $query->avg('rating'), 2) : 0;

        $breakdownCollection = ProductReview::query()
            ->visible()
            ->where('product_id', $productId)
            ->selectRaw('rating, COUNT(*) as aggregate_count')
            ->groupBy('rating')
            ->pluck('aggregate_count', 'rating');

        $breakdown = collect(range(5, 1))
            ->map(fn (int $rating) => [
                'rating' => $rating,
                'count' => (int) ($breakdownCollection[$rating] ?? 0),
            ])
            ->values();

        return [
            'average_rating' => $averageRating,
            'ratings_count' => $ratingsCount,
            'breakdown' => $breakdown,
        ];
    }

    protected function formatPublicReview(ProductReview $review): array
    {
        return [
            'id' => $review->id,
            'product_id' => $review->product_id,
            'rating' => (int) $review->rating,
            'comment' => $review->comment,
            'reviewer_name' => $this->maskReviewerName($review->user?->name),
            'is_hidden' => (bool) $review->is_hidden,
            'created_at' => optional($review->created_at)->toISOString(),
            'updated_at' => optional($review->updated_at)->toISOString(),
        ];
    }

    protected function formatOwnReview(ProductReview $review): array
    {
        return [
            'id' => $review->id,
            'product_id' => $review->product_id,
            'user_id' => $review->user_id,
            'rating' => (int) $review->rating,
            'comment' => $review->comment,
            'is_hidden' => (bool) $review->is_hidden,
            'hidden_reason' => $review->hidden_reason,
            'created_at' => optional($review->created_at)->toISOString(),
            'updated_at' => optional($review->updated_at)->toISOString(),
        ];
    }

    protected function formatReport(ProductReviewReport $report): array
    {
        return [
            'id' => $report->id,
            'review_id' => $report->review_id,
            'reason' => $report->reason,
            'details' => $report->details,
            'status' => $report->status,
            'created_at' => optional($report->created_at)->toISOString(),
            'updated_at' => optional($report->updated_at)->toISOString(),
        ];
    }

    protected function maskReviewerName(?string $name): string
    {
        $normalized = trim((string) $name);
        if ($normalized === '') {
            return 'Verified Buyer';
        }

        $parts = preg_split('/\s+/', $normalized) ?: [];
        $firstName = trim((string) ($parts[0] ?? 'Buyer'));
        $lastPart = trim((string) ($parts[count($parts) - 1] ?? $firstName));
        $initial = Str::upper(Str::substr($lastPart, 0, 1));
        if ($initial === '') {
            $initial = 'B';
        }

        return "{$firstName} {$initial}.";
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
