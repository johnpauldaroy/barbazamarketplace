<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OrdersSeeder extends Seeder
{
    public function run(): void
    {
        // Test order data removed. Seeding now leaves the marketplace with a
        // clean transaction history: no orders, zero revenue on the dashboard.
        // Users, stores, categories and products are seeded as usual.
        DB::table('order_items')->truncate();
        DB::table('orders')->truncate();
    }
}
