<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Give every existing product a single default variant so the storefront,
     * cart and checkout keep working unchanged after variants land. The name
     * mirrors what the frontend already synthesised in buildSimpleCartItem()
     * (the product's category), so nothing visibly changes for shoppers.
     */
    public function up(): void
    {
        DB::transaction(function () {
            $now = now();

            DB::table('products')
                ->select('id', 'title', 'category', 'price')
                ->orderBy('id')
                ->chunkById(500, function ($products) use ($now) {
                    $rows = [];

                    foreach ($products as $product) {
                        $name = trim((string) $product->category);
                        if ($name === '') {
                            $name = 'Default';
                        }

                        $rows[] = [
                            'product_id' => $product->id,
                            'name' => $name,
                            'sku' => null,
                            'base_unit_quantity' => 1,
                            'price' => $product->price,
                            'is_default' => true,
                            'is_active' => true,
                            'sort_order' => 0,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                    }

                    if ($rows) {
                        DB::table('product_variants')->insert($rows);
                    }
                });

            // Point historical order items at their product's default variant and
            // record what each line consumed (1 base unit per item at this point).
            DB::table('order_items')
                ->select('order_items.id', 'order_items.product_id', 'order_items.quantity')
                ->whereNull('order_items.product_variant_id')
                ->orderBy('order_items.id')
                ->chunkById(500, function ($items) {
                    foreach ($items as $item) {
                        $variantId = DB::table('product_variants')
                            ->where('product_id', $item->product_id)
                            ->where('is_default', true)
                            ->value('id');

                        DB::table('order_items')
                            ->where('id', $item->id)
                            ->update([
                                'product_variant_id' => $variantId,
                                'base_units_deducted' => $item->quantity,
                            ]);
                    }
                }, 'id', 'id');
        });
    }

    public function down(): void
    {
        DB::transaction(function () {
            DB::table('order_items')->update([
                'product_variant_id' => null,
                'variant_name' => null,
                'base_units_deducted' => null,
            ]);

            DB::table('product_variants')->delete();
        });
    }
};
