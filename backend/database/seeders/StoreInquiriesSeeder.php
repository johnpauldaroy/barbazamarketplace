<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StoreInquiriesSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('store_inquiries')->truncate();

        DB::table('store_inquiries')->insert([
            [
                'id'                   => 1,
                'store_id'             => 2,
                'user_id'              => null,
                'name'                 => 'jp',
                'email'                => 'jp@gmail.com',
                'phone'                => '432432',
                'message'              => 'dl;kgjldafkjg;ldfkgjsd',
                'status'               => 'resolved',
                'resolved_at'          => '2026-03-24 23:51:35',
                'resolved_by_user_id'  => 6,
                'source_ip'            => '127.0.0.1',
                'created_at'           => '2026-03-24 22:27:22',
                'updated_at'           => '2026-03-24 23:51:35',
            ],
        ]);
    }
}
