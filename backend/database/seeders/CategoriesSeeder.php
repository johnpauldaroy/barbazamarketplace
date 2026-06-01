<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategoriesSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('categories')->truncate();

        DB::table('categories')->insert([
            ['id' => 1, 'store_id' => 1, 'name' => 'Fruits',              'created_at' => '2026-03-23 16:37:24', 'updated_at' => '2026-03-23 16:37:24'],
            ['id' => 2, 'store_id' => 1, 'name' => 'Sweet Delicacy',      'created_at' => '2026-03-23 17:34:57', 'updated_at' => '2026-03-23 17:34:57'],
            ['id' => 3, 'store_id' => 1, 'name' => 'Local Food Products', 'created_at' => '2026-03-23 17:35:09', 'updated_at' => '2026-03-23 17:35:09'],
            ['id' => 4, 'store_id' => 2, 'name' => 'Vegetables',          'created_at' => '2026-03-24 00:06:16', 'updated_at' => '2026-03-24 00:06:16'],
            ['id' => 5, 'store_id' => 2, 'name' => 'Sweet Delicacy',      'created_at' => '2026-05-28 23:45:27', 'updated_at' => '2026-05-28 23:45:27'],
        ]);
    }
}
