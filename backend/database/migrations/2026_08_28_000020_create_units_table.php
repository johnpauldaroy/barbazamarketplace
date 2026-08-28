<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Selling units are a small shared vocabulary. Keeping them in a table (rather
     * than free text on the product) stops stores inventing "pc" / "pcs" / "piece"
     * for the same thing.
     */
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->string('code', 16)->unique();
            $table->string('label', 48);
            // Weight and volume can be sold in fractions; discrete items cannot.
            $table->boolean('is_fractional')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $now = now();
        DB::table('units')->insert([
            ['code' => 'pc',   'label' => 'Piece',    'is_fractional' => false, 'sort_order' => 1,  'created_at' => $now, 'updated_at' => $now],
            ['code' => 'pack', 'label' => 'Pack',     'is_fractional' => false, 'sort_order' => 2,  'created_at' => $now, 'updated_at' => $now],
            ['code' => 'box',  'label' => 'Box',      'is_fractional' => false, 'sort_order' => 3,  'created_at' => $now, 'updated_at' => $now],
            ['code' => 'sack', 'label' => 'Sack',     'is_fractional' => false, 'sort_order' => 4,  'created_at' => $now, 'updated_at' => $now],
            ['code' => 'bag',  'label' => 'Bag',      'is_fractional' => false, 'sort_order' => 5,  'created_at' => $now, 'updated_at' => $now],
            ['code' => 'kg',   'label' => 'Kilogram', 'is_fractional' => true,  'sort_order' => 6,  'created_at' => $now, 'updated_at' => $now],
            ['code' => 'g',    'label' => 'Gram',     'is_fractional' => true,  'sort_order' => 7,  'created_at' => $now, 'updated_at' => $now],
            ['code' => 'L',    'label' => 'Liter',    'is_fractional' => true,  'sort_order' => 8,  'created_at' => $now, 'updated_at' => $now],
            ['code' => 'ml',   'label' => 'Milliliter', 'is_fractional' => true, 'sort_order' => 9, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};
