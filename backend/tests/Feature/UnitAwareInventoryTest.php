<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UnitAwareInventoryTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['is_admin' => true]);
        $this->store = Store::create(['name' => 'Unit Store', 'slug' => 'unit-store', 'status' => 'active']);
        Sanctum::actingAs($this->admin);
    }

    public function test_product_is_created_atomically_with_unit_options_and_opening_movement(): void
    {
        $kg = Unit::where('code', 'kg')->firstOrFail();
        $response = $this->postJson('/api/products', [
            'store_id' => $this->store->id, 'title' => 'Rice', 'category' => 'Grains',
            'base_unit_id' => $kg->id, 'stock' => 50.5, 'low_stock_threshold' => 5.5,
            'variants' => [
                ['name' => 'Loose 1kg', 'base_unit_quantity' => 1, 'price' => 60, 'is_default' => true],
                ['name' => '25kg Sack', 'base_unit_quantity' => 25, 'price' => 1300],
            ],
        ])->assertCreated();

        $product = Product::findOrFail($response->json('product.id'));
        $this->assertEquals(50.5, (float) $product->stock);
        $this->assertEquals(60, (float) $product->price);
        $this->assertCount(2, $product->variants);
        $this->assertDatabaseHas('inventory_movements', ['product_id' => $product->id, 'type' => 'opening', 'unit_id' => $kg->id]);
    }

    public function test_adjustments_are_audited_and_cannot_make_stock_negative(): void
    {
        $product = $this->makeProduct();
        $this->postJson("/api/products/{$product->id}/inventory-adjustments", ['operation' => 'remove', 'quantity' => 3.5, 'reason' => 'Damaged bag'])->assertOk()->assertJsonPath('stock', 46.5);
        $this->assertDatabaseHas('inventory_movements', ['product_id' => $product->id, 'type' => 'removal', 'reason' => 'Damaged bag']);
        $this->postJson("/api/products/{$product->id}/inventory-adjustments", ['operation' => 'remove', 'quantity' => 100, 'reason' => 'Invalid count'])->assertUnprocessable();
    }

    public function test_conversion_updates_stock_threshold_variants_and_operational_order_deductions(): void
    {
        $product = $this->makeProduct();
        $variant = $product->variants()->create(['name' => '5kg Pack', 'base_unit_quantity' => 5, 'price' => 280, 'is_default' => true]);
        $order = Order::create(['user_id' => $this->admin->id, 'total_amount' => 280, 'shipping_address' => 'Test', 'status' => 'pending']);
        $item = OrderItem::create(['order_id' => $order->id, 'product_id' => $product->id, 'product_variant_id' => $variant->id, 'quantity' => 1, 'base_units_deducted' => 5, 'inventory_unit_id' => $product->base_unit_id, 'price' => 280]);
        $g = Unit::where('code', 'g')->firstOrFail();

        $preview = $this->postJson("/api/products/{$product->id}/unit-conversion/preview", ['base_unit_id' => $g->id])->assertOk()->json('preview');
        $this->assertEquals(50000, $preview['stock']['after']);
        $this->postJson("/api/products/{$product->id}/unit-conversion", ['base_unit_id' => $g->id, 'version' => $preview['version'], 'reason' => 'Track inventory in grams'])->assertOk();

        $this->assertEquals(50000, (float) $product->fresh()->stock);
        $this->assertEquals(5000, (float) $variant->fresh()->base_unit_quantity);
        $this->assertEquals(5000, (float) $item->fresh()->base_units_deducted);
        $this->assertSame($g->id, $item->fresh()->inventory_unit_id);
        $this->assertDatabaseHas('inventory_movements', ['product_id' => $product->id, 'type' => 'unit_conversion']);
    }

    public function test_stale_conversion_preview_is_rejected(): void
    {
        $product = $this->makeProduct();
        $g = Unit::where('code', 'g')->firstOrFail();
        $preview = $this->postJson("/api/products/{$product->id}/unit-conversion/preview", ['base_unit_id' => $g->id])->json('preview');
        $this->postJson("/api/products/{$product->id}/inventory-adjustments", ['operation' => 'add', 'quantity' => 1, 'reason' => 'New delivery'])->assertOk();
        $this->postJson("/api/products/{$product->id}/unit-conversion", ['base_unit_id' => $g->id, 'version' => $preview['version'], 'reason' => 'Stale attempt'])->assertUnprocessable()->assertJsonValidationErrors('version');
    }

    public function test_cross_dimension_conversion_uses_explicit_equivalence(): void
    {
        $piece = Unit::where('code', 'pc')->firstOrFail();
        $kg = Unit::where('code', 'kg')->firstOrFail();
        $product = Product::create(['store_id' => $this->store->id, 'title' => 'Rice sacks', 'category' => 'Grains', 'price' => 1300, 'stock' => 2, 'low_stock_threshold' => 1, 'base_unit_id' => $piece->id]);
        $variant = $product->variants()->create(['name' => '25kg Sack', 'base_unit_quantity' => 1, 'price' => 1300, 'is_default' => true]);

        $preview = $this->postJson("/api/products/{$product->id}/unit-conversion/preview", ['base_unit_id' => $kg->id, 'conversion_factor' => 25])->assertOk()->json('preview');
        $this->assertEquals(50, $preview['stock']['after']);
        $this->assertEquals(25, $preview['variants'][0]['after']);
        $this->postJson("/api/products/{$product->id}/unit-conversion", ['base_unit_id' => $kg->id, 'conversion_factor' => 25, 'version' => $preview['version'], 'reason' => 'Convert legacy sacks to weight'])->assertOk();
        $this->assertEquals(25, (float) $variant->fresh()->base_unit_quantity);
    }

    public function test_cancellation_restores_converted_order_deduction_exactly(): void
    {
        $product = $this->makeProduct();
        $product->update(['stock' => 45]);
        $variant = $product->variants()->create(['name' => '5kg Pack', 'base_unit_quantity' => 5, 'price' => 280, 'is_default' => true]);
        $order = Order::create(['user_id' => $this->admin->id, 'total_amount' => 280, 'shipping_address' => 'Test', 'status' => 'pending']);
        OrderItem::create(['order_id' => $order->id, 'product_id' => $product->id, 'product_variant_id' => $variant->id, 'quantity' => 1, 'base_units_deducted' => 5, 'inventory_unit_id' => $product->base_unit_id, 'price' => 280]);
        $g = Unit::where('code', 'g')->firstOrFail();
        $preview = $this->postJson("/api/products/{$product->id}/unit-conversion/preview", ['base_unit_id' => $g->id])->json('preview');
        $this->postJson("/api/products/{$product->id}/unit-conversion", ['base_unit_id' => $g->id, 'version' => $preview['version'], 'reason' => 'Use grams'])->assertOk();

        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'cancelled'])->assertOk();
        $this->assertEquals(50000, (float) $product->fresh()->stock);
        $this->assertDatabaseHas('inventory_movements', ['product_id' => $product->id, 'order_id' => $order->id, 'type' => 'cancellation']);
    }

    public function test_packaging_units_are_legacy_and_piece_rejects_fractions(): void
    {
        $units = collect($this->getJson('/api/units')->assertOk()->json('units'))->keyBy('code');
        $this->assertFalse($units['sack']['is_active']);
        $this->assertSame('mass', $units['kg']['dimension']);
        $piece = $units['pc'];
        $this->postJson('/api/products', ['store_id' => $this->store->id, 'title' => 'Noodles', 'category' => 'Dry Goods', 'base_unit_id' => $piece['id'], 'stock' => 1.5, 'variants' => [['name' => 'Piece', 'base_unit_quantity' => 1, 'price' => 10, 'is_default' => true]]])->assertUnprocessable()->assertJsonValidationErrors('stock');
    }

    private function makeProduct(): Product
    {
        return Product::create(['store_id' => $this->store->id, 'title' => 'Rice', 'category' => 'Grains', 'price' => 60, 'stock' => 50, 'low_stock_threshold' => 5, 'base_unit_id' => Unit::where('code', 'kg')->value('id')]);
    }
}
