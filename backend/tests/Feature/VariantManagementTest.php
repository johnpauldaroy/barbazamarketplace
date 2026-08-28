<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VariantManagementTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;
    private User $merchant;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::create([
            'name' => 'Rice Traders',
            'slug' => 'rice-traders',
            'status' => 'active',
        ]);

        $this->merchant = User::factory()->create([
            'is_merchant' => true,
            'store_id' => $this->store->id,
        ]);

        $this->product = Product::create([
            'store_id' => $this->store->id,
            'title' => 'Rice',
            'price' => 60,
            'category' => 'Grains',
            'stock' => 50,
            'base_unit_id' => Unit::query()->where('code', 'kg')->value('id'),
        ]);

        ProductVariant::create([
            'product_id' => $this->product->id,
            'name' => 'Loose (1kg)',
            'base_unit_quantity' => 1,
            'price' => 60,
            'is_default' => true,
        ]);
    }

    public function test_units_endpoint_lists_seeded_units(): void
    {
        $response = $this->getJson('/api/units')->assertOk();

        $codes = collect($response->json('units'))->pluck('code');
        $this->assertContains('kg', $codes);
        $this->assertContains('sack', $codes);
    }

    public function test_merchant_can_add_a_variant_to_own_product(): void
    {
        Sanctum::actingAs($this->merchant);

        $response = $this->postJson("/api/products/{$this->product->id}/variants", [
            'name' => '25kg Sack',
            'base_unit_quantity' => 25,
            'price' => 1300,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('variant.available_quantity', 2);

        $this->assertDatabaseHas('product_variants', [
            'product_id' => $this->product->id,
            'name' => '25kg Sack',
        ]);

        // Two active options flips the flag that drives the storefront picker.
        $this->assertTrue((bool) $this->product->fresh()->has_variants);
    }

    public function test_merchant_cannot_touch_another_stores_product(): void
    {
        $otherStore = Store::create(['name' => 'Other', 'slug' => 'other', 'status' => 'active']);
        $otherProduct = Product::create([
            'store_id' => $otherStore->id,
            'title' => 'Sugar', 'price' => 70, 'category' => 'Grains', 'stock' => 10,
        ]);

        Sanctum::actingAs($this->merchant);

        $this->postJson("/api/products/{$otherProduct->id}/variants", [
            'name' => 'Bag',
            'base_unit_quantity' => 1,
            'price' => 70,
        ])->assertNotFound();
    }

    public function test_admin_can_manage_variants_on_any_product(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/products/{$this->product->id}/variants", [
            'name' => '5kg Pack',
            'base_unit_quantity' => 5,
            'price' => 280,
        ])->assertCreated();
    }

    public function test_duplicate_option_name_is_rejected(): void
    {
        Sanctum::actingAs($this->merchant);

        $this->postJson("/api/products/{$this->product->id}/variants", [
            'name' => 'loose (1kg)',
            'base_unit_quantity' => 1,
            'price' => 60,
        ])->assertStatus(422);
    }

    public function test_zero_or_negative_ratio_is_rejected(): void
    {
        Sanctum::actingAs($this->merchant);

        $this->postJson("/api/products/{$this->product->id}/variants", [
            'name' => 'Broken',
            'base_unit_quantity' => 0,
            'price' => 10,
        ])->assertStatus(422);
    }

    public function test_fractional_ratio_rejected_for_discrete_base_unit(): void
    {
        // Piece cannot be split, so half a piece is not a valid packaging ratio.
        $this->product->update(['base_unit_id' => Unit::defaultUnit()->id]);

        Sanctum::actingAs($this->merchant);

        $this->postJson("/api/products/{$this->product->id}/variants", [
            'name' => 'Half',
            'base_unit_quantity' => 0.5,
            'price' => 30,
        ])->assertStatus(422);
    }

    public function test_only_one_variant_stays_default(): void
    {
        Sanctum::actingAs($this->merchant);

        $this->postJson("/api/products/{$this->product->id}/variants", [
            'name' => '25kg Sack',
            'base_unit_quantity' => 25,
            'price' => 1300,
            'is_default' => true,
        ])->assertCreated();

        $defaults = ProductVariant::query()
            ->where('product_id', $this->product->id)
            ->where('is_default', true)
            ->count();

        $this->assertSame(1, $defaults);
    }

    public function test_deactivating_the_default_moves_it_to_an_active_option(): void
    {
        Sanctum::actingAs($this->merchant);

        $sack = ProductVariant::create([
            'product_id' => $this->product->id,
            'name' => '25kg Sack', 'base_unit_quantity' => 25, 'price' => 1300,
        ]);

        $original = ProductVariant::query()
            ->where('product_id', $this->product->id)
            ->where('name', 'Loose (1kg)')
            ->firstOrFail();

        // Retire the current default.
        $this->putJson("/api/products/{$this->product->id}/variants/{$original->id}", [
            'name' => 'Loose (1kg)',
            'base_unit_quantity' => 1,
            'price' => 60,
            'is_active' => false,
        ])->assertOk();

        $this->assertFalse((bool) $original->fresh()->is_default);
        $this->assertTrue((bool) $sack->fresh()->is_default);
    }

    public function test_last_remaining_option_cannot_be_deleted(): void
    {
        Sanctum::actingAs($this->merchant);

        $only = ProductVariant::query()->where('product_id', $this->product->id)->firstOrFail();

        $this->deleteJson("/api/products/{$this->product->id}/variants/{$only->id}")
            ->assertStatus(409);
    }

    public function test_variant_with_order_history_is_hidden_not_deleted(): void
    {
        $sack = ProductVariant::create([
            'product_id' => $this->product->id,
            'name' => '25kg Sack', 'base_unit_quantity' => 25, 'price' => 1300,
        ]);

        $order = Order::create([
            'user_id' => null,
            'total_amount' => 1300,
            'status' => 'pending',
            'shipping_address' => 'Barbaza',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $sack->id,
            'variant_name' => '25kg Sack',
            'quantity' => 1,
            'base_units_deducted' => 25,
            'price' => 1300,
        ]);

        Sanctum::actingAs($this->merchant);

        $this->deleteJson("/api/products/{$this->product->id}/variants/{$sack->id}")->assertOk();

        // Still present so the receipt resolves, but no longer sellable.
        $this->assertDatabaseHas('product_variants', ['id' => $sack->id]);
        $this->assertFalse((bool) $sack->fresh()->is_active);
    }

    public function test_product_without_variants_is_healed_on_open(): void
    {
        // Mirrors production: products created before the variants rollout (or
        // after the backfill ran) have no options at all.
        $legacy = Product::create([
            'store_id' => $this->store->id,
            'title' => 'Pancit Canton',
            'price' => 45,
            'category' => 'Noodles',
            'stock' => 12,
        ]);

        $this->assertSame(0, $legacy->variants()->count());

        Sanctum::actingAs($this->merchant);

        $response = $this->getJson("/api/products/{$legacy->id}/variants")->assertOk();

        $variants = $response->json('variants');
        $this->assertCount(1, $variants);
        $this->assertSame('Noodles', $variants[0]['name']);
        $this->assertTrue($variants[0]['is_default']);
        $this->assertSame(12, $variants[0]['available_quantity']);
    }

    public function test_healing_is_idempotent(): void
    {
        $legacy = Product::create([
            'store_id' => $this->store->id,
            'title' => 'Miswa', 'price' => 12, 'category' => '', 'stock' => 3,
        ]);

        Sanctum::actingAs($this->merchant);

        $this->getJson("/api/products/{$legacy->id}/variants")->assertOk();
        $this->getJson("/api/products/{$legacy->id}/variants")->assertOk();

        // Opening the editor twice must not stack duplicate defaults.
        $this->assertSame(1, $legacy->variants()->count());
        $this->assertSame('Default', $legacy->variants()->first()->name);
    }

    public function test_customer_cannot_manage_variants(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson("/api/products/{$this->product->id}/variants", [
            'name' => 'Sneaky',
            'base_unit_quantity' => 1,
            'price' => 1,
        ])->assertNotFound();
    }
}
