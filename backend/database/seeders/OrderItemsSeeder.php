<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OrderItemsSeeder extends Seeder
{
    public function run(): void
    {
        // Test order line items removed alongside OrdersSeeder.
        DB::table('order_items')->truncate();
    }
}
