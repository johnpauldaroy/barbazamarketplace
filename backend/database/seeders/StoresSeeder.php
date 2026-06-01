<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StoresSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('stores')->truncate();

        DB::table('stores')->insert([
            [
                'id'            => 1,
                'name'          => 'Golden Start Noodles & Miki Haus',
                'slug'          => 'golden-star-noodles',
                'status'        => 'active',
                'description'   => 'Golden Star Noodles & Miki Haus Store',
                'contact_email' => null,
                'contact_phone' => null,
                'address_line_1'=> null,
                'address_line_2'=> null,
                'city'          => null,
                'province'      => null,
                'postal_code'   => null,
                'country'       => null,
                'logo_image'    => null,
                'cover_image'   => null,
                'facebook_url'  => 'https://www.facebook.com/barbazacoopofficial',
                'created_at'    => '2026-03-23 23:44:48',
                'updated_at'    => '2026-05-31 22:54:07',
            ],
            [
                'id'            => 2,
                'name'          => 'Perciii',
                'slug'          => 'percibal',
                'status'        => 'active',
                'description'   => 'Percibal Store',
                'contact_email' => 'pers@gmail.com',
                'contact_phone' => '0919 065 4532',
                'address_line_1'=> 'Poblacion, Barbaza, Antique',
                'address_line_2'=> null,
                'city'          => 'Barbaza',
                'province'      => 'Antique',
                'postal_code'   => '5706',
                'country'       => 'Philippines',
                'logo_image'    => 'stores/logo/SqlIxD4kdMi8r78Blv1qB6Es2bxrPjiVlOE460Tv.jpg',
                'cover_image'   => 'stores/cover/GYc0UGB9IvIa1oelfdMMgUfAE4Gv3slxmm9FfS2T.jpg',
                'facebook_url'  => 'https://www.facebook.com/barbazacoopofficial',
                'created_at'    => '2026-03-24 00:04:17',
                'updated_at'    => '2026-05-31 22:56:29',
            ],
        ]);
    }
}
