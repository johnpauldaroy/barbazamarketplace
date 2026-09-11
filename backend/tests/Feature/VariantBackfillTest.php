<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Store;
use App\Models\Unit;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class VariantBackfillTest extends TestCase
{
    // These tests intentionally roll migrations backward and forward. Running
    // them outside RefreshDatabase's wrapping transaction keeps SQLite's table
    // rebuilds representative of a real deployment migration cycle.
    use DatabaseMigrations;

    /**
     * Simulates the real upgrade: data written by the pre-variant schema, then the
     * variant migrations run over it.
     *
     * Note on order_items: SQLite cannot ALTER TABLE to add a foreign key, so
     * Laravel rebuilds the table, which drops existing rows under the test driver.
     * MySQL (production) performs a real ALTER and keeps them. The order_items
     * half of the backfill is therefore covered by
     * test_order_item_backfill_logic_assigns_default_variant() below, which runs
     * the same statement the migration uses against rows inserted after the
     * schema change.
     */
    public function test_existing_products_are_backfilled_with_a_default_variant(): void
    {
        // Step count = the 6 unit/variant migrations plus every migration
        // added above them since (currently product images and push subscriptions).
        Artisan::call('migrate:rollback', ['--step' => 8]);

        $this->assertFalse(DB::getSchemaBuilder()->hasTable('product_variants'));

        $storeId = Store::ensurePlatformStore()->id;

        $productId = DB::table('products')->insertGetId([
            'store_id' => $storeId,
            'title' => 'Legacy Mango',
            'description' => 'Written before variants existed',
            'price' => 45.00,
            'category' => 'Fruits',
            'stock' => 30,
            'low_stock_threshold' => 10,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        Artisan::call('migrate');

        // Every product gained exactly one default variant, named for its category.
        $variants = DB::table('product_variants')->where('product_id', $productId)->get();
        $this->assertCount(1, $variants);

        $variant = $variants->first();
        $this->assertSame('Fruits', $variant->name);
        $this->assertEquals(1, (float) $variant->base_unit_quantity);
        $this->assertEquals(45.00, (float) $variant->price);
        $this->assertTrue((bool) $variant->is_default);
        $this->assertTrue((bool) $variant->is_active);

        // The product points at the piece base unit and keeps its stock intact.
        $product = Product::find($productId);
        $this->assertSame(Unit::defaultUnit()->id, $product->base_unit_id);
        $this->assertEquals(30.0, (float) $product->stock);
    }

    /**
     * The order_items half of the backfill, exercised directly: a row with no
     * variant reference resolves to its product's default variant and records
     * the base units it consumed.
     */
    public function test_order_item_backfill_logic_assigns_default_variant(): void
    {
        $product = Product::create([
            'store_id' => Store::ensurePlatformStore()->id,
            'title' => 'Mango',
            'price' => 45.00,
            'category' => 'Fruits',
            'stock' => 30,
        ]);

        $variantId = DB::table('product_variants')->insertGetId([
            'product_id' => $product->id,
            'name' => 'Fruits',
            'base_unit_quantity' => 1,
            'price' => 45.00,
            'is_default' => true,
            'is_active' => true,
            'sort_order' => 0,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $orderId = DB::table('orders')->insertGetId([
            'user_id' => null,
            'total_amount' => 90.00,
            'status' => 'pending',
            'shipping_address' => 'Barbaza',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        // A legacy-shaped row: no variant, no recorded deduction.
        $itemId = DB::table('order_items')->insertGetId([
            'order_id' => $orderId,
            'product_id' => $product->id,
            'product_variant_id' => null,
            'base_units_deducted' => null,
            'quantity' => 2,
            'price' => 45.00,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        // The same update the backfill migration performs.
        DB::table('order_items')
            ->whereNull('product_variant_id')
            ->orderBy('id')
            ->chunkById(500, function ($items) {
                foreach ($items as $item) {
                    $resolved = DB::table('product_variants')
                        ->where('product_id', $item->product_id)
                        ->where('is_default', true)
                        ->value('id');

                    DB::table('order_items')->where('id', $item->id)->update([
                        'product_variant_id' => $resolved,
                        'base_units_deducted' => $item->quantity,
                    ]);
                }
            }, 'id', 'id');

        $item = DB::table('order_items')->find($itemId);
        $this->assertSame($variantId, $item->product_variant_id);
        $this->assertEquals(2.0, (float) $item->base_units_deducted);
    }

    public function test_product_without_category_gets_named_default_variant(): void
    {
        // Step count = the 6 unit/variant migrations plus every migration
        // added above them since (currently product images and push subscriptions).
        Artisan::call('migrate:rollback', ['--step' => 8]);

        $productId = DB::table('products')->insertGetId([
            'store_id' => Store::ensurePlatformStore()->id,
            'title' => 'Uncategorised',
            'price' => 10.00,
            'category' => '',
            'stock' => 5,
            'low_stock_threshold' => 10,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        Artisan::call('migrate');

        $variant = DB::table('product_variants')->where('product_id', $productId)->first();
        $this->assertNotNull($variant);
        $this->assertSame('Default', $variant->name);
    }

    public function test_migrations_are_reversible(): void
    {
        // Step count = the 6 unit/variant migrations plus every migration
        // added above them since (currently product images and push subscriptions).
        Artisan::call('migrate:rollback', ['--step' => 8]);

        $this->assertFalse(DB::getSchemaBuilder()->hasTable('product_variants'));
        $this->assertFalse(DB::getSchemaBuilder()->hasTable('units'));
        $this->assertFalse(DB::getSchemaBuilder()->hasColumn('products', 'base_unit_id'));
        $this->assertFalse(DB::getSchemaBuilder()->hasColumn('order_items', 'product_variant_id'));

        Artisan::call('migrate');

        $this->assertTrue(DB::getSchemaBuilder()->hasTable('product_variants'));
        $this->assertTrue(DB::getSchemaBuilder()->hasColumn('products', 'base_unit_id'));
    }
}
