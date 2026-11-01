<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderPayment;
use App\Models\Shift;
use App\Models\ShiftCashMovement;
use App\Models\User;
use DomainException;
use Illuminate\Support\Facades\DB;

class ShiftService
{
    /**
     * Open a new shift on a register.
     */
    public function openShift(array $data, ?User $user = null): Shift
    {
        $userId = $user?->id ?? auth()->id() ?? $data['user_id'] ?? null;
        $tenantId = $data['tenant_id'] ?? $user?->tenant_id ?? auth()->user()?->tenant_id;

        // Restriction: Only 1 active (open) shift per register
        $activeShift = Shift::where('tenant_id', $tenantId)
            ->where('register_id', $data['register_id'])
            ->where('status', 'open')
            ->first();

        if ($activeShift) {
            $cashierName = $activeShift->cashier?->name ?? 'Kasir';
            throw new DomainException("Register ini masih memiliki shift aktif (#{$activeShift->id}) yang dibuka oleh {$cashierName}. Harap tutup shift sebelumnya terlebih dahulu.");
        }

        $openingCash = max(0, (float) ($data['opening_cash'] ?? 0));

        return Shift::create([
            'tenant_id' => $tenantId,
            'store_id' => $data['store_id'],
            'register_id' => $data['register_id'],
            'user_id' => $userId,
            'status' => 'open',
            'opened_at' => now(),
            'opening_cash' => $openingCash,
            'notes' => $data['notes'] ?? null,
            'approval_status' => 'not_required',
        ]);
    }

    /**
     * Get the active shift for a given store, register, and/or user.
     */
    public function getActiveShift(string $storeId, ?string $registerId = null, ?string $userId = null): ?Shift
    {
        $tenantId = auth()->user()?->tenant_id;

        $query = Shift::where('tenant_id', $tenantId)
            ->where('store_id', $storeId)
            ->where('status', 'open');

        if ($registerId) {
            $query->where('register_id', $registerId);
        }

        if ($userId) {
            $query->where('user_id', $userId);
        }

        return $query->with(['register', 'cashier', 'movements'])->first();
    }

    /**
     * Record cash in or cash out during an open shift.
     */
    public function recordCashMovement(Shift $shift, string $type, float $amount, string $reason, ?string $notes = null, ?User $user = null): ShiftCashMovement
    {
        if (! $shift->isOpen()) {
            throw new DomainException('Tidak dapat mencatat mutasi kas pada shift yang sudah ditutup.');
        }

        if (! in_array($type, ['cash_in', 'cash_out'])) {
            throw new DomainException('Tipe mutasi kas harus berupa cash_in atau cash_out.');
        }

        if ($amount <= 0) {
            throw new DomainException('Nominal mutasi kas harus lebih dari 0.');
        }

        $reason = trim($reason);
        if (empty($reason)) {
            throw new DomainException('Alasan mutasi kas wajib diisi.');
        }

        $userId = $user?->id ?? auth()->id() ?? $shift->user_id;

        return ShiftCashMovement::create([
            'tenant_id' => $shift->tenant_id,
            'shift_id' => $shift->id,
            'user_id' => $userId,
            'type' => $type,
            'amount' => $amount,
            'reason' => $reason,
            'notes' => $notes,
        ]);
    }

