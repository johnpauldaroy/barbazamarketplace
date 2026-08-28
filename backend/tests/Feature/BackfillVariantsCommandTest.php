<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BackfillVariantsCommandTest extends TestCase
{
    use RefreshDatabase;

    private function makeProduct(string $title, string $category, $stock = 10): Product
    {
        $store = Store::firstOrCreate(
            ['slug' => 'noodle-haus'],
            ['name' => 'Noodle Haus', 'status' => 'active']
        );

        return Product::create([
            'store_id' => $store->id,
            'title' => $title,
            'price' => 45,
            'category' => $category,
            'stock' => $stock,
        ]);
    }

    public function test_it_gives_every_variantless_product_a_default(): void
    {
        $a = $this->makeProduct('Pancit Canton', 'Dry Goods');
        $b = $this->makeProduct('Pancit Lomi', 'Dry Goods');

        $this->artisan('products:backfill-variants')->assertSuccessful();

        $this->assertSame('Dry Goods', $a->fresh()->variants()->first()->name);
        $this->assertSame('Dry Goods', $b->fresh()->variants()->first()->name);
    }

    public function test_it_leaves_existing_options_untouched(): void
    {
        $product = $this->makeProduct('Rice', 'Grains', 50);
        ProductVariant::create([
            'product_id' => $product->id,
            'name' => '25kg Sack',
            'base_unit_quantity' => 25,
            'price' => 1300,
            'is_default' => true,
        ]);

        $this->artisan('products:backfill-variants')->assertSuccessful();

        // Must not append a second, competing default.
        $this->assertSame(1, $product->variants()->count());
        $this->assertSame('25kg Sack', $product->variants()->first()->name);
    }

    public function test_it_is_safe_to_run_twice(): void
    {
        $product = $this->makeProduct('Miswa', '');

        $this->artisan('products:backfill-variants')->assertSuccessful();
        $this->artisan('products:backfill-variants')->assertSuccessful();

        $this->assertSame(1, $product->variants()->count());
        $this->assertSame('Default', $product->variants()->first()->name);
    }

    public function test_dry_run_writes_nothing(): void
    {
        $product = $this->makeProduct('Fds', 'Poultry');

        $this->artisan('products:backfill-variants --dry-run')->assertSuccessful();

        $this->assertSame(0, $product->variants()->count());
    }
}
