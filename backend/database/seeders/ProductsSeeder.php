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
            ['id' =>  6, 'store_id' => 1, 'title' => 'Native Cacao',            'description' => null,     'price' => 100.00, 'category' => 'Sweet Delicacy',      'image' => 'products/KFvCDQuCBmUv6YZq4EJroRBfxPD1dhSpbWC6RGrv.jpg', 'stock' =>  99, 'created_at' => '2026-03-23 05:55:41', 'updated_at' => '2026-03-23 17:45:20'],
            ['id' =>  7, 'store_id' => 1, 'title' => 'Miswa',                   'description' => null,     'price' => 280.00, 'category' => 'Local Food Products', 'image' => 'products/8FKt7gRPFQKUDDaJpe3CzKGE4x9obaTMGU9uMyuP.jpg', 'stock' =>  24, 'created_at' => '2026-03-23 17:37:12', 'updated_at' => '2026-03-23 17:37:12'],
            ['id' =>  8, 'store_id' => 1, 'title' => 'Pancit Canton (Round)',   'description' => null,     'price' =>  12.00, 'category' => 'Local Food Products', 'image' => 'products/vB567kMU6TkgFuqaGoiHEWBrMXdBtEoO6OCK5bsB.jpg', 'stock' =>  50, 'created_at' => '2026-03-23 17:37:49', 'updated_at' => '2026-03-23 17:45:53'],
            ['id' =>  9, 'store_id' => 1, 'title' => 'Pancit Canton (Square)',  'description' => null,     'price' =>  45.00, 'category' => 'Local Food Products', 'image' => 'products/B9jDS3wtpPvrBHb8Apwm3OJges6cJ4l1QCTvtdpz.jpg', 'stock' =>  50, 'created_at' => '2026-03-23 17:38:09', 'updated_at' => '2026-03-23 17:45:47'],
            ['id' => 10, 'store_id' => 1, 'title' => 'Pancit Lomi',             'description' => null,     'price' =>  22.00, 'category' => 'Local Food Products', 'image' => 'products/IqDF4dnMY5SZnja1VVJGh9XuWfqjGGwnkbYDMFol.jpg', 'stock' =>  20, 'created_at' => '2026-03-23 17:38:26', 'updated_at' => '2026-03-23 17:40:03'],
            ['id' => 11, 'store_id' => 1, 'title' => 'Pancit Molo',             'description' => null,     'price' =>  12.00, 'category' => 'Local Food Products', 'image' => 'products/RvaeCePp0imNil7XMxooc9ebtXx6TOro0P9bUTRE.jpg', 'stock' =>  24, 'created_at' => '2026-03-23 17:38:40', 'updated_at' => '2026-03-23 17:40:14'],
            ['id' => 12, 'store_id' => 1, 'title' => 'Batwan Powder',           'description' => null,     'price' => 180.00, 'category' => 'Local Food Products', 'image' => 'products/YawdS3c3a83TlZEJfiHBnVR2rarl2VFYNe83TXhW.jpg', 'stock' =>  50, 'created_at' => '2026-03-23 18:13:45', 'updated_at' => '2026-03-23 18:17:45'],
            ['id' => 13, 'store_id' => 1, 'title' => 'Ginger Powder',           'description' => null,     'price' => 180.00, 'category' => 'Local Food Products', 'image' => 'products/d02egfeBYT3rdktRzE3cnXEumzzvkbDgsUDBtFjL.jpg', 'stock' =>  50, 'created_at' => '2026-03-23 18:14:11', 'updated_at' => '2026-03-23 18:17:37'],
            ['id' => 14, 'store_id' => 1, 'title' => 'Malunggay Powder',        'description' => null,     'price' => 120.00, 'category' => 'Local Food Products', 'image' => 'products/KbY6fab38rbQTXHwwdHjnETD6Q2t2NPApeAz4yQZ.jpg', 'stock' =>  50, 'created_at' => '2026-03-23 18:14:31', 'updated_at' => '2026-03-23 18:17:23'],
            ['id' => 15, 'store_id' => 1, 'title' => 'Squash Canton Classic',   'description' => null,     'price' =>  45.00, 'category' => 'Local Food Products', 'image' => 'products/lUThcuS0PSdbzIZrjGXBjiglM5Ivp7TIbIYHhE3z.jpg', 'stock' =>  49, 'created_at' => '2026-03-23 18:14:51', 'updated_at' => '2026-03-25 18:27:20'],
            ['id' => 16, 'store_id' => 1, 'title' => 'Squash Canton Malunggay', 'description' => null,     'price' =>  45.00, 'category' => 'Local Food Products', 'image' => 'products/Tb6GHQKvpGPBz9Vbcx02Jwhast7EmjJdo0JJoroA.jpg', 'stock' =>  50, 'created_at' => '2026-03-23 18:15:20', 'updated_at' => '2026-03-23 18:17:08'],
            ['id' => 17, 'store_id' => 1, 'title' => 'Squash Canton Saluyot',   'description' => null,     'price' =>  45.00, 'category' => 'Local Food Products', 'image' => 'products/Jr5nkv8z14j487JIhGEogZOosbIPhPymVW4EcE4P.jpg', 'stock' =>  49, 'created_at' => '2026-03-23 18:15:52', 'updated_at' => '2026-03-25 18:25:26'],
            ['id' => 18, 'store_id' => 1, 'title' => 'Turmeric Powder',         'description' => null,     'price' => 120.00, 'category' => 'Local Food Products', 'image' => 'products/65vI1YXQfnD7haEyfOnS6jfxg3yiUlgv4n5aWixT.jpg', 'stock' =>  47, 'created_at' => '2026-03-23 18:16:24', 'updated_at' => '2026-03-25 22:36:35'],
            ['id' => 19, 'store_id' => 1, 'title' => 'Veggie Stick',            'description' => null,     'price' =>  10.00, 'category' => 'Local Food Products', 'image' => 'products/ht8gaczRrYIaXaytpDb9NNPwEZo9DQIaVsr0f0Cr.jpg', 'stock' =>  43, 'created_at' => '2026-03-23 18:16:41', 'updated_at' => '2026-05-28 21:56:43'],
            ['id' => 24, 'store_id' => 2, 'title' => 'Test',                    'description' => 'ffsdf',  'price' => 233.00, 'category' => 'Sweet Delicacy',      'image' => 'products/ctjGKMBceUYFyo2KTDHi4QUiObL050Pe059G7ymU.jpg', 'stock' =>  34, 'created_at' => '2026-05-28 23:45:27', 'updated_at' => '2026-05-28 23:45:27'],
        ]);
    }
}
