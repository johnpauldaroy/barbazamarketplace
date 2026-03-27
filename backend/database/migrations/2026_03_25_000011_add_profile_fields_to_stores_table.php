<?php

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
        Schema::table('stores', function (Blueprint $table) {
            $table->string('contact_email')->nullable()->after('description');
            $table->string('contact_phone')->nullable()->after('contact_email');
            $table->string('address_line_1')->nullable()->after('contact_phone');
            $table->string('address_line_2')->nullable()->after('address_line_1');
            $table->string('city')->nullable()->after('address_line_2');
            $table->string('province')->nullable()->after('city');
            $table->string('postal_code')->nullable()->after('province');
            $table->string('country')->nullable()->after('postal_code');
            $table->string('logo_image')->nullable()->after('country');
            $table->string('cover_image')->nullable()->after('logo_image');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn([
                'contact_email',
                'contact_phone',
                'address_line_1',
                'address_line_2',
                'city',
                'province',
                'postal_code',
                'country',
                'logo_image',
                'cover_image',
            ]);
        });
    }
};
