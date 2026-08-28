<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Store;
use App\Models\StorePaymentMethod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MerchantPaymentFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_store_receives_a_default_cod_method_and_merchant_can_configure_methods(): void
    {
        Storage::fake('public');
        $store = Store::create(['name' => 'Payment Store', 'slug' => 'payment-store', 'status' => 'active']);
        $merchant = User::factory()->create(['is_merchant' => true, 'store_id' => $store->id]);

        $this->assertDatabaseHas('store_payment_methods', [
            'store_id' => $store->id,
            'type' => 'cod',
            'is_enabled' => true,
        ]);

        Sanctum::actingAs($merchant);
        $response = $this->post('/api/merchant/payment-methods', [
            'type' => 'qrph',
            'label' => 'QR Ph',
            'provider' => 'Sample Bank',
            'account_name' => 'Payment Store',
            'requires_reference' => '1',
            'requires_proof' => '1',
            'qr_image' => $this->fakePng('merchant-qr.png'),
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('payment_method.type', 'qrph')
            ->assertJsonPath('payment_method.requires_proof', true);

        $this->getJson('/api/merchant/payment-methods')
            ->assertOk()
            ->assertJsonCount(2, 'payment_methods');
    }

    public function test_checkout_quote_and_order_creation_split_items_by_merchant(): void
    {
        $storeA = Store::create(['name' => 'Store A', 'slug' => 'pay-store-a', 'status' => 'active']);
        $storeB = Store::create(['name' => 'Store B', 'slug' => 'pay-store-b', 'status' => 'active']);
        $productA = Product::create(['store_id' => $storeA->id, 'title' => 'Rice', 'price' => 100, 'category' => 'Food', 'stock' => 10]);
        $productB = Product::create(['store_id' => $storeB->id, 'title' => 'Basket', 'price' => 250, 'category' => 'Craft', 'stock' => 5]);
        $methodA = $storeA->paymentMethods()->where('type', 'cod')->firstOrFail();
        $methodB = StorePaymentMethod::create([
            'store_id' => $storeB->id,
            'type' => 'gcash',
            'provider' => 'GCash',
            'label' => 'GCash manual transfer',
            'account_name' => 'Store B Owner',
            'account_identifier' => '09123456789',
            'is_enabled' => true,
            'requires_reference' => true,
            'requires_proof' => true,
        ]);
        $customer = User::factory()->create();
        Sanctum::actingAs($customer);

        $items = [
            ['product_id' => $productA->id, 'quantity' => 2],
            ['product_id' => $productB->id, 'quantity' => 1],
        ];

        $this->postJson('/api/checkout/quote', ['items' => $items])
            ->assertOk()
            ->assertJsonCount(2, 'groups')
            ->assertJsonPath('grand_total', 450);

        $response = $this->postJson('/api/orders', [
            'items' => $items,
            'shipping_address' => 'Poblacion, Barbaza',
            'shipping_city' => 'Barbaza',
            'payments' => [
                ['store_id' => $storeA->id, 'payment_method_id' => $methodA->id],
                ['store_id' => $storeB->id, 'payment_method_id' => $methodB->id],
            ],
        ]);

        $response->assertCreated()->assertJsonCount(2, 'orders');
        $orders = collect($response->json('orders'));
        $this->assertEqualsCanonicalizing([$storeA->id, $storeB->id], $orders->pluck('store_id')->all());
        $this->assertCount(1, $orders->pluck('order_group_id')->unique());
        $this->assertDatabaseHas('orders', ['store_id' => $storeA->id, 'payment_method' => 'cod']);
        $this->assertDatabaseHas('orders', ['store_id' => $storeB->id, 'payment_method' => 'gcash', 'payment_status' => 'unpaid']);
    }

    public function test_customer_submits_private_proof_and_only_own_merchant_can_approve_it(): void
    {
        Storage::fake('local');
        $store = Store::create(['name' => 'Proof Store', 'slug' => 'proof-store', 'status' => 'active']);
        $otherStore = Store::create(['name' => 'Other Store', 'slug' => 'other-proof-store', 'status' => 'active']);
        $method = StorePaymentMethod::create([
            'store_id' => $store->id,
            'type' => 'gcash',
            'provider' => 'GCash',
            'label' => 'GCash transfer',
            'is_enabled' => true,
            'requires_reference' => true,
            'requires_proof' => true,
        ]);
        $product = Product::create(['store_id' => $store->id, 'title' => 'Paid Item', 'price' => 125, 'category' => 'Goods', 'stock' => 3]);
        $customer = User::factory()->create();
        $merchant = User::factory()->create(['is_merchant' => true, 'store_id' => $store->id]);
        $otherMerchant = User::factory()->create(['is_merchant' => true, 'store_id' => $otherStore->id]);

        Sanctum::actingAs($customer);
        $created = $this->postJson('/api/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'shipping_address' => 'Barbaza',
            'payments' => [['store_id' => $store->id, 'payment_method_id' => $method->id]],
        ])->assertCreated();
        $orderId = $created->json('order.id');

        Sanctum::actingAs($merchant);
        $this->patchJson("/api/merchant/orders/{$orderId}/status", ['status' => 'processing'])
            ->assertUnprocessable();

        Sanctum::actingAs($customer);
        $submitted = $this->post("/api/orders/{$orderId}/payment-proof", [
            'reference_number' => 'GCASH-12345',
            'proof' => $this->fakePng('receipt.png'),
        ], ['Accept' => 'application/json']);
        $submitted->assertCreated()->assertJsonPath('payment_submission.status', 'under_review');
        $submissionId = $submitted->json('payment_submission.id');

        Sanctum::actingAs($otherMerchant);
        $this->patchJson("/api/merchant/orders/{$orderId}/payment", ['action' => 'approve'])->assertNotFound();
        $this->get("/api/orders/{$orderId}/payment-proofs/{$submissionId}")->assertForbidden();

        Sanctum::actingAs($merchant);
        $this->get("/api/orders/{$orderId}/payment-proofs/{$submissionId}")->assertOk();
        $this->patchJson("/api/merchant/orders/{$orderId}/payment", ['action' => 'approve'])
            ->assertOk()
            ->assertJsonPath('payment_status', 'paid');
        $this->patchJson("/api/merchant/orders/{$orderId}/status", ['status' => 'processing'])->assertOk();
    }

    private function fakePng(string $name): UploadedFile
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=');

        return UploadedFile::fake()->createWithContent($name, $png);
    }
}
