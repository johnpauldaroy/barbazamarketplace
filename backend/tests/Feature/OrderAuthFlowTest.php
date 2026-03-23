<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderAuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_create_order(): void
    {
        $response = $this->postJson('/api/orders', [
            'items' => [],
            'shipping_address' => 'Barbaza, Antique',
        ]);

        $response->assertUnauthorized();
    }

    public function test_authenticated_customer_can_create_order_with_user_id(): void
    {
        $user = User::factory()->create();
        $product = Product::create([
            'title' => 'Sample Rice',
            'description' => 'Fresh stock',
            'price' => 120.00,
            'category' => 'Grains',
            'stock' => 10,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/orders', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'price' => 120.00,
                ],
            ],
            'shipping_address' => 'Poblacion, Barbaza',
            'shipping_city' => 'Barbaza',
            'customer_name' => 'Test Customer',
            'customer_email' => 'customer@example.com',
            'customer_phone' => '09123456789',
            'payment_method' => 'cod',
            'shipping_fee' => 50.00,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('order.customer.email', 'customer@example.com');
        $response->assertJsonPath('order.total_amount', 290);

        $orderId = $response->json('order.id');

        $this->assertNotNull($orderId);
        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'user_id' => $user->id,
            'shipping_city' => 'Barbaza',
            'payment_method' => 'cod',
        ]);

        $this->assertDatabaseHas('order_items', [
            'order_id' => $orderId,
            'product_id' => $product->id,
            'quantity' => 2,
            'price' => 120.00,
        ]);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'stock' => 8,
        ]);
    }

    public function test_non_admin_get_orders_returns_only_their_orders(): void
    {
        $firstUser = User::factory()->create();
        $secondUser = User::factory()->create();

        $firstOrder = Order::create([
            'user_id' => $firstUser->id,
            'subtotal_amount' => 100,
            'shipping_fee' => 20,
            'total_amount' => 120,
            'status' => 'pending',
            'shipping_address' => 'Address A',
            'shipping_city' => 'City A',
        ]);

        Order::create([
            'user_id' => $secondUser->id,
            'subtotal_amount' => 80,
            'shipping_fee' => 15,
            'total_amount' => 95,
            'status' => 'processing',
            'shipping_address' => 'Address B',
            'shipping_city' => 'City B',
        ]);

        Sanctum::actingAs($firstUser);

        $response = $this->getJson('/api/orders');

        $response->assertOk();
        $response->assertJsonCount(1, 'orders');
        $response->assertJsonPath('orders.0.id', $firstOrder->id);
    }
}
