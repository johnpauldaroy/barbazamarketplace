<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A variant is a way of packaging and pricing a product. It deliberately does
     * NOT carry its own stock: the product owns how much exists, and each variant
     * records how many base units one sale consumes. That keeps a piece, a pack
     * and a sack drawing from the same physical pool instead of three counters
     * that can each be sold down independently.
     */
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('sku', 64)->nullable();
            $table->decimal('base_unit_quantity', 12, 3)->default(1);
            $table->decimal('price', 10, 2);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['product_id', 'is_active']);
            $table->index(['product_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
