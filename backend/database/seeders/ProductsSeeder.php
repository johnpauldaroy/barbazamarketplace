<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductsSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('products')->truncate();

        DB::table('products')->insert([
            ['id' =>  6, 'store_id' => 1, 'title' => 'Native Cacao',            'description' => null,    'price' => 100.00, 'category' => 'Sweet Delicacy',      'image' => null, 'stock' =>  99, 'created_at' => '2026-03-23 05:55:41', 'updated_at' => '2026-03-23 17:45:20'],
            ['id' =>  7, 'store_id' => 1, 'title' => 'Miswa',                   'description' => null,    'price' => 280.00, 'category' => 'Local Food Products', 'image' => null, 'stock' =>  24, 'created_at' => '2026-03-23 17:37:12', 'updated_at' => '2026-03-23 17:37:12'],
            ['id' =>  8, 'store_id' => 1, 'title' => 'Pancit Canton (Round)',   'description' => null,    'price' =>  12.00, 'category' => 'Local Food Products', 'image' => null, 'stock' =>  50, 'created_at' => '2026-03-23 17:37:49', 'updated_at' => '2026-03-23 17:45:53'],
            ['id' =>  9, 'store_id' => 1, 'title' => 'Pancit Canton (Square)',  'description' => null,    'price' =>  45.00, 'category' => 'Local Food Products', 'image' => null, 'stock' =>  50, 'created_at' => '2026-03-23 17:38:09', 'updated_at' => '2026-03-23 17:45:47'],
            ['id' => 10, 'store_id' => 1, 'title' => 'Pancit Lomi',             'description' => null,    'price' =>  22.00, 'category' => 'Local Food Products', 'image' => null, 'stock' =>  20, 'created_at' => '2026-03-23 17:38:26', 'updated_at' => '2026-03-23 17:40:03'],
            ['id' => 11, 'store_id' => 1, 'title' => 'Pancit Molo',             'description' => null,    'price' =>  12.00, 'category' => 'Local Food Products', 'image' => null, 'stock' =>  24, 'created_at' => '2026-03-23 17:38:40', 'updated_at' => '2026-03-23 17:40:14'],
            ['id' => 12, 'store_id' => 1, 'title' => 'Batwan Powder',           'description' => null,    'price' => 180.00, 'category' => 'Local Food Products', 'image' => null, 'stock' =>  50, 'created_at' => '2026-03-23 18:13:45', 'updated_at' => '2026-03-23 18:17:45'],
            ['id' => 13, 'store_id' => 1, 'title' => 'Ginger Powder',           'description' => null,    'price' => 180.00, 'category' => 'Local Food Products', 'image' => null, 'stock' =>  50, 'created_at' => '2026-03-23 18:14:11', 'updated_at' => '2026-03-23 18:17:37'],
            ['id' => 14, 'store_id' => 1, 'title' => 'Malunggay Powder',        'description' => null,    'price' => 120.00, 'category' => 'Local Food Products', 'image' => null, 'stock' =>  50, 'created_at' => '2026-03-23 18:14:31', 'updated_at' => '2026-03-23 18:17:23'],
            ['id' => 15, 'store_id' => 1, 'title' => 'Squash Canton Classic',   'description' => null,    'price' =>  45.00, 'category' => 'Local Food Products', 'image' => null, 'stock' =>  49, 'created_at' => '2026-03-23 18:14:51', 'updated_at' => '2026-03-25 18:27:20'],
            ['id' => 16, 'store_id' => 1, 'title' => 'Squash Canton Malunggay', 'description' => null,    'price' =>  45.00, 'category' => 'Local Food Products', 'image' => null, 'stock' =>  50, 'created_at' => '2026-03-23 18:15:20', 'updated_at' => '2026-03-23 18:17:08'],
            ['id' => 17, 'store_id' => 1, 'title' => 'Squash Canton Saluyot',   'description' => null,    'price' =>  45.00, 'category' => 'Local Food Products', 'image' => null, 'stock' =>  49, 'created_at' => '2026-03-23 18:15:52', 'updated_at' => '2026-03-25 18:25:26'],
            ['id' => 18, 'store_id' => 1, 'title' => 'Turmeric Powder',         'description' => null,    'price' => 120.00, 'category' => 'Local Food Products', 'image' => null, 'stock' =>  47, 'created_at' => '2026-03-23 18:16:24', 'updated_at' => '2026-03-25 22:36:35'],
            ['id' => 19, 'store_id' => 1, 'title' => 'Veggie Stick',            'description' => null,    'price' =>  10.00, 'category' => 'Local Food Products', 'image' => null, 'stock' =>  43, 'created_at' => '2026-03-23 18:16:41', 'updated_at' => '2026-05-28 21:56:43'],
            ['id' => 24, 'store_id' => 2, 'title' => 'Test',                    'description' => 'ffsdf', 'price' => 233.00, 'category' => 'Sweet Delicacy',      'image' => null, 'stock' =>  34, 'created_at' => '2026-05-28 23:45:27', 'updated_at' => '2026-05-28 23:45:27'],
        ]);
    }
}
