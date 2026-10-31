<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
    }

    public function test_login_screen_can_be_rendered(): void
    {
        $response = $this->get('/login');

        $response->assertStatus(200);
    }

    public function test_users_can_authenticate_using_valid_credentials(): void
    {
        $tenant = Tenant::create([
            'name' => 'Demo Tenant',
            'slug' => 'demo-tenant',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'John Doe',
            'email' => 'john@demo.test',
            'password' => bcrypt('secret123'),
            'status' => 'active',
        ]);

        $response = $this->post('/login', [
            'email' => 'john@demo.test',
            'password' => 'secret123',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect('/dashboard');
    }

    public function test_users_cannot_authenticate_with_invalid_password(): void
    {
        $tenant = Tenant::create([
            'name' => 'Demo Tenant',
            'slug' => 'demo-tenant',
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'John Doe',
            'email' => 'john@demo.test',
            'password' => bcrypt('secret123'),
            'status' => 'active',
        ]);

        $response = $this->post('/login', [
            'email' => 'john@demo.test',
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
        $response->assertSessionHasErrors('email');
    }

    public function test_inactive_users_cannot_authenticate(): void
    {
        $tenant = Tenant::create([
            'name' => 'Demo Tenant',
            'slug' => 'demo-tenant',
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Inactive User',
            'email' => 'inactive@demo.test',
            'password' => bcrypt('secret123'),
            'status' => 'inactive',
        ]);

        $response = $this->post('/login', [
            'email' => 'inactive@demo.test',
            'password' => 'secret123',
        ]);

        $this->assertGuest();
        $response->assertSessionHasErrors('email');
    }

    public function test_users_can_logout(): void
    {
        $tenant = Tenant::create([
            'name' => 'Demo Tenant',
            'slug' => 'demo-tenant',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'John Doe',
            'email' => 'john@demo.test',
            'password' => bcrypt('secret123'),
            'status' => 'active',
        ]);

        $response = $this->actingAs($user)->post('/logout');

        $this->assertGuest();
        $response->assertRedirect('/login');
    }
}
