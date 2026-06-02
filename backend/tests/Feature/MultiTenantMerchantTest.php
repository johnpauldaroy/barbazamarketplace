<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MultiTenantMerchantTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_store_and_merchant(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        Sanctum::actingAs($admin);

        $storeResponse = $this->postJson('/api/admin/stores', [
            'name' => 'Alpha Grocer',
            'status' => 'active',
            'description' => 'Alpha merchant catalog',
        ]);

        $storeResponse->assertCreated();
        $storeId = $storeResponse->json('store.id');
        $this->assertNotNull($storeId);

        $merchantResponse = $this->postJson("/api/admin/stores/{$storeId}/merchants", [
            'name' => 'Alpha Merchant',
            'email' => 'alpha-merchant@example.com',
            'password' => 'MerchantPass123',
            'password_confirmation' => 'MerchantPass123',
        ]);

        $merchantResponse->assertCreated();
        $merchantResponse->assertJsonPath('merchant.is_merchant', true);
        $merchantResponse->assertJsonPath('merchant.store_id', $storeId);
    }

    public function test_merchant_cannot_access_admin_endpoints(): void
    {
        $store = Store::ensurePlatformStore();
        $merchant = User::factory()->create([
            'is_admin' => false,
            'is_merchant' => true,
            'store_id' => $store->id,
        ]);

        Sanctum::actingAs($merchant);
        $response = $this->getJson('/api/admin/stores');

        $response->assertForbidden();
    }

    public function test_customer_cannot_access_admin_or_merchant_endpoints(): void
    {
        $customer = User::factory()->create([
            'is_admin' => false,
            'is_merchant' => false,
            'store_id' => null,
        ]);

        Sanctum::actingAs($customer);

        $this->getJson('/api/admin/stores')->assertForbidden();
        $this->getJson('/api/merchant/store')->assertForbidden();
    }

    public function test_merchant_product_crud_is_scoped_to_own_store(): void
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
            'is_admin' => false,
            'is_merchant' => true,
            'store_id' => $storeA->id,
        ]);
        $merchantB = User::factory()->create([
            'is_admin' => false,
            'is_merchant' => true,
            'store_id' => $storeB->id,
        ]);

        Sanctum::actingAs($merchantA);
        $createResponse = $this->postJson('/api/merchant/products', [
            'title' => 'Store A Product',
            'description' => 'Owned by store A',
            'price' => 100,
            'category' => 'Snacks',
            'stock' => 12,
        ]);
        $createResponse->assertCreated();
        $productId = $createResponse->json('product.id');
        $this->assertNotNull($productId);
        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'store_id' => $storeA->id,
        ]);

        Sanctum::actingAs($merchantB);
        $this->putJson("/api/merchant/products/{$productId}", [
            'title' => 'Hacked title',
        ])->assertNotFound();

        $this->deleteJson("/api/merchant/products/{$productId}")->assertNotFound();
    }

    public function test_public_registration_creates_customer_role_only(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Customer One',
            'email' => 'customer-one@example.com',
            'password' => 'CustomerPass123',
            'password_confirmation' => 'CustomerPass123',
            'is_admin' => true,
            'is_merchant' => true,
            'store_id' => 999,
        ]);

        $response->assertOk();
        $response->assertJsonPath('user.is_admin', false);
        $response->assertJsonPath('user.is_merchant', false);
        $response->assertJsonPath('user.store_id', null);
    }

    public function test_category_uniqueness_is_scoped_per_store(): void
    {
        $storeA = Store::create([
            'name' => 'Store A Categories',
            'slug' => 'store-a-categories',
            'status' => 'active',
        ]);
        $storeB = Store::create([
            'name' => 'Store B Categories',
            'slug' => 'store-b-categories',
            'status' => 'active',
        ]);

        $merchantA = User::factory()->create([
            'is_merchant' => true,
            'store_id' => $storeA->id,
        ]);
        $merchantB = User::factory()->create([
            'is_merchant' => true,
            'store_id' => $storeB->id,
        ]);

        Sanctum::actingAs($merchantA);
        $this->postJson('/api/merchant/categories', ['name' => 'Beverages'])->assertCreated();

        Sanctum::actingAs($merchantB);
        $this->postJson('/api/merchant/categories', ['name' => 'Beverages'])->assertCreated();

        $this->assertDatabaseHas('categories', ['store_id' => $storeA->id, 'name' => 'Beverages']);
        $this->assertDatabaseHas('categories', ['store_id' => $storeB->id, 'name' => 'Beverages']);
    }

    public function test_admin_can_rename_platform_category_and_products(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $store = Store::ensurePlatformStore();

        Category::create([
            'store_id' => $store->id,
            'name' => 'Fruits',
        ]);
        Product::create([
            'store_id' => $store->id,
            'title' => 'Mango',
            'price' => 50,
            'category' => 'Fruits',
            'stock' => 10,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->putJson('/api/categories/Fruits', [
            'name' => 'Fresh Fruits',
        ]);

        $response->assertOk();
        $response->assertJsonPath('message', 'Category updated successfully');
        $this->assertDatabaseHas('categories', ['store_id' => $store->id, 'name' => 'Fresh Fruits']);
        $this->assertDatabaseMissing('categories', ['store_id' => $store->id, 'name' => 'Fruits']);
        $this->assertDatabaseHas('products', ['store_id' => $store->id, 'title' => 'Mango', 'category' => 'Fresh Fruits']);
    }

    public function test_admin_can_delete_unused_platform_category(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $store = Store::ensurePlatformStore();

        Category::create([
            'store_id' => $store->id,
            'name' => 'Seasonal',
        ]);

        Sanctum::actingAs($admin);

        $this->deleteJson('/api/categories/Seasonal')->assertOk();
        $this->assertDatabaseMissing('categories', ['store_id' => $store->id, 'name' => 'Seasonal']);
    }

    public function test_admin_cannot_delete_category_used_by_products(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $store = Store::ensurePlatformStore();

        Category::create([
            'store_id' => $store->id,
            'name' => 'Produce',
        ]);
        Product::create([
            'store_id' => $store->id,
            'title' => 'Tomato',
            'price' => 25,
            'category' => 'Produce',
            'stock' => 8,
        ]);

        Sanctum::actingAs($admin);

        $this->deleteJson('/api/categories/Produce')
            ->assertStatus(409)
            ->assertJsonPath('message', 'Category is used by products. Update those products before deleting it.');

        $this->assertDatabaseHas('categories', ['store_id' => $store->id, 'name' => 'Produce']);
        $this->assertDatabaseHas('products', ['store_id' => $store->id, 'title' => 'Tomato', 'category' => 'Produce']);
    }

    public function test_merchant_orders_are_scoped_and_include_store_specific_totals(): void
    {
        $storeA = Store::create([
            'name' => 'Store A Orders',
            'slug' => 'store-a-orders',
            'status' => 'active',
        ]);
        $storeB = Store::create([
            'name' => 'Store B Orders',
            'slug' => 'store-b-orders',
            'status' => 'active',
        ]);

        $merchantA = User::factory()->create([
            'is_merchant' => true,
            'store_id' => $storeA->id,
        ]);
        $customer = User::factory()->create();

        $storeAProduct = Product::create([
            'store_id' => $storeA->id,
            'title' => 'Store A Rice',
            'description' => 'Store A product',
            'price' => 120,
            'category' => 'Grains',
            'stock' => 20,
        ]);
        $storeBProduct = Product::create([
            'store_id' => $storeB->id,
            'title' => 'Store B Coffee',
            'description' => 'Store B product',
            'price' => 80,
            'category' => 'Beverages',
            'stock' => 20,
        ]);

        $mixedOrder = Order::create([
            'user_id' => $customer->id,
            'subtotal_amount' => 280,
            'shipping_fee' => 20,
            'total_amount' => 300,
            'status' => 'pending',
            'shipping_address' => 'Address A',
            'shipping_city' => 'City A',
            'customer_name' => 'Customer A',
            'customer_email' => 'customer-a@example.com',
        ]);

        OrderItem::create([
            'order_id' => $mixedOrder->id,
            'product_id' => $storeAProduct->id,
            'quantity' => 1,
            'price' => 120,
        ]);
        OrderItem::create([
            'order_id' => $mixedOrder->id,
            'product_id' => $storeBProduct->id,
            'quantity' => 2,
            'price' => 80,
        ]);

        $otherStoreOrder = Order::create([
            'user_id' => $customer->id,
            'subtotal_amount' => 80,
            'shipping_fee' => 20,
            'total_amount' => 100,
            'status' => 'pending',
            'shipping_address' => 'Address B',
            'shipping_city' => 'City B',
        ]);
        OrderItem::create([
            'order_id' => $otherStoreOrder->id,
            'product_id' => $storeBProduct->id,
            'quantity' => 1,
            'price' => 80,
        ]);

        Sanctum::actingAs($merchantA);
        $response = $this->getJson('/api/merchant/orders');

        $response->assertOk();
        $response->assertJsonCount(1, 'orders');
        $response->assertJsonPath('orders.0.id', $mixedOrder->id);
        $response->assertJsonPath('orders.0.store_subtotal_amount', 120);
        $response->assertJsonPath('orders.0.store_item_count', 1);
        $response->assertJsonPath('orders.0.has_other_store_items', true);
        $response->assertJsonPath('orders.0.merchant_can_update_status', false);
        $response->assertJsonPath('orders.0.store_items.0.product_id', $storeAProduct->id);
    }

    public function test_merchant_can_update_status_for_single_store_order(): void
    {
        $store = Store::create([
            'name' => 'Single Store',
            'slug' => 'single-store',
            'status' => 'active',
        ]);
        $merchant = User::factory()->create([
            'is_merchant' => true,
            'store_id' => $store->id,
        ]);
        $customer = User::factory()->create();

        $product = Product::create([
            'store_id' => $store->id,
            'title' => 'Single Store Product',
            'description' => 'Owned by single store',
            'price' => 50,
            'category' => 'General',
            'stock' => 20,
        ]);

        $order = Order::create([
            'user_id' => $customer->id,
            'subtotal_amount' => 100,
            'shipping_fee' => 20,
            'total_amount' => 120,
            'status' => 'pending',
            'shipping_address' => 'Address C',
            'shipping_city' => 'City C',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => 2,
            'price' => 50,
        ]);

        Sanctum::actingAs($merchant);
        $response = $this->patchJson("/api/merchant/orders/{$order->id}/status", [
            'status' => 'processing',
        ]);

        $response->assertOk();
        $response->assertJsonPath('order.status', 'processing');
        $response->assertJsonPath('order.merchant_can_update_status', true);
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'processing',
        ]);
    }

    public function test_merchant_cannot_update_mixed_store_order_status(): void
    {
        $storeA = Store::create([
            'name' => 'Store A Mixed',
            'slug' => 'store-a-mixed',
            'status' => 'active',
        ]);
        $storeB = Store::create([
            'name' => 'Store B Mixed',
            'slug' => 'store-b-mixed',
            'status' => 'active',
        ]);

        $merchantA = User::factory()->create([
            'is_merchant' => true,
            'store_id' => $storeA->id,
        ]);
        $customer = User::factory()->create();

        $productA = Product::create([
            'store_id' => $storeA->id,
            'title' => 'Store A Product',
            'description' => 'Owned by store A',
            'price' => 120,
            'category' => 'General',
            'stock' => 20,
        ]);
        $productB = Product::create([
            'store_id' => $storeB->id,
            'title' => 'Store B Product',
            'description' => 'Owned by store B',
            'price' => 80,
            'category' => 'General',
            'stock' => 20,
        ]);

        $order = Order::create([
            'user_id' => $customer->id,
            'subtotal_amount' => 200,
            'shipping_fee' => 20,
            'total_amount' => 220,
            'status' => 'pending',
            'shipping_address' => 'Address D',
            'shipping_city' => 'City D',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $productA->id,
            'quantity' => 1,
            'price' => 120,
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $productB->id,
            'quantity' => 1,
            'price' => 80,
        ]);

        Sanctum::actingAs($merchantA);
        $response = $this->patchJson("/api/merchant/orders/{$order->id}/status", [
            'status' => 'processing',
        ]);

        $response->assertStatus(409);
        $response->assertJsonPath('message', 'Status updates for mixed-store orders are only available to admins.');
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'pending',
        ]);
    }

    public function test_merchant_cannot_update_order_that_has_no_items_from_own_store(): void
    {
        $storeA = Store::create([
            'name' => 'Store A Isolated',
            'slug' => 'store-a-isolated',
            'status' => 'active',
        ]);
        $storeB = Store::create([
            'name' => 'Store B Isolated',
            'slug' => 'store-b-isolated',
            'status' => 'active',
        ]);

        $merchantA = User::factory()->create([
            'is_merchant' => true,
            'store_id' => $storeA->id,
        ]);
        $customer = User::factory()->create();
        $productB = Product::create([
            'store_id' => $storeB->id,
            'title' => 'Store B Exclusive Product',
            'description' => 'Owned by store B',
            'price' => 90,
            'category' => 'General',
            'stock' => 20,
        ]);

        $order = Order::create([
            'user_id' => $customer->id,
            'subtotal_amount' => 90,
            'shipping_fee' => 20,
            'total_amount' => 110,
            'status' => 'pending',
            'shipping_address' => 'Address E',
            'shipping_city' => 'City E',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $productB->id,
            'quantity' => 1,
            'price' => 90,
        ]);

        Sanctum::actingAs($merchantA);
        $response = $this->patchJson("/api/merchant/orders/{$order->id}/status", [
            'status' => 'processing',
        ]);

        $response->assertNotFound();
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'pending',
        ]);
    }

    public function test_legacy_platform_store_backfill_behavior_remains_queryable(): void
    {
        $platformStore = Store::query()->where('slug', Store::PLATFORM_STORE_SLUG)->first();
        $this->assertNotNull($platformStore);

        Product::create([
            'title' => 'Legacy Product',
            'description' => 'Migrated product',
            'price' => 80,
            'category' => 'Legacy',
            'stock' => 5,
        ]);

        Category::create(['name' => 'Legacy']);

        $productsResponse = $this->getJson('/api/products');
        $productsResponse->assertOk();
        $productsResponse->assertJsonPath('products.0.store.slug', Store::PLATFORM_STORE_SLUG);

        $categoriesResponse = $this->getJson('/api/categories');
        $categoriesResponse->assertOk();
        $this->assertContains('Legacy', $categoriesResponse->json('categories'));
    }
}
