<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LandingAndRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create default roles and subscription plan
        Role::create(['name' => 'Owner', 'slug' => 'owner', 'is_system' => true]);
        Role::create(['name' => 'Cashier', 'slug' => 'cashier', 'is_system' => true]);

        SubscriptionPlan::create([
            'name' => 'Starter Retail',
            'slug' => 'starter',
            'description' => 'Cocok untuk toko ritel tunggal.',
            'price_monthly' => 199000,
            'price_annual' => 1990000,
            'max_stores' => 1,
            'max_registers' => 2,
            'max_warehouses' => 1,
            'max_users' => 5,
            'features' => ['pos_terminal', 'receipt_printing'],
            'is_active' => true,
        ]);
    }

    public function test_landing_page_renders_successfully(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Landing/Index')
            ->has('plans')
        );
    }

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Auth/Register')
        );
    }

    public function test_new_business_can_register_with_trial_and_store_provisioning(): void
    {
        $response = $this->post('/register', [
            'business_name' => 'Kopi Senja Utama',
            'name' => 'Ahmad Pemilik',
            'email' => 'ahmad@kopisenja.test',
            'phone' => '081298765432',
            'password' => 'password123',
        ]);

        $response->assertRedirect('/dashboard');

        // Verify Tenant created with trial status
        $this->assertDatabaseHas('tenants', [
            'name' => 'Kopi Senja Utama',
            'slug' => 'kopi-senja-utama',
            'email' => 'ahmad@kopisenja.test',
            'status' => 'trial',
        ]);

        $tenant = Tenant::where('slug', 'kopi-senja-utama')->first();

        // Verify Owner User created
        $this->assertDatabaseHas('users', [
            'tenant_id' => $tenant->id,
            'name' => 'Ahmad Pemilik',
            'email' => 'ahmad@kopisenja.test',
            'status' => 'active',
        ]);

        $user = User::where('email', 'ahmad@kopisenja.test')->first();
        $this->assertTrue($user->hasRole('owner'));

        // Verify Default Store created
        $this->assertDatabaseHas('stores', [
            'tenant_id' => $tenant->id,
            'code' => 'STR-01',
        ]);

        // Verify Default Register created
        $this->assertDatabaseHas('registers', [
            'tenant_id' => $tenant->id,
            'code' => 'POS-01',
        ]);

        // Verify Trial Subscription
        $this->assertDatabaseHas('subscriptions', [
            'tenant_id' => $tenant->id,
            'status' => 'trial',
        ]);

        $this->assertAuthenticatedAs($user);
    }
}
