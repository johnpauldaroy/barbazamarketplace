<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PasswordChangeTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_change_requires_correct_current_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('OldPassword123'),
        ]);

        Sanctum::actingAs($user);

        $response = $this->patchJson('/api/user/password', [
            'current_password' => 'WrongPassword123',
            'password' => 'NewPassword123',
            'password_confirmation' => 'NewPassword123',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['current_password']);
    }

    public function test_password_change_validates_new_password_requirements(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('OldPassword123'),
        ]);

        Sanctum::actingAs($user);

        $response = $this->patchJson('/api/user/password', [
            'current_password' => 'OldPassword123',
            'password' => 'short',
            'password_confirmation' => 'different',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['password']);
    }

    public function test_password_change_updates_password_on_valid_request(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('OldPassword123'),
        ]);

        Sanctum::actingAs($user);

        $response = $this->patchJson('/api/user/password', [
            'current_password' => 'OldPassword123',
            'password' => 'BrandNewPassword123',
            'password_confirmation' => 'BrandNewPassword123',
        ]);

        $response->assertOk();
        $response->assertJsonPath('message', 'Password updated successfully');

        $user->refresh();
        $this->assertTrue(Hash::check('BrandNewPassword123', $user->password));
        $this->assertFalse(Hash::check('OldPassword123', $user->password));
    }

    public function test_password_change_revokes_other_access_tokens(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('OldPassword123'),
        ]);

        $otherToken = $user->createToken('other-device');
        $currentToken = $user->createToken('current-device');

        $response = $this->withHeader('Authorization', 'Bearer '.$currentToken->plainTextToken)
            ->patchJson('/api/user/password', [
                'current_password' => 'OldPassword123',
                'password' => 'BrandNewPassword123',
                'password_confirmation' => 'BrandNewPassword123',
            ]);

        $response->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $otherToken->accessToken->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $currentToken->accessToken->id]);
    }
}
