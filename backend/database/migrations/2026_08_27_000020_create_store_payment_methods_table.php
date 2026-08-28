<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_payment_methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('type', 40);
            $table->string('provider', 80)->nullable();
            $table->string('label', 120);
            $table->string('account_name')->nullable();
            $table->string('account_identifier')->nullable();
            $table->string('qr_image_path')->nullable();
            $table->text('instructions')->nullable();
            $table->boolean('is_enabled')->default(true);
            $table->boolean('requires_reference')->default(false);
            $table->boolean('requires_proof')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['store_id', 'is_enabled', 'sort_order'], 'store_payment_methods_lookup');
        });

        $now = now();
        $rows = DB::table('stores')->get(['id'])->map(fn ($store) => [
            'store_id' => $store->id,
            'type' => 'cod',
            'provider' => null,
            'label' => 'Cash on Delivery',
            'account_name' => null,
            'account_identifier' => null,
            'qr_image_path' => null,
            'instructions' => 'Pay in cash when your order is delivered.',
            'is_enabled' => true,
            'requires_reference' => false,
            'requires_proof' => false,
            'sort_order' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();

        if ($rows !== []) {
            DB::table('store_payment_methods')->insert($rows);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('store_payment_methods');
    }
};
