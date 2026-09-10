<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\EmailVerificationService;
use Illuminate\Auth\Events\Verified;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private readonly EmailVerificationService $emailVerification) {}

    public function register(Request $request): JsonResponse
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
            'email' => $this->normalizeEmail($request->input('email')),
        ]);

        $payload = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'string', 'email:rfc', 'max:254', 'unique:users,email'],
            'password' => ['required', 'string', 'max:72', Password::min(8), 'confirmed'],
        ]);

        try {
            $user = User::create([
                'name' => $payload['name'],
                'email' => $payload['email'],
                'password' => Hash::make($payload['password']),
                'is_admin' => false,
                'is_merchant' => false,
                'store_id' => null,
            ]);
        } catch (QueryException $error) {
            $this->throwDuplicateEmailValidationError($error);
            throw $error;
        }

        $emailSent = $this->emailVerification->send($user);

        return response()->json([
            'message' => $emailSent
                ? 'Account created. Check your email to verify your address.'
                : 'Account created, but the verification email could not be sent. Please request another email.',
            'verification_required' => true,
            'verification_email_sent' => $emailSent,
            'email' => $this->maskEmail($user->email),
        ], 201);
    }

    public function verifyEmail(Request $request, int $id, string $hash): RedirectResponse
    {
        $user = User::query()->find($id);
        $validHash = $user
            && hash_equals(sha1($user->getEmailForVerification()), $hash);

        if (! $user || ! $validHash || ! $request->hasValidSignature()) {
            return $this->verificationRedirect('invalid');
        }

        if ($user->hasVerifiedEmail()) {
            return $this->verificationRedirect('already-verified');
        }

        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return $this->verificationRedirect('success');
    }

    public function resendVerification(Request $request): JsonResponse
    {
        $request->merge([
            'email' => $this->normalizeEmail($request->input('email')),
        ]);

        $payload = $request->validate([
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
        ]);

        $rateKey = hash('sha256', $payload['email'].'|'.$request->ip());
        $minuteKey = "verification-resend:minute:{$rateKey}";
        $hourKey = "verification-resend:hour:{$rateKey}";
        $allowed = ! RateLimiter::tooManyAttempts($minuteKey, 1)
            && ! RateLimiter::tooManyAttempts($hourKey, 6);

        if ($allowed) {
            RateLimiter::hit($minuteKey, 60);
            RateLimiter::hit($hourKey, 3600);

            $user = User::query()->where('email', $payload['email'])->first();
            if ($user && ! $user->hasVerifiedEmail()) {
                $this->emailVerification->send($user);
            }
        }

        return response()->json([
            'message' => 'If an unverified account exists for that address, a verification email will be sent.',
        ], 202);
    }

    public function login(Request $request): JsonResponse
    {
        $request->merge([
            'email' => $this->normalizeEmail($request->input('email')),
        ]);

        $payload = $request->validate([
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'password' => ['required', 'string', 'max:72'],
        ]);

        $user = User::query()->where('email', $payload['email'])->first();
        if (! $user || ! $this->passwordIsValid($payload['password'], (string) $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid login credentials.'],
            ]);
        }

        if (! $user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Verify your email address before logging in.',
                'code' => 'EMAIL_NOT_VERIFIED',
                'verification_required' => true,
                'email' => $this->maskEmail($user->email),
            ], 403);
        }

        $this->rehashPasswordIfNeeded($user, $payload['password']);

        Auth::login($user);
        $user->load('store');
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->formatAuthUser($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $payload = $request->validate([
            'current_password' => ['required', 'string', 'max:72'],
            'password' => ['required', 'string', 'max:72', Password::min(8), 'confirmed'],
        ]);

        if (! $this->passwordIsValid($payload['current_password'], (string) $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->password = Hash::make($payload['password']);
        $user->save();

        $currentTokenId = $user->currentAccessToken()?->id;
        $user->tokens()
            ->when($currentTokenId, fn ($query) => $query->where('id', '!=', $currentTokenId))
            ->delete();

        return response()->json([
            'message' => 'Password updated successfully',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $user->load('store');

        return response()->json($this->formatAuthUser($user));
    }

    protected function formatAuthUser(User $user): array
    {
        $store = $user->store;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified' => $user->hasVerifiedEmail(),
            'is_admin' => (bool) $user->is_admin,
            'is_merchant' => (bool) $user->is_merchant,
            'store_id' => $user->store_id,
            'store' => $store ? [
                'id' => $store->id,
                'name' => $store->name,
                'slug' => $store->slug,
                'status' => $store->status,
            ] : null,
            'created_at' => optional($user->created_at)->toISOString(),
            'updated_at' => optional($user->updated_at)->toISOString(),
        ];
    }

    private function normalizeEmail(mixed $email): string
    {
        return Str::lower(trim((string) $email));
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $visible = Str::substr($local, 0, 1);

        return $visible.str_repeat('*', max(3, Str::length($local) - 1)).'@'.$domain;
    }

    private function verificationRedirect(string $status): RedirectResponse
    {
        $frontend = rtrim((string) config('app.frontend_url', config('app.url')), '/');

        return redirect()->away($frontend.'/verify-email?status='.rawurlencode($status));
    }

    private function passwordIsValid(string $plainText, string $storedPassword): bool
    {
        try {
            return Hash::check($plainText, $storedPassword);
        } catch (\Throwable) {
            return str_starts_with($storedPassword, '$')
                ? password_verify($plainText, $storedPassword)
                : hash_equals($storedPassword, $plainText);
        }
    }

    private function rehashPasswordIfNeeded(User $user, string $plainText): void
    {
        try {
            if (! Hash::needsRehash((string) $user->password)) {
                return;
            }
        } catch (\Throwable) {
            // Legacy values are upgraded after a successful credential check.
        }

        $user->password = Hash::make($plainText);
        $user->save();
    }

    private function throwDuplicateEmailValidationError(QueryException $error): void
    {
        $message = Str::lower($error->getMessage());
        $isUniqueViolation = (string) $error->getCode() === '23000'
            || str_contains($message, 'unique constraint')
            || str_contains($message, 'duplicate entry');

        if ($isUniqueViolation) {
            throw ValidationException::withMessages([
                'email' => ['An account with this email address already exists.'],
            ]);
        }
    }
}
