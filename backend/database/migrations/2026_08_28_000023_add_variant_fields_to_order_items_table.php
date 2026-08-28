<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            // Nullable: rows written before variants existed keep a null reference,
            // and the variant may later be deleted while history must still read.
            $table->foreignId('product_variant_id')
                ->nullable()
                ->after('product_id')
                ->constrained('product_variants')
                ->nullOnDelete();

            // Snapshots, alongside the existing price snapshot, so a receipt still
            // reads correctly after the variant is renamed or retired.
            $table->string('variant_name', 100)->nullable()->after('product_variant_id');

            // Recording what was actually deducted makes restock-on-cancel exact
            // even if the variant's ratio is edited afterwards.
            $table->decimal('base_units_deducted', 12, 3)->nullable()->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropForeign(['product_variant_id']);
            $table->dropColumn(['product_variant_id', 'variant_name', 'base_units_deducted']);
        });
    }
};
