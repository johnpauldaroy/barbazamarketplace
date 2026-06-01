<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OrderItemsSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('order_items')->truncate();

        DB::table('order_items')->insert([
            ['id' => 11, 'order_id' =>  6, 'product_id' =>  6, 'quantity' => 1, 'price' => 100.00, 'created_at' => '2026-03-23 06:39:45', 'updated_at' => '2026-03-23 06:39:45'],
            ['id' => 12, 'order_id' =>  7, 'product_id' => 19, 'quantity' => 1, 'price' =>  10.00, 'created_at' => '2026-03-23 19:00:08', 'updated_at' => '2026-03-23 19:00:08'],
            ['id' => 15, 'order_id' =>  9, 'product_id' => 19, 'quantity' => 1, 'price' =>  10.00, 'created_at' => '2026-03-24 06:01:14', 'updated_at' => '2026-03-24 06:01:14'],
            ['id' => 16, 'order_id' =>  9, 'product_id' => 18, 'quantity' => 1, 'price' => 120.00, 'created_at' => '2026-03-24 06:01:14', 'updated_at' => '2026-03-24 06:01:14'],
            ['id' => 19, 'order_id' => 12, 'product_id' => 19, 'quantity' => 1, 'price' =>  10.00, 'created_at' => '2026-03-25 18:25:26', 'updated_at' => '2026-03-25 18:25:26'],
            ['id' => 20, 'order_id' => 12, 'product_id' => 18, 'quantity' => 1, 'price' => 120.00, 'created_at' => '2026-03-25 18:25:26', 'updated_at' => '2026-03-25 18:25:26'],
            ['id' => 21, 'order_id' => 12, 'product_id' => 17, 'quantity' => 1, 'price' =>  45.00, 'created_at' => '2026-03-25 18:25:26', 'updated_at' => '2026-03-25 18:25:26'],
            ['id' => 22, 'order_id' => 13, 'product_id' => 19, 'quantity' => 1, 'price' =>  10.00, 'created_at' => '2026-03-25 18:27:20', 'updated_at' => '2026-03-25 18:27:20'],
            ['id' => 23, 'order_id' => 13, 'product_id' => 15, 'quantity' => 1, 'price' =>  45.00, 'created_at' => '2026-03-25 18:27:20', 'updated_at' => '2026-03-25 18:27:20'],
            ['id' => 24, 'order_id' => 14, 'product_id' => 19, 'quantity' => 2, 'price' =>  10.00, 'created_at' => '2026-03-25 22:36:35', 'updated_at' => '2026-03-25 22:36:35'],
            ['id' => 25, 'order_id' => 14, 'product_id' => 18, 'quantity' => 1, 'price' => 120.00, 'created_at' => '2026-03-25 22:36:35', 'updated_at' => '2026-03-25 22:36:35'],
            ['id' => 26, 'order_id' => 15, 'product_id' => 19, 'quantity' => 1, 'price' =>  10.00, 'created_at' => '2026-05-28 21:56:43', 'updated_at' => '2026-05-28 21:56:43'],
        ]);
    }
}
