<?php

namespace App\Http\Controllers;

use App\Models\Register;
use App\Models\Store;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the main management dashboard.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $stats = [
            'stores_count' => 0,
            'registers_count' => 0,
            'warehouses_count' => 0,
            'users_count' => 0,
        ];

        if ($user->tenant_id) {
            $stats['stores_count'] = Store::count();
            $stats['registers_count'] = Register::count();
            $stats['warehouses_count'] = Warehouse::count();
            $stats['users_count'] = User::where('tenant_id', $user->tenant_id)->count();
        }

        return Inertia::render('Dashboard', [
            'stats' => $stats,
        ]);
    }
}

