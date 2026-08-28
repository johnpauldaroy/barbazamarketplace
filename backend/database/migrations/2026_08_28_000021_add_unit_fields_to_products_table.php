<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $pieceUnitId = DB::table('units')->where('code', 'pc')->value('id');

        Schema::table('products', function (Blueprint $table) use ($pieceUnitId) {
            // The unit products.stock is counted in. Every variant's
            // base_unit_quantity is expressed in this unit.
            $table->foreignId('base_unit_id')
                ->nullable()
                ->default($pieceUnitId)
                ->after('stock')
                ->constrained('units')
                ->nullOnDelete();

            // Denormalised so product listings can avoid loading variants.
            $table->boolean('has_variants')->default(false)->after('base_unit_id');
        });

        // Stock becomes a count of base units, which may be fractional (kg, L).
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('stock', 12, 3)->default(0)->change();
        });

        DB::table('products')->whereNull('base_unit_id')->update(['base_unit_id' => $pieceUnitId]);
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['base_unit_id']);
            $table->dropColumn(['base_unit_id', 'has_variants']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->integer('stock')->default(0)->change();
        });
    }
};
