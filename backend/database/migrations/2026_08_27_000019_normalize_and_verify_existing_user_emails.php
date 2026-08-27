<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function (): void {
            $users = DB::table('users')
                ->select(['id', 'email'])
                ->orderBy('id')
                ->get();

            $ownersByEmail = [];
            $conflictingIds = [];

            foreach ($users as $user) {
                $normalized = Str::lower(trim((string) $user->email));

                if (isset($ownersByEmail[$normalized])) {
                    $conflictingIds[] = $ownersByEmail[$normalized];
                    $conflictingIds[] = (int) $user->id;

                    continue;
                }

                $ownersByEmail[$normalized] = (int) $user->id;
            }

            if ($conflictingIds !== []) {
                $ids = implode(', ', array_values(array_unique($conflictingIds)));
                throw new RuntimeException(
                    "Email normalization found duplicate accounts. Resolve user IDs {$ids} before rerunning the migration."
                );
            }

            foreach ($users as $user) {
                $normalized = Str::lower(trim((string) $user->email));
                if ($normalized !== $user->email) {
                    DB::table('users')->where('id', $user->id)->update(['email' => $normalized]);
                }
            }

            DB::table('users')
                ->whereNull('email_verified_at')
                ->update(['email_verified_at' => now()]);
        });
    }

    public function down(): void
    {
        // Canonical addresses and verification timestamps cannot be reconstructed safely.
    }
};
