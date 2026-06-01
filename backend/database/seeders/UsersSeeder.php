<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UsersSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('users')->truncate();

        DB::table('users')->insert([
            ['id' => 1, 'name' => 'JP',             'email' => 'it@barbazampc.coop', 'email_verified_at' => '2025-12-29 22:16:21', 'password' => '$2y$12$isW45ylE5XB4wB8nJTtKcu6Cgw8YzSnihRqccdUH2ifFUt.b1GI6.', 'is_admin' => 1, 'is_merchant' => 0, 'store_id' => null, 'remember_token' => 'SliYO16t3Y', 'created_at' => '2025-12-29 22:16:21', 'updated_at' => '2025-12-29 22:18:27'],
            ['id' => 2, 'name' => 'mutya',          'email' => 'mutya@gmail.com',     'email_verified_at' => null,                   'password' => '$2y$12$drcVUaGuntV9Qix0LNClQ.t1Ft2/2AZt.j8ebFYMXZLzktptI4Tqe', 'is_admin' => 1, 'is_merchant' => 0, 'store_id' => null, 'remember_token' => null, 'created_at' => null,                   'updated_at' => '2026-01-09 19:40:52'],
            ['id' => 3, 'name' => 'member',         'email' => 'member@gmail.com',    'email_verified_at' => null,                   'password' => '$2y$12$mUX5U5ZPTNT1YHFun//H7uU418GZ9K0F5KCYTsrxsa/UPczj3adYa', 'is_admin' => 0, 'is_merchant' => 0, 'store_id' => null, 'remember_token' => null, 'created_at' => '2026-03-23 06:06:45', 'updated_at' => '2026-03-23 06:06:45'],
            ['id' => 4, 'name' => 'jmm',            'email' => 'jmm@gmail.com',       'email_verified_at' => null,                   'password' => '$2y$12$GlYo96YtC3eGiF4B05On0O32iXRHll.iT0UIqNMvhY4zSoa0888Se', 'is_admin' => 0, 'is_merchant' => 0, 'store_id' => null, 'remember_token' => null, 'created_at' => '2026-03-23 06:29:30', 'updated_at' => '2026-03-23 06:29:30'],
            ['id' => 5, 'name' => 'Pers',           'email' => 'pers@gmail.com',      'email_verified_at' => null,                   'password' => '$2y$12$rLDm4aoqt0BmR5ptRqacPu.k619N28iaOLLDfI9P5WfcmyS4DTRw6', 'is_admin' => 0, 'is_merchant' => 1, 'store_id' => 2,    'remember_token' => null, 'created_at' => '2026-03-24 00:04:34', 'updated_at' => '2026-03-24 00:04:34'],
            ['id' => 6, 'name' => 'John Paul Daroy','email' => 'jp@gmail.com',        'email_verified_at' => null,                   'password' => '$2y$12$fHQRjgE7MLto8l1mddBCeONdZRUo5B/tg2ZrRDHgW4uDdvT2i7Onm', 'is_admin' => 0, 'is_merchant' => 1, 'store_id' => 2,    'remember_token' => null, 'created_at' => '2026-03-24 18:17:21', 'updated_at' => '2026-03-24 18:17:21'],
            ['id' => 7, 'name' => 'Jake',           'email' => 'jake@gmail.com',      'email_verified_at' => null,                   'password' => '$2y$12$vnpJoc95V3Z0KrppJBTTpu3IYDhTX.Cl1yqP7qM.fl6LxZhCImZC.', 'is_admin' => 0, 'is_merchant' => 0, 'store_id' => null, 'remember_token' => null, 'created_at' => '2026-05-28 21:56:04', 'updated_at' => '2026-05-28 21:56:04'],
        ]);
    }
}
