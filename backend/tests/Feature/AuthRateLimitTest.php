<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthRateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_is_rate_limited_per_email(): void
    {
        $user = User::factory()->create([
            'email' => 'ratelimited@example.com',
            'password' => Hash::make('CorrectPassword123'),
        ]);

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/login', [
                'email' => $user->email,
                'password' => 'WrongPassword',
            ])->assertStatus(422);
        }

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'CorrectPassword123',
        ])->assertStatus(429);
    }

    public function test_registration_is_rate_limited_per_ip(): void
    {
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/register', [
                'name' => "User {$attempt}",
                'email' => "newuser{$attempt}@example.com",
                'password' => 'ValidPassword123',
                'password_confirmation' => 'ValidPassword123',
            ])->assertCreated();
        }

        $this->postJson('/api/register', [
            'name' => 'User 6',
            'email' => 'newuser6@example.com',
            'password' => 'ValidPassword123',
            'password_confirmation' => 'ValidPassword123',
        ])->assertStatus(429);
    }
}
