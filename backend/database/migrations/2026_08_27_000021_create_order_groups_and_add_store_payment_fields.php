<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_groups', function (Blueprint $table) {
            $table->id();
            $table->uuid('reference')->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('total_amount', 10, 2)->default(0);
            $table->timestamps();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('order_group_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->foreignId('store_id')->nullable()->after('order_group_id')->constrained()->nullOnDelete();
            $table->foreignId('store_payment_method_id')->nullable()->after('payment_method')->constrained('store_payment_methods')->nullOnDelete();
            $table->string('payment_method_label')->nullable()->after('store_payment_method_id');
            $table->json('payment_details')->nullable()->after('payment_method_label');
            $table->string('payment_status', 40)->default('unpaid')->after('payment_reference');
            $table->timestamp('payment_due_at')->nullable()->after('payment_status');
            $table->timestamp('paid_at')->nullable()->after('payment_due_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('store_payment_method_id');
            $table->dropConstrainedForeignId('store_id');
            $table->dropConstrainedForeignId('order_group_id');
            $table->dropColumn([
                'payment_method_label',
                'payment_details',
                'payment_status',
                'payment_due_at',
                'paid_at',
            ]);
        });

        Schema::dropIfExists('order_groups');
    }
};
