<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\Unit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductVariantInventoryTest extends TestCase
{
    use RefreshDatabase;

    private function riceProduct(float $stock = 50): Product
    {
        return Product::create([
            'store_id' => Store::ensurePlatformStore()->id,
            'title' => 'Rice',
            'price' => 60,
            'category' => 'Grains',
            'stock' => $stock,
            'base_unit_id' => Unit::query()->where('code', 'kg')->value('id'),
            'has_variants' => true,
        ]);
    }

    public function test_units_are_seeded_with_fractional_flags(): void
    {
        $this->assertNotNull(Unit::defaultUnit());
        $this->assertSame('pc', Unit::defaultUnit()->code);

        $this->assertFalse(Unit::query()->where('code', 'pc')->value('is_fractional'));
        $this->assertTrue((bool) Unit::query()->where('code', 'kg')->value('is_fractional'));
    }

    public function test_available_quantity_is_derived_from_shared_base_stock(): void
    {
        $product = $this->riceProduct(50);

        $loose = ProductVariant::create([
            'product_id' => $product->id, 'name' => 'Loose (1kg)',
            'base_unit_quantity' => 1, 'price' => 60, 'is_default' => true,
        ]);
        $pack = ProductVariant::create([
            'product_id' => $product->id, 'name' => '5kg Pack',
            'base_unit_quantity' => 5, 'price' => 280,
        ]);
        $sack = ProductVariant::create([
            'product_id' => $product->id, 'name' => '25kg Sack',
            'base_unit_quantity' => 25, 'price' => 1300,
        ]);

        // One physical pool of 50kg, expressed three different ways.
        $this->assertSame(50, $loose->availableQuantity());
        $this->assertSame(10, $pack->availableQuantity());
        $this->assertSame(2, $sack->availableQuantity());
    }

    public function test_selling_one_variant_reduces_availability_of_all_others(): void
    {
        $product = $this->riceProduct(50);
        $pack = ProductVariant::create([
            'product_id' => $product->id, 'name' => '5kg Pack',
            'base_unit_quantity' => 5, 'price' => 280, 'is_default' => true,
        ]);
        $sack = ProductVariant::create([
            'product_id' => $product->id, 'name' => '25kg Sack',
            'base_unit_quantity' => 25, 'price' => 1300,
        ]);

        // Sell one sack: 25kg leaves the shared pool.
        $product->stock = $product->stock - $sack->baseUnitsFor(1);
        $product->save();

        $pack->refresh()->load('product');
        $sack->refresh()->load('product');

        $this->assertSame(5, $pack->availableQuantity());
        $this->assertSame(1, $sack->availableQuantity());
    }

    public function test_variant_is_out_of_stock_when_remainder_cannot_cover_it(): void
    {
        $product = $this->riceProduct(14);
        $pack = ProductVariant::create([
            'product_id' => $product->id, 'name' => '5kg Pack',
            'base_unit_quantity' => 5, 'price' => 280, 'is_default' => true,
        ]);
        $sack = ProductVariant::create([
            'product_id' => $product->id, 'name' => '25kg Sack',
            'base_unit_quantity' => 25, 'price' => 1300,
        ]);

        // 14kg left: packs still sellable, sacks are not, even though stock > 0.
        $this->assertTrue($pack->isInStock());
        $this->assertFalse($sack->isInStock());
        $this->assertSame(0, $sack->availableQuantity());
    }

    public function test_base_units_for_multiplies_by_quantity(): void
    {
        $product = $this->riceProduct(100);
        $sack = ProductVariant::create([
            'product_id' => $product->id, 'name' => '25kg Sack',
            'base_unit_quantity' => 25, 'price' => 1300, 'is_default' => true,
        ]);

        $this->assertSame(75.0, $sack->baseUnitsFor(3));
    }

    public function test_zero_ratio_variant_is_never_sellable(): void
    {
        $product = $this->riceProduct(50);
        $broken = ProductVariant::create([
            'product_id' => $product->id, 'name' => 'Misconfigured',
            'base_unit_quantity' => 0, 'price' => 10, 'is_default' => true,
        ]);

        // Guards against a division-by-zero and against selling infinite units.
        $this->assertSame(0, $broken->availableQuantity());
        $this->assertFalse($broken->isInStock());
    }

    public function test_default_variant_falls_back_when_default_is_inactive(): void
    {
        $product = $this->riceProduct(50);
        ProductVariant::create([
            'product_id' => $product->id, 'name' => 'Retired',
            'base_unit_quantity' => 1, 'price' => 60,
            'is_default' => false, 'is_active' => false, 'sort_order' => 0,
        ]);
        $live = ProductVariant::create([
            'product_id' => $product->id, 'name' => 'Live',
            'base_unit_quantity' => 5, 'price' => 280,
            'is_default' => false, 'is_active' => true, 'sort_order' => 1,
        ]);

        $this->assertSame($live->id, $product->defaultVariant()->id);
    }

    public function test_fractional_stock_is_preserved(): void
    {
        $product = $this->riceProduct(10);
        $product->stock = 7.5;
        $product->save();

        $this->assertSame('7.500', (string) $product->fresh()->stock);
    }
}