    /**
     * Calculate expected cash and full sales breakdown for a shift.
     */
    public function calculateExpectedCash(Shift $shift): array
    {
        $openingCash = (float) $shift->opening_cash;

        // Cash sales: total payments where shift_id = $shift->id, method = cash, status = success
        $cashSales = (float) OrderPayment::where('shift_id', $shift->id)
            ->where('payment_method', 'cash')
            ->where('status', 'success')
            ->sum('amount');

        // Non-cash sales breakdown (QRIS, Debit, Credit, Transfer)
        $nonCashRows = OrderPayment::where('shift_id', $shift->id)
            ->where('payment_method', '!=', 'cash')
            ->where('status', 'success')
            ->select('payment_method', DB::raw('SUM(amount) as total_amount'), DB::raw('COUNT(id) as count'))
            ->groupBy('payment_method')
            ->get();

        $nonCashBreakdown = [
            'qris' => 0.0,
            'debit' => 0.0,
            'credit' => 0.0,
            'transfer' => 0.0,
        ];

        foreach ($nonCashRows as $row) {
            $method = strtolower($row->payment_method);
            $nonCashBreakdown[$method] = (float) $row->total_amount;
        }

        $totalNonCash = (float) array_sum($nonCashBreakdown);

        // Cash In and Cash Out movements
        $cashIn = (float) $shift->movements()->where('type', 'cash_in')->sum('amount');
        $cashOut = (float) $shift->movements()->where('type', 'cash_out')->sum('amount');

        // Total orders completed in this shift
        $orderCount = Order::where('shift_id', $shift->id)
            ->where('status', 'completed')
            ->count();

        // Expected physical cash in drawer:
        // Opening cash + Cash sales from customers + Cash In - Cash Out
        $expectedCash = round($openingCash + $cashSales + $cashIn - $cashOut, 2);
        $totalSales = round($cashSales + $totalNonCash, 2);

        return [
            'opening_cash' => $openingCash,
            'cash_sales' => $cashSales,
            'non_cash_sales' => $nonCashBreakdown,
            'total_non_cash_sales' => $totalNonCash,
            'total_sales' => $totalSales,
            'cash_in' => $cashIn,
            'cash_out' => $cashOut,
            'expected_cash' => $expectedCash,
            'order_count' => $orderCount,
        ];
    }

    /**
     * Close an active shift with physical cash count.
     */
    public function closeShift(Shift $shift, float $actualCash, ?string $notes = null, ?User $user = null): Shift
    {
        if (! $shift->isOpen()) {
            throw new DomainException('Shift ini sudah ditutup sebelumnya.');
        }

        if ($actualCash < 0) {
            throw new DomainException('Nominal uang fisik kasir tidak boleh negatif.');
        }

        $calc = $this->calculateExpectedCash($shift);
        $expectedCash = $calc['expected_cash'];
        $cashDifference = round($actualCash - $expectedCash, 2);

        // If discrepancy exists, flag for supervisor approval
        $hasDiscrepancy = abs($cashDifference) > 0.01;
        $approvalStatus = $hasDiscrepancy ? 'pending' : 'approved';

        $shift->update([
            'status' => 'closed',
            'closed_at' => now(),
            'expected_cash' => $expectedCash,
            'actual_cash' => $actualCash,
            'cash_difference' => $cashDifference,
            'approval_status' => $approvalStatus,
            'notes' => $notes ?? $shift->notes,
        ]);

        return $shift->fresh(['register', 'cashier', 'movements', 'supervisor']);
    }

    /**
     * Supervisor review and approval for shift with discrepancy.
     */
    public function approveShift(Shift $shift, User $supervisor, ?string $notes = null): Shift
    {
        if (! $shift->isClosed()) {
            throw new DomainException('Hanya shift yang sudah ditutup yang dapat disetujui selisihnya.');
        }

        $shift->update([
            'approval_status' => 'approved',
            'approved_by_id' => $supervisor->id,
            'approved_at' => now(),
            'notes' => $notes ? ($shift->notes."\n[Approval Note]: ".$notes) : $shift->notes,
        ]);

        return $shift->fresh(['register', 'cashier', 'supervisor']);
    }

    /**
     * Generate full Z-Report (Shift Closing Report) summary.
     */
    public function getShiftReport(Shift $shift): array
    {
        $calc = $this->calculateExpectedCash($shift);

        return [
            'shift' => [
                'id' => $shift->id,
                'status' => $shift->status,
                'opened_at' => $shift->opened_at?->format('Y-m-d H:i:s'),
                'closed_at' => $shift->closed_at?->format('Y-m-d H:i:s'),
                'cashier_name' => $shift->cashier?->name ?? 'Kasir',
                'store_name' => $shift->store?->name ?? 'Toko',
                'register_name' => $shift->register?->name ?? 'Register',
                'register_code' => $shift->register?->code ?? '-',
                'opening_cash' => (float) $shift->opening_cash,
                'expected_cash' => $shift->expected_cash !== null ? (float) $shift->expected_cash : $calc['expected_cash'],
                'actual_cash' => $shift->actual_cash !== null ? (float) $shift->actual_cash : null,
                'cash_difference' => $shift->cash_difference !== null ? (float) $shift->cash_difference : null,
                'approval_status' => $shift->approval_status,
                'supervisor_name' => $shift->supervisor?->name,
                'notes' => $shift->notes,
            ],
            'financials' => $calc,
            'movements' => $shift->movements()->with('user:id,name')->orderBy('created_at')->get(),
        ];
    }
}
