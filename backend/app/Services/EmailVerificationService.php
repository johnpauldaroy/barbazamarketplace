<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;

class EmailVerificationService
{
    public function send(User $user): bool
    {
        if ($user->hasVerifiedEmail()) {
            return true;
        }

        try {
            $user->sendEmailVerificationNotification();

            return true;
        } catch (\Throwable $error) {
            Log::warning('Email verification delivery failed', [
                'user_id' => $user->getKey(),
                'error' => $error->getMessage(),
            ]);

            return false;
        }
    }
}
