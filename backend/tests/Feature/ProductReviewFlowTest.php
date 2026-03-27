<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\ProductReviewReport;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductReviewFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_buyer_and_non_delivered_buyer_cannot_submit_review(): void
    {
        $product = Product::create([
            'title' => 'Review Product',
            'description' => 'Sample',
            'price' => 120,
            'category' => 'General',
            'stock' => 20,
        ]);

        $nonBuyer = User::factory()->create();
        Sanctum::actingAs($nonBuyer);
        $this->postJson("/api/products/{$product->id}/reviews", [
            'rating' => 5,
            'comment' => 'Great product.',
        ])->assertForbidden();

        $pendingBuyer = User::factory()->create();
        $this->createOrderItemForUser($pendingBuyer, $product, 'pending');
        Sanctum::actingAs($pendingBuyer);
        $this->postJson("/api/products/{$product->id}/reviews", [
            'rating' => 4,
            'comment' => 'Pending order buyer.',
        ])->assertForbidden();
    }

    public function test_delivered_buyer_can_upsert_one_review_per_product(): void
    {
        $product = Product::create([
            'title' => 'Delivered Product',
            'description' => 'Sample',
            'price' => 95,
            'category' => 'General',
            'stock' => 20,
        ]);
        $buyer = User::factory()->create();
        $this->createOrderItemForUser($buyer, $product, 'delivered');

        Sanctum::actingAs($buyer);
        $createResponse = $this->postJson("/api/products/{$product->id}/reviews", [
            'rating' => 5,
            'comment' => 'Excellent quality.',
        ]);
        $createResponse->assertOk();
        $createResponse->assertJsonPath('review.rating', 5);

        $updateResponse = $this->postJson("/api/products/{$product->id}/reviews", [
            'rating' => 3,
            'comment' => 'Updating after second try.',
        ]);
        $updateResponse->assertOk();
        $updateResponse->assertJsonPath('review.rating', 3);

        $this->assertDatabaseCount('product_reviews', 1);
        $this->assertDatabaseHas('product_reviews', [
            'product_id' => $product->id,
            'user_id' => $buyer->id,
            'rating' => 3,
        ]);
    }

    public function test_hidden_reviews_are_excluded_from_public_listing_and_summary(): void
    {
        $product = Product::create([
            'title' => 'Summary Product',
            'description' => 'Sample',
            'price' => 99,
            'category' => 'General',
            'stock' => 20,
        ]);
        $visibleBuyer = User::factory()->create(['name' => 'Juan Dela Cruz']);
        $hiddenBuyer = User::factory()->create(['name' => 'Maria Clara']);

        ProductReview::create([
            'product_id' => $product->id,
            'user_id' => $visibleBuyer->id,
            'rating' => 4,
            'comment' => 'Visible review',
            'is_hidden' => false,
        ]);
        ProductReview::create([
            'product_id' => $product->id,
            'user_id' => $hiddenBuyer->id,
            'rating' => 1,
            'comment' => 'Hidden review',
            'is_hidden' => true,
        ]);

        $reviewsResponse = $this->getJson("/api/products/{$product->id}/reviews");
        $reviewsResponse->assertOk();
        $reviewsResponse->assertJsonCount(1, 'reviews');
        $reviewsResponse->assertJsonPath('summary.ratings_count', 1);
        $reviewsResponse->assertJsonPath('summary.average_rating', 4);
        $reviewsResponse->assertJsonPath('reviews.0.reviewer_name', 'Juan C.');

        $productResponse = $this->getJson("/api/products/{$product->id}");
        $productResponse->assertOk();
        $productResponse->assertJsonPath('product.review_summary.ratings_count', 1);
        $productResponse->assertJsonPath('product.review_summary.average_rating', 4);

        $productsResponse = $this->getJson('/api/products');
        $productsResponse->assertOk();
        $productsResponse->assertJsonPath('products.0.review_summary.ratings_count', 1);
        $productsResponse->assertJsonPath('products.0.review_summary.average_rating', 4);
    }

    public function test_review_reports_and_admin_moderation_flow(): void
    {
        $store = Store::create([
            'name' => 'Review Store',
            'slug' => 'review-store',
            'status' => 'active',
        ]);
        $product = Product::create([
            'store_id' => $store->id,
            'title' => 'Moderation Product',
            'description' => 'Sample',
            'price' => 100,
            'category' => 'General',
            'stock' => 20,
        ]);
        $reviewer = User::factory()->create();
        $reporter = User::factory()->create();
        $admin = User::factory()->create(['is_admin' => true]);

        $review = ProductReview::create([
            'product_id' => $product->id,
            'user_id' => $reviewer->id,
            'rating' => 2,
            'comment' => 'Needs improvement.',
        ]);

        Sanctum::actingAs($reporter);
        $reportResponse = $this->postJson("/api/reviews/{$review->id}/report", [
            'reason' => 'Abusive language',
            'details' => 'Contains inappropriate wording.',
        ]);
        $reportResponse->assertCreated();
        $reportId = $reportResponse->json('report.id');
        $this->assertNotNull($reportId);

        Sanctum::actingAs($admin);
        $adminList = $this->getJson('/api/admin/reviews?reported=reported');
        $adminList->assertOk();
        $adminList->assertJsonPath('reviews.0.id', $review->id);
        $adminList->assertJsonPath('reviews.0.open_report_count', 1);

        $hideResponse = $this->patchJson("/api/admin/reviews/{$review->id}/visibility", [
            'is_hidden' => true,
            'hidden_reason' => 'Policy violation',
        ]);
        $hideResponse->assertOk();
        $hideResponse->assertJsonPath('review.is_hidden', true);
        $this->assertDatabaseHas('product_reviews', [
            'id' => $review->id,
            'is_hidden' => true,
        ]);

        $resolveResponse = $this->patchJson("/api/admin/review-reports/{$reportId}", [
            'status' => ProductReviewReport::STATUS_RESOLVED,
        ]);
        $resolveResponse->assertOk();
        $resolveResponse->assertJsonPath('report.status', ProductReviewReport::STATUS_RESOLVED);
        $this->assertDatabaseHas('product_review_reports', [
            'id' => $reportId,
            'status' => ProductReviewReport::STATUS_RESOLVED,
        ]);
    }

    protected function createOrderItemForUser(User $user, Product $product, string $status): void
    {
        $order = Order::create([
            'user_id' => $user->id,
            'subtotal_amount' => 100,
            'shipping_fee' => 20,
            'total_amount' => 120,
            'status' => $status,
            'shipping_address' => 'Poblacion, Barbaza',
            'shipping_city' => 'Barbaza',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => 1,
            'price' => (float) $product->price,
        ]);
    }
}
