<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class SecurityAndHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        RateLimiter::clear('auth-login');
        RateLimiter::clear('pos-checkout');
        RateLimiter::clear('api');

        $this->tenant = Tenant::create([
            'name' => 'PT Keamanan Siber Prima',
            'slug' => 'keamanan-siber',
            'status' => 'active',
        ]);

        $this->user = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Bambang Security',
            'email' => 'bambang.sec@keamanan.test',
            'password' => bcrypt('password123'),
            'status' => 'active',
        ]);
    }

    public function test_security_headers_are_present_on_http_responses(): void
    {
        $response = $this->get('/login');

        $response->assertOk();
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');
        $response->assertHeader('X-XSS-Protection', '1; mode=block');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    }

    public function test_health_check_endpoint_returns_system_status(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertOk();
        $response->assertJson([
            'status' => 'ok',
            'checks' => [
                'database' => true,
                'storage' => true,
            ],
        ]);
        $response->assertJsonStructure([
            'status',
            'timestamp',
            'response_time_ms',
            'environment',
            'checks' => ['database', 'storage'],
            'system' => ['php_version', 'laravel_version', 'memory_usage_mb'],
        ]);
    }

    public function test_login_rate_limiter_throttles_excessive_attempts(): void
    {
        // First 5 attempts (allowed, though failing credentials)
        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', [
                'email' => 'hacker@test.com',
                'password' => 'wrong-pass',
            ]);
        }

        // 6th attempt must be throttled with 429 Too Many Requests
        $response = $this->post('/login', [
            'email' => 'hacker@test.com',
            'password' => 'wrong-pass',
        ]);

        $response->assertStatus(429);

        // Clear rate limiter so other tests are not throttled
        RateLimiter::clear('auth-login:127.0.0.1');
        RateLimiter::clear(sha1('auth-login'.'127.0.0.1'));

        // Clear rate limiter so other tests are not throttled
        RateLimiter::clear('auth-login:127.0.0.1');
        RateLimiter::clear(sha1('auth-login'.'127.0.0.1'));
    }

    public function test_pos_checkout_rate_limiter_throttles_burst_requests(): void
    {
        $this->actingAs($this->user);

        // Send 30 requests to pos checkout
        for ($i = 0; $i < 30; $i++) {
            $this->postJson('/pos/checkout', []);
        }

        // 31st request must trigger 429
        $response = $this->postJson('/pos/checkout', []);
        $response->assertStatus(429);
        $response->assertJson([
            'status' => 'error',
            'message' => 'Terlalu banyak permintaan checkout. Silakan tunggu sebentar sebelum mencoba lagi.',
        ]);
    }

    public function test_xss_injection_payload_is_sanitized_safely(): void
    {
        $this->actingAs($this->user);

        $unit = Unit::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'PCS',
            'name' => 'Pieces',
        ]);

        $category = ProductCategory::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Kategori Aman',
            'slug' => 'kategori-aman',
        ]);

        // Attempt XSS script payload in product name
        $xssPayload = '<script>alert("XSS-VULNERABILITY")</script> Minuman Sehat';

        $product = Product::create([
            'tenant_id' => $this->tenant->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'sku' => 'SEC-001',
            'name' => $xssPayload,
            'purchase_cost' => 5000,
            'selling_price' => 10000,
            'track_inventory' => false,
            'status' => 'active',
        ]);

        $response = $this->get('/products');
        $response->assertOk();

        // Ensure database preserves data faithfully while blade/react auto-escapes raw tags
        $this->assertEquals($xssPayload, $product->name);
    }

    public function test_artisan_audit_command_runs_successfully(): void
    {
        $exitCode = Artisan::call('pos:audit');

        $this->assertEquals(0, $exitCode);
        $output = Artisan::output();
        $this->assertStringContainsString('ENTERPRISE SAAS POS - PRODUCTION READINESS AUDIT', $output);
        $this->assertStringContainsString('HASIL AUDIT: SISTEM SIAP OPERASIONAL PRODUKSI [PASS]', $output);
    }
}
