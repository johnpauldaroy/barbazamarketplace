<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use App\Services\EmailVerificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        RateLimiter::clear('verification-resend:minute:test');
    }

    public function test_registration_normalizes_email_creates_unverified_user_and_returns_no_token(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => '  Juan dela Cruz  ',
            'email' => '  Juan.Customer@Example.COM  ',
            'password' => 'SecurePass123',
            'password_confirmation' => 'SecurePass123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('verification_required', true)
            ->assertJsonPath('verification_email_sent', true)
            ->assertJsonMissingPath('token');

        $user = User::query()->where('email', 'juan.customer@example.com')->firstOrFail();
        $this->assertSame('Juan dela Cruz', $user->name);
        $this->assertNull($user->email_verified_at);
        $this->assertSame(0, $user->tokens()->count());
        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    public function test_case_and_whitespace_variants_cannot_create_duplicate_accounts(): void
    {
        User::factory()->create(['email' => 'member@example.com']);

        $response = $this->postJson('/api/register', [
            'name' => 'Another Member',
            'email' => ' MEMBER@EXAMPLE.COM ',
            'password' => 'SecurePass123',
            'password_confirmation' => 'SecurePass123',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors(['email']);
        $this->assertSame(1, User::query()->where('email', 'member@example.com')->count());
    }

    public function test_registration_returns_field_errors_for_invalid_values(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'A',
            'email' => 'not-an-email',
            'password' => 'short',
            'password_confirmation' => 'different',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_registration_survives_initial_email_delivery_failure(): void
    {
        $this->mock(EmailVerificationService::class)
            ->shouldReceive('send')
            ->once()
            ->andReturnFalse();

        $response = $this->postJson('/api/register', [
            'name' => 'Delivery Retry',
            'email' => 'retry@example.com',
            'password' => 'SecurePass123',
            'password_confirmation' => 'SecurePass123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('verification_required', true)
            ->assertJsonPath('verification_email_sent', false)
            ->assertJsonMissingPath('token');
        $this->assertDatabaseHas('users', ['email' => 'retry@example.com']);
    }

    public function test_valid_signed_link_verifies_user_and_is_idempotent(): void
    {
        $user = User::factory()->unverified()->create();
        $url = $this->verificationUrl($user);

        $this->get($url)
            ->assertRedirect(config('app.frontend_url').'/verify-email?status=success');
        $this->assertNotNull($user->fresh()->email_verified_at);

        $this->get($url)
            ->assertRedirect(config('app.frontend_url').'/verify-email?status=already-verified');
    }

    public function test_expired_or_tampered_links_do_not_verify_user(): void
    {
        $user = User::factory()->unverified()->create();
        $expiredUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->subMinute(),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        $this->get($expiredUrl)
            ->assertRedirect(config('app.frontend_url').'/verify-email?status=invalid');

        $tamperedUrl = $this->verificationUrl($user).'tampered';
        $this->get($tamperedUrl)
            ->assertRedirect(config('app.frontend_url').'/verify-email?status=invalid');
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_resend_is_generic_and_rate_limited_without_account_enumeration(): void
    {
        $user = User::factory()->unverified()->create(['email' => 'pending@example.com']);

        $first = $this->postJson('/api/email/verification-notification', [
            'email' => ' Pending@Example.com ',
        ]);
        $second = $this->postJson('/api/email/verification-notification', [
            'email' => 'pending@example.com',
        ]);
        $missing = $this->postJson('/api/email/verification-notification', [
            'email' => 'missing@example.com',
        ]);

        $first->assertStatus(202);
        $second->assertStatus(202)->assertExactJson($first->json());
        $missing->assertStatus(202)->assertExactJson($first->json());
        Notification::assertSentToTimes($user, VerifyEmailNotification::class, 1);
    }

    public function test_unverified_login_is_blocked_only_after_correct_credentials(): void
    {
        User::factory()->unverified()->create([
            'email' => 'pending@example.com',
            'password' => Hash::make('SecurePass123'),
        ]);

        $wrongPassword = $this->postJson('/api/login', [
            'email' => 'pending@example.com',
            'password' => 'WrongPass123',
        ]);
        $correctPassword = $this->postJson('/api/login', [
            'email' => ' PENDING@EXAMPLE.COM ',
            'password' => 'SecurePass123',
        ]);

        $wrongPassword->assertUnprocessable()->assertJsonValidationErrors(['email']);
        $correctPassword->assertForbidden()
            ->assertJsonPath('code', 'EMAIL_NOT_VERIFIED')
            ->assertJsonMissingPath('token');
    }

    public function test_verified_user_can_login_and_unverified_token_cannot_use_protected_routes(): void
    {
        $verified = User::factory()->create([
            'email' => 'verified@example.com',
            'password' => Hash::make('SecurePass123'),
        ]);

        $this->postJson('/api/login', [
            'email' => 'verified@example.com',
            'password' => 'SecurePass123',
        ])->assertOk()
            ->assertJsonPath('user.email_verified', true)
            ->assertJsonStructure(['token']);

        $unverified = User::factory()->unverified()->create();
        Sanctum::actingAs($unverified);
        $this->getJson('/api/user')->assertForbidden();
    }

    public function test_changing_email_normalizes_it_revokes_tokens_and_requires_reverification(): void
    {
        $user = User::factory()->create(['email' => 'old@example.com']);
        $user->createToken('existing-token');

        $user->email = ' New.Address@Example.COM ';
        $user->save();

        $user->refresh();
        $this->assertSame('new.address@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
        $this->assertSame(0, $user->tokens()->count());
        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    public function test_grandfather_migration_normalizes_and_verifies_existing_accounts(): void
    {
        $id = DB::table('users')->insertGetId([
            'name' => 'Existing User',
            'email' => ' Existing.User@Example.COM ',
            'email_verified_at' => null,
            'password' => Hash::make('SecurePass123'),
            'is_admin' => false,
            'is_merchant' => false,
            'store_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $migration = require database_path('migrations/2026_08_27_000019_normalize_and_verify_existing_user_emails.php');
        $migration->up();

        $user = User::query()->findOrFail($id);
        $this->assertSame('existing.user@example.com', $user->email);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_grandfather_migration_aborts_when_normalization_would_merge_accounts(): void
    {
        foreach (['Collision@Example.com', ' collision@example.com '] as $index => $email) {
            DB::table('users')->insert([
                'name' => "Collision {$index}",
                'email' => $email,
                'email_verified_at' => null,
                'password' => Hash::make('SecurePass123'),
                'is_admin' => false,
                'is_merchant' => false,
                'store_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $migration = require database_path('migrations/2026_08_27_000019_normalize_and_verify_existing_user_emails.php');

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Email normalization found duplicate accounts.');
        $migration->up();
    }

    private function verificationUrl(User $user): string
    {
        return URL::temporarySignedRoute(
            'verification.verify',
            now()->addHour(),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );
    }
}
