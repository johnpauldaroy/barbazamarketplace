<?php

use App\Models\Store;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $platformStore = Store::ensurePlatformStore();

        Schema::table('categories', function (Blueprint $table) use ($platformStore) {
            $table->foreignId('store_id')
                ->default($platformStore->id)
                ->after('id')
                ->constrained('stores')
                ->cascadeOnDelete();
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique('categories_name_unique');
            $table->unique(['store_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique(['store_id', 'name']);
            $table->unique('name');
            $table->dropForeign(['store_id']);
            $table->dropColumn('store_id');
        });
    }
};

