<?php

namespace App\Observers;

use App\Models\User;
use App\Services\EmailVerificationService;

class UserObserver
{
    public function updating(User $user): void
    {
        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }
    }

    public function updated(User $user): void
    {
        if (! $user->wasChanged('email')) {
            return;
        }

        $user->tokens()->delete();
        app(EmailVerificationService::class)->send($user);
    }
}
