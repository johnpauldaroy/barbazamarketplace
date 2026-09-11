<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Notifications\NewMerchantOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MerchantOrderNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_order_notifies_only_its_store_merchants_and_distinct_contact_email(): void
    {
        Notification::fake();

        $store = Store::create([
            'name' => 'Alert Store',
            'slug' => 'alert-store',
            'status' => 'active',
            'contact_email' => 'orders@alert-store.test',
        ]);
        $otherStore = Store::create(['name' => 'Other Store', 'slug' => 'other-alert-store', 'status' => 'active']);
        $merchant = User::factory()->create(['is_merchant' => true, 'store_id' => $store->id]);
        $secondMerchant = User::factory()->create(['is_merchant' => true, 'store_id' => $store->id]);
        $otherMerchant = User::factory()->create(['is_merchant' => true, 'store_id' => $otherStore->id]);
        $customer = User::factory()->create();
        $product = Product::create([
            'store_id' => $store->id,
            'title' => 'Local Rice',
            'price' => 125,
            'category' => 'Food',
            'stock' => 10,
        ]);

        Sanctum::actingAs($customer);
        $this->postJson('/api/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
            'shipping_address' => 'Poblacion, Barbaza',
            'customer_name' => 'Test Buyer',
        ])->assertCreated();

        Notification::assertSentTo([$merchant, $secondMerchant], NewMerchantOrder::class);
        Notification::assertNotSentTo($otherMerchant, NewMerchantOrder::class);
        Notification::assertSentOnDemand(NewMerchantOrder::class, function ($notification, $channels, $notifiable) {
            return $notifiable->routes['mail'] === 'orders@alert-store.test';
        });
    }

    public function test_store_contact_is_not_emailed_twice_when_it_matches_a_merchant(): void
    {
        Notification::fake();
        $merchant = User::factory()->create(['is_merchant' => true]);
        $store = Store::create([
            'name' => 'One Email Store',
            'slug' => 'one-email-store',
            'status' => 'active',
            'contact_email' => $merchant->email,
        ]);
        $merchant->update(['store_id' => $store->id]);
        $customer = User::factory()->create();
        $product = Product::create([
            'store_id' => $store->id,
            'title' => 'Coffee',
            'price' => 80,
            'category' => 'Food',
            'stock' => 5,
        ]);

        Sanctum::actingAs($customer);
        $this->postJson('/api/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'shipping_address' => 'Barbaza',
        ])->assertCreated();

        Notification::assertSentToTimes($merchant, NewMerchantOrder::class, 1);
        Notification::assertNothingSentTo(new AnonymousNotifiable);
    }

    public function test_merchant_can_register_and_remove_only_their_current_device_subscription(): void
    {
        config()->set('services.webpush', [
            'subject' => 'mailto:test@example.com',
            'public_key' => 'test-public-key',
            'private_key' => 'test-private-key',
        ]);
        $store = Store::create(['name' => 'Push Store', 'slug' => 'push-store', 'status' => 'active']);
        $merchant = User::factory()->create(['is_merchant' => true, 'store_id' => $store->id]);
        Sanctum::actingAs($merchant);
        $endpoint = 'https://push.example.test/subscriptions/device-1';

        $this->getJson('/api/merchant/push-subscriptions')
            ->assertOk()
            ->assertJsonPath('available', true)
            ->assertJsonPath('subscription_count', 0);

        $this->postJson('/api/merchant/push-subscriptions', [
            'endpoint' => $endpoint,
            'keys' => ['p256dh' => 'public-key', 'auth' => 'auth-token'],
            'contentEncoding' => 'aes128gcm',
        ])->assertCreated();

        $this->assertDatabaseHas('push_subscriptions', [
            'user_id' => $merchant->id,
            'endpoint_hash' => hash('sha256', $endpoint),
        ]);

        $this->deleteJson('/api/merchant/push-subscriptions', ['endpoint' => $endpoint])
            ->assertOk()
            ->assertJsonPath('removed', true);
        $this->assertDatabaseCount('push_subscriptions', 0);
    }
}
