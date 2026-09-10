<?php

namespace Tests\Feature;

use Tests\TestCase;

class UnauthenticatedApiErrorTest extends TestCase
{
    public function test_unauthenticated_api_request_returns_json_401_without_accept_header(): void
    {
        $response = $this->get('/api/user');

        $response->assertStatus(401);
        $response->assertJson(['message' => 'Unauthenticated.']);
    }

    public function test_unauthenticated_admin_request_returns_json_401_without_accept_header(): void
    {
        $response = $this->get('/api/admin/users');

        $response->assertStatus(401);
        $response->assertJson(['message' => 'Unauthenticated.']);
    }
}
