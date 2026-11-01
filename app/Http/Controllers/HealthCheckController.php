<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Throwable;

class HealthCheckController extends Controller
{
    /**
     * Comprehensive system health check endpoint for uptime monitors and Kubernetes probes.
     */
    public function __invoke(): JsonResponse
    {
        $startTime = microtime(true);
        $checks = [
            'database' => false,
            'storage' => false,
        ];
        $errors = [];

        // 1. Database Connection Check
        try {
            DB::connection()->getPdo();
            $checks['database'] = true;
        } catch (Throwable $e) {
            $errors['database'] = $e->getMessage();
        }

        // 2. Storage Directory Writable Check
        try {
            $testFile = storage_path('framework/cache/health_check_test.tmp');
            File::put($testFile, 'health-ok');
            if (File::get($testFile) === 'health-ok') {
                $checks['storage'] = true;
                File::delete($testFile);
            }
        } catch (Throwable $e) {
            $errors['storage'] = $e->getMessage();
        }

        $isHealthy = ! in_array(false, $checks, true);
        $responseTimeMs = round((microtime(true) - $startTime) * 1000, 2);

        $payload = [
            'status' => $isHealthy ? 'ok' : 'degraded',
            'timestamp' => now()->toIso8601String(),
            'response_time_ms' => $responseTimeMs,
            'environment' => config('app.env'),
            'checks' => $checks,
            'system' => [
                'php_version' => PHP_VERSION,
                'laravel_version' => app()->version(),
                'memory_usage_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
            ],
        ];

        if (! empty($errors)) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $isHealthy ? 200 : 503);
    }
}
