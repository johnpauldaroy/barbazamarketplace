<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VariantCheckoutTest extends TestCase
{
    use RefreshDatabase;

    private Product $product;
    private ProductVariant $loose;
    private ProductVariant $pack;
    private ProductVariant $sack;

    protected function setUp(): void
    {
        parent::setUp();

        // 50 kg of rice, sellable loose, by 5kg pack, or by 25kg sack.
        $this->product = Product::create([
            'store_id' => Store::ensurePlatformStore()->id,
            'title' => 'Rice',
            'price' => 60,
            'category' => 'Grains',
            'stock' => 50,
            'base_unit_id' => Unit::query()->where('code', 'kg')->value('id'),
            'has_variants' => true,
        ]);

        $this->loose = ProductVariant::create([
            'product_id' => $this->product->id, 'name' => 'Loose (1kg)',
            'base_unit_quantity' => 1, 'price' => 60, 'is_default' => true, 'sort_order' => 0,
        ]);
        $this->pack = ProductVariant::create([
            'product_id' => $this->product->id, 'name' => '5kg Pack',
            'base_unit_quantity' => 5, 'price' => 280, 'sort_order' => 1,
        ]);
        $this->sack = ProductVariant::create([
            'product_id' => $this->product->id, 'name' => '25kg Sack',
            'base_unit_quantity' => 25, 'price' => 1300, 'sort_order' => 2,
        ]);
    }

    private function checkout(array $item): TestResponse
    {
        Sanctum::actingAs(User::factory()->create());

        return $this->postJson('/api/orders', [
            'items' => [$item],
            'shipping_address' => 'Poblacion, Barbaza',
            'shipping_city' => 'Barbaza',
            'customer_name' => 'Test Customer',
            'customer_email' => 'customer@example.com',
            'payment_method' => 'cod',
        ]);
    }

    public function test_buying_a_sack_deducts_its_full_base_units(): void
    {
        $this->checkout([
            'product_id' => $this->product->id,
            'product_variant_id' => $this->sack->id,
            'quantity' => 1,
        ])->assertCreated();

        // One sack = 25kg out of the shared 50kg pool.
        $this->assertEquals(25.0, (float) $this->product->fresh()->stock);
    }

    public function test_line_is_priced_from_the_variant_not_the_product(): void
    {
        $this->checkout([
            'product_id' => $this->product->id,
            'product_variant_id' => $this->pack->id,
            'quantity' => 2,
            // A tampered client price must be ignored.
            'price' => 1.00,
        ])->assertCreated();

        $this->assertDatabaseHas('order_items', [
            'product_variant_id' => $this->pack->id,
            'variant_name' => '5kg Pack',
            'quantity' => 2,
            'price' => 280.00,
        ]);

        $this->assertEquals(40.0, (float) $this->product->fresh()->stock);
    }

    public function test_oversell_is_rejected_using_base_units(): void
    {
        // 3 sacks = 75kg, more than the 50kg in stock, even though stock > 3.
        $response = $this->checkout([
            'product_id' => $this->product->id,
            'product_variant_id' => $this->sack->id,
            'quantity' => 3,
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('errors.items.0', 'Insufficient stock for Rice (25kg Sack).');
        $this->assertEquals(50.0, (float) $this->product->fresh()->stock);
    }

    public function test_missing_variant_id_falls_back_to_default(): void
    {
        // Mirrors a cart saved before variants shipped.
        $this->checkout([
            'product_id' => $this->product->id,
            'quantity' => 3,
        ])->assertCreated();

        $this->assertDatabaseHas('order_items', [
            'product_variant_id' => $this->loose->id,
        ]);
        $this->assertEquals(47.0, (float) $this->product->fresh()->stock);
    }

    public function test_variant_from_another_product_is_rejected(): void
    {
        $other = Product::create([
            'store_id' => Store::ensurePlatformStore()->id,
            'title' => 'Sugar', 'price' => 70, 'category' => 'Grains', 'stock' => 20,
        ]);
        $foreign = ProductVariant::create([
            'product_id' => $other->id, 'name' => 'Bag',
            'base_unit_quantity' => 1, 'price' => 70, 'is_default' => true,
        ]);

        $response = $this->checkout([
            'product_id' => $this->product->id,
            'product_variant_id' => $foreign->id,
            'quantity' => 1,
        ]);

        $response->assertStatus(422);
        $this->assertEquals(50.0, (float) $this->product->fresh()->stock);
    }

    public function test_inactive_variant_cannot_be_purchased(): void
    {
        $this->sack->update(['is_active' => false]);

        $response = $this->checkout([
            'product_id' => $this->product->id,
            'product_variant_id' => $this->sack->id,
            'quantity' => 1,
        ]);

        $response->assertStatus(422);
        $this->assertEquals(50.0, (float) $this->product->fresh()->stock);
    }

    public function test_cancelling_an_order_restores_exact_base_units(): void
    {
        $this->checkout([
            'product_id' => $this->product->id,
            'product_variant_id' => $this->sack->id,
            'quantity' => 2,
        ])->assertCreated();

        // 2 sacks = 50kg, emptying the pool.
        $this->assertEquals(0.0, (float) $this->product->fresh()->stock);

        $admin = User::factory()->create(['is_admin' => true]);
        Sanctum::actingAs($admin);

        $order = Order::query()->latest('id')->firstOrFail();
        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'cancelled'])->assertOk();

        // Cancelling must return 50kg, not 2 units.
        $this->assertEquals(50.0, (float) $this->product->fresh()->stock);
    }

    public function test_product_api_exposes_variants_with_availability(): void
    {
        $response = $this->getJson("/api/products/{$this->product->id}")->assertOk();

        $response->assertJsonPath('product.has_variants', true);
        $variants = $response->json('product.variants');
        $this->assertCount(3, $variants);

        $byName = collect($variants)->keyBy('name');
        $this->assertSame(50, $byName['Loose (1kg)']['available_quantity']);
        $this->assertSame(10, $byName['5kg Pack']['available_quantity']);
        $this->assertSame(2, $byName['25kg Sack']['available_quantity']);
        $this->assertTrue($byName['Loose (1kg)']['is_default']);
    }

    public function test_variant_that_stock_cannot_cover_reports_out_of_stock(): void
    {
        $this->product->update(['stock' => 14]);

        $byName = collect($this->getJson("/api/products/{$this->product->id}")->json('product.variants'))
            ->keyBy('name');

        $this->assertTrue($byName['5kg Pack']['is_in_stock']);
        $this->assertFalse($byName['25kg Sack']['is_in_stock']);
    }
}
