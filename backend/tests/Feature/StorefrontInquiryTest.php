<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Store;
use App\Models\StoreInquiry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StorefrontInquiryTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_store_list_and_detail_only_include_active_stores(): void
    {
        $activeStore = Store::create([
            'name' => 'Fresh Market',
            'slug' => 'fresh-market',
            'status' => 'active',
            'description' => 'Local produce',
            'contact_email' => 'fresh@example.com',
            'contact_phone' => '09120001111',
            'address_line_1' => 'Poblacion',
            'city' => 'Barbaza',
            'province' => 'Antique',
            'country' => 'Philippines',
        ]);

        Store::create([
            'name' => 'Hidden Store',
            'slug' => 'hidden-store',
            'status' => 'inactive',
        ]);

        Product::create([
            'store_id' => $activeStore->id,
            'title' => 'Fresh Rice',
            'description' => 'Organic rice',
            'price' => 120,
            'category' => 'Grains',
            'stock' => 10,
        ]);

        $listResponse = $this->getJson('/api/stores');
        $listResponse->assertOk();
        $slugs = collect($listResponse->json('stores'))->pluck('slug')->all();
        $this->assertContains('fresh-market', $slugs);
        $this->assertNotContains('hidden-store', $slugs);
        $freshStore = collect($listResponse->json('stores'))->firstWhere('slug', 'fresh-market');
        $this->assertNotNull($freshStore);
        $this->assertSame(1, (int) ($freshStore['product_count'] ?? 0));

        $detailResponse = $this->getJson('/api/stores/fresh-market');
        $detailResponse->assertOk();
        $detailResponse->assertJsonPath('store.contact_email', 'fresh@example.com');
        $detailResponse->assertJsonPath('store.contact_phone', '09120001111');

        $this->getJson('/api/stores/hidden-store')->assertNotFound();
    }

    public function test_guest_inquiry_submission_requires_contact_info_and_honeypot_is_enforced(): void
    {
        $store = Store::create([
            'name' => 'Store One',
            'slug' => 'store-one',
            'status' => 'active',
        ]);

        $missingContactResponse = $this->postJson('/api/stores/store-one/inquiries', [
            'message' => 'Interested in your products.',
        ]);
        $missingContactResponse->assertStatus(422);
        $missingContactResponse->assertJsonValidationErrors(['name', 'email']);

        $honeypotResponse = $this->postJson('/api/stores/store-one/inquiries', [
            'name' => 'Guest Buyer',
            'email' => 'guest@example.com',
            'message' => 'Please send your catalog.',
            'website' => 'https://spam.example.com',
        ]);
        $honeypotResponse->assertStatus(422);
        $honeypotResponse->assertJsonValidationErrors(['website']);

        $validResponse = $this->postJson('/api/stores/store-one/inquiries', [
            'name' => 'Guest Buyer',
            'email' => 'guest@example.com',
            'phone' => '09123456789',
            'message' => 'Please share available rice options.',
        ]);
        $validResponse->assertCreated();
        $validResponse->assertJsonPath('inquiry.status', StoreInquiry::STATUS_OPEN);

        $this->assertDatabaseHas('store_inquiries', [
            'store_id' => $store->id,
            'user_id' => null,
            'name' => 'Guest Buyer',
            'email' => 'guest@example.com',
            'status' => StoreInquiry::STATUS_OPEN,
        ]);
    }

    public function test_authenticated_user_inquiry_uses_bearer_token_identity(): void
    {
        $store = Store::create([
            'name' => 'Store Two',
            'slug' => 'store-two',
            'status' => 'active',
        ]);
        $customer = User::factory()->create([
            'name' => 'Logged User',
            'email' => 'logged-user@example.com',
        ]);
        $token = $customer->createToken('test-token')->plainTextToken;

        $response = $this->postJson('/api/stores/store-two/inquiries', [
            'message' => 'Can I order in bulk?',
        ], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('store_inquiries', [
            'store_id' => $store->id,
            'user_id' => $customer->id,
            'name' => 'Logged User',
            'email' => 'logged-user@example.com',
            'status' => StoreInquiry::STATUS_OPEN,
        ]);
    }

    public function test_inquiry_rate_limit_is_applied(): void
    {
        Store::create([
            'name' => 'Rate Limited Store',
            'slug' => 'rate-limited-store',
            'status' => 'active',
        ]);

        for ($index = 1; $index <= 8; $index++) {
            $this->postJson('/api/stores/rate-limited-store/inquiries', [
                'name' => "Guest {$index}",
                'email' => "guest{$index}@example.com",
                'message' => 'Requesting price list.',
            ])->assertCreated();
        }

        $this->postJson('/api/stores/rate-limited-store/inquiries', [
            'name' => 'Guest 9',
            'email' => 'guest9@example.com',
            'message' => 'Ninth request.',
        ])->assertStatus(429);
    }

    public function test_merchant_inbox_is_store_scoped_and_supports_open_resolved_cycle(): void
    {
        $storeA = Store::create([
            'name' => 'Store A',
            'slug' => 'store-a',
            'status' => 'active',
        ]);
        $storeB = Store::create([
            'name' => 'Store B',
            'slug' => 'store-b',
            'status' => 'active',
        ]);

        $merchantA = User::factory()->create([
            'is_merchant' => true,
            'store_id' => $storeA->id,
        ]);
        User::factory()->create([
            'is_merchant' => true,
            'store_id' => $storeB->id,
        ]);

        $storeAInquiry = StoreInquiry::create([
            'store_id' => $storeA->id,
            'name' => 'Buyer One',
            'email' => 'buyer-one@example.com',
            'message' => 'Do you deliver?',
            'status' => StoreInquiry::STATUS_OPEN,
        ]);

        $storeBInquiry = StoreInquiry::create([
            'store_id' => $storeB->id,
            'name' => 'Buyer Two',
            'email' => 'buyer-two@example.com',
            'message' => 'Need wholesale quote.',
            'status' => StoreInquiry::STATUS_OPEN,
        ]);

        Sanctum::actingAs($merchantA);

        $listResponse = $this->getJson('/api/merchant/inquiries');
        $listResponse->assertOk();
        $listResponse->assertJsonCount(1, 'inquiries');
        $listResponse->assertJsonPath('inquiries.0.id', $storeAInquiry->id);

        $resolveResponse = $this->patchJson("/api/merchant/inquiries/{$storeAInquiry->id}/status", [
            'status' => StoreInquiry::STATUS_RESOLVED,
        ]);
        $resolveResponse->assertOk();
        $resolveResponse->assertJsonPath('inquiry.status', StoreInquiry::STATUS_RESOLVED);
        $this->assertDatabaseHas('store_inquiries', [
            'id' => $storeAInquiry->id,
            'status' => StoreInquiry::STATUS_RESOLVED,
            'resolved_by_user_id' => $merchantA->id,
        ]);

        $reopenResponse = $this->patchJson("/api/merchant/inquiries/{$storeAInquiry->id}/status", [
            'status' => StoreInquiry::STATUS_OPEN,
        ]);
        $reopenResponse->assertOk();
        $reopenResponse->assertJsonPath('inquiry.status', StoreInquiry::STATUS_OPEN);
        $this->assertDatabaseHas('store_inquiries', [
            'id' => $storeAInquiry->id,
            'status' => StoreInquiry::STATUS_OPEN,
            'resolved_by_user_id' => null,
        ]);

        $this->patchJson("/api/merchant/inquiries/{$storeBInquiry->id}/status", [
            'status' => StoreInquiry::STATUS_RESOLVED,
        ])->assertNotFound();
    }
}
