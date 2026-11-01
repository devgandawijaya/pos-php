<?php

namespace App\Http\Controllers;

use App\Models\Register;
use App\Models\Shift;
use App\Models\Store;
use App\Services\ShiftService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ShiftController extends Controller
{
    /**
     * Display a listing of cashier shifts with KPI summaries.
     */
    public function index(Request $request, ShiftService $shiftService): Response
    {
        $user = $request->user();
        $tenantId = $user->tenant_id;

        // Resolve active store
        $storeId = $request->query('store_id') ?: $request->session()->get('active_store_id');
        $store = null;
        if ($storeId) {
            $store = Store::where('tenant_id', $tenantId)->find($storeId);
        }
        if (! $store) {
            $store = $user->defaultStore() ?? $user->stores()->first() ?? Store::where('tenant_id', $tenantId)->first();
        }

        $query = Shift::where('tenant_id', $tenantId)
            ->with(['store:id,name,code', 'register:id,name,code', 'cashier:id,name,email', 'supervisor:id,name']);

        if ($store) {
            $query->where('store_id', $store->id);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($approvalStatus = $request->query('approval_status')) {
            $query->where('approval_status', $approvalStatus);
        }

        if ($date = $request->query('date')) {
            $query->whereDate('opened_at', $date);
        }

        $shifts = $query->orderByDesc('opened_at')->paginate(15)->withQueryString();

        // Calculate KPI summaries
        $activeShiftsCount = Shift::where('tenant_id', $tenantId)->where('status', 'open')->count();
        $pendingApprovalsCount = Shift::where('tenant_id', $tenantId)->where('approval_status', 'pending')->count();
        $todayClosedCount = Shift::where('tenant_id', $tenantId)
            ->where('status', 'closed')
            ->whereDate('closed_at', now()->toDateString())
            ->count();

        // Stores and Registers for filters & opening new shift
        $stores = Store::where('tenant_id', $tenantId)->where('is_active', true)->select('id', 'name', 'code')->get();
        $registers = Register::where('tenant_id', $tenantId)->where('is_active', true)->select('id', 'store_id', 'name', 'code')->get();

        return Inertia::render('Shifts/Index', [
            'shifts' => $shifts,
            'currentStore' => $store,
            'stores' => $stores,
            'registers' => $registers,
            'filters' => [
                'store_id' => $store?->id,
                'status' => $request->query('status', ''),
                'approval_status' => $request->query('approval_status', ''),
                'date' => $request->query('date', ''),
            ],
            'kpis' => [
                'active_shifts' => $activeShiftsCount,
                'pending_approvals' => $pendingApprovalsCount,
                'today_closed' => $todayClosedCount,
            ],
        ]);
    }

    /**
     * Open a new shift on a register.
     */
    public function store(Request $request, ShiftService $shiftService)
    {
        $validated = $request->validate([
            'store_id' => ['required', 'uuid', 'exists:stores,id'],
            'register_id' => ['required', 'uuid', 'exists:registers,id'],
            'opening_cash' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $shift = $shiftService->openShift($validated, $request->user());

            if ($request->wantsJson()) {
                return response()->json([
                    'status' => 'success',
                    'message' => 'Shift kasir berhasil dibuka.',
                    'shift' => $shift->load(['register', 'cashier']),
                ]);
            }

            return redirect()->back()->with('success', 'Shift kasir berhasil dibuka.');
        } catch (DomainException $e) {
            if ($request->wantsJson()) {
                return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
            }

            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Get active shift for POS terminal.
     */
    public function active(Request $request, ShiftService $shiftService): JsonResponse
    {
        $storeId = $request->query('store_id');
        $registerId = $request->query('register_id');

        if (! $storeId) {
            return response()->json(['active_shift' => null]);
        }

        $shift = $shiftService->getActiveShift($storeId, $registerId);

        if (! $shift) {
            return response()->json(['active_shift' => null]);
        }

        $summary = $shiftService->calculateExpectedCash($shift);

        return response()->json([
            'active_shift' => $shift,
            'summary' => $summary,
        ]);
    }

    /**
     * Record cash in or cash out during a shift.
     */
    public function cashMovement(Request $request, Shift $shift, ShiftService $shiftService)
    {
        $tenantId = $request->user()->tenant_id;
        if ($shift->tenant_id !== $tenantId) {
            abort(403);
        }

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:cash_in,cash_out'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $movement = $shiftService->recordCashMovement(
                shift: $shift,
                type: $validated['type'],
                amount: (float) $validated['amount'],
                reason: $validated['reason'],
                notes: $validated['notes'] ?? null,
                user: $request->user()
            );

            if ($request->wantsJson()) {
                return response()->json([
                    'status' => 'success',
                    'message' => 'Mutasi kas berhasil dicatat.',
                    'movement' => $movement,
                ]);
            }

            return redirect()->back()->with('success', 'Mutasi kas berhasil dicatat.');
        } catch (DomainException $e) {
            if ($request->wantsJson()) {
                return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
            }

            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Close an active shift with cash counting.
     */
    public function close(Request $request, Shift $shift, ShiftService $shiftService)
    {
        $tenantId = $request->user()->tenant_id;
        if ($shift->tenant_id !== $tenantId) {
            abort(403);
        }

        $validated = $request->validate([
            'actual_cash' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $closedShift = $shiftService->closeShift(
                shift: $shift,
                actualCash: (float) $validated['actual_cash'],
                notes: $validated['notes'] ?? null,
                user: $request->user()
            );

            $report = $shiftService->getShiftReport($closedShift);

            if ($request->wantsJson()) {
                return response()->json([
                    'status' => 'success',
                    'message' => 'Shift berhasil ditutup.',
                    'shift' => $closedShift,
                    'report' => $report,
                ]);
            }

            return redirect()->back()->with('success', 'Shift kasir berhasil ditutup.');
        } catch (DomainException $e) {
            if ($request->wantsJson()) {
                return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
            }

            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Supervisor approval for shift with discrepancy.
     */
    public function approve(Request $request, Shift $shift, ShiftService $shiftService)
    {
        $tenantId = $request->user()->tenant_id;
        if ($shift->tenant_id !== $tenantId) {
            abort(403);
        }

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $approved = $shiftService->approveShift($shift, $request->user(), $validated['notes'] ?? null);

            if ($request->wantsJson()) {
                return response()->json([
                    'status' => 'success',
                    'message' => 'Selisih shift berhasil disetujui oleh supervisor.',
                    'shift' => $approved,
                ]);
            }

            return redirect()->back()->with('success', 'Selisih kas shift berhasil disetujui.');
        } catch (DomainException $e) {
            if ($request->wantsJson()) {
                return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
            }

            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Get shift summary report (Z-Report) JSON.
     */
    public function report(Shift $shift, ShiftService $shiftService): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        if ($shift->tenant_id !== $tenantId) {
            abort(403);
        }

        $report = $shiftService->getShiftReport($shift);

        return response()->json([
            'status' => 'success',
            'report' => $report,
        ]);
    }
}
