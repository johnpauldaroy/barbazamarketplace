<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('units', function (Blueprint $table) {
            $table->string('dimension', 16)->default('count')->after('is_fractional');
            $table->decimal('conversion_factor', 18, 6)->default(1)->after('dimension');
            $table->boolean('is_active')->default(true)->after('conversion_factor');
        });

        DB::table('units')->where('code', 'pc')->update(['dimension' => 'count', 'conversion_factor' => 1, 'is_active' => true]);
        DB::table('units')->where('code', 'g')->update(['dimension' => 'mass', 'conversion_factor' => 1, 'is_active' => true]);
        DB::table('units')->where('code', 'kg')->update(['dimension' => 'mass', 'conversion_factor' => 1000, 'is_active' => true]);
        DB::table('units')->where('code', 'ml')->update(['dimension' => 'volume', 'conversion_factor' => 1, 'is_active' => true]);
        DB::table('units')->where('code', 'L')->update(['dimension' => 'volume', 'conversion_factor' => 1000, 'is_active' => true]);
        DB::table('units')->whereIn('code', ['pack', 'box', 'sack', 'bag'])->update(['dimension' => 'package', 'is_active' => false]);

        Schema::table('products', function (Blueprint $table) {
            $table->decimal('low_stock_threshold', 12, 3)->default(10)->change();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->foreignId('inventory_unit_id')->nullable()->after('base_units_deducted')->constrained('units')->nullOnDelete();
        });

        DB::table('order_items')->whereNull('inventory_unit_id')->orderBy('id')->chunkById(500, function ($items) {
            foreach ($items as $item) {
                DB::table('order_items')->where('id', $item->id)->update([
                    'inventory_unit_id' => DB::table('products')->where('id', $item->product_id)->value('base_unit_id'),
                ]);
            }
        });

        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->string('type', 32);
            $table->decimal('quantity_delta', 12, 3);
            $table->decimal('balance_after', 12, 3);
            $table->string('reason', 255)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['product_id', 'created_at']);
        });

        $now = now();
        DB::table('products')->orderBy('id')->chunkById(500, function ($products) use ($now) {
            DB::table('inventory_movements')->insert($products->map(fn ($product) => [
                'product_id' => $product->id,
                'unit_id' => $product->base_unit_id,
                'actor_id' => null,
                'order_id' => null,
                'type' => 'migration_opening',
                'quantity_delta' => $product->stock,
                'balance_after' => $product->stock,
                'reason' => 'Opening balance captured during unit-aware inventory migration.',
                'metadata' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all());
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropForeign(['inventory_unit_id']);
            $table->dropColumn('inventory_unit_id');
        });
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('low_stock_threshold')->default(10)->change();
        });
        Schema::table('units', function (Blueprint $table) {
            $table->dropColumn(['dimension', 'conversion_factor', 'is_active']);
        });
    }
};
