# Role and Permission Matrix

## 1. Overview

The SaaS POS system implements a granular Role-Based Access Control (RBAC) model with store and warehouse scope constraints. Every role has clearly defined abilities, preventing privilege escalation.

---

## 2. Roles Definition

| Role Key | Name | Level / Scope | Primary Responsibility |
|---|---|---|---|
| `super-admin` | Platform Super Admin | Platform Global | Manages tenants, subscriptions, plans, platform health |
| `owner` | Tenant Owner | Tenant Organization | Ultimate owner of tenant entity, financial & legal settings |
| `company-admin` | Company Admin | All Stores & Warehouses | General operational administrator across all branch stores |
| `store-manager` | Store Manager | Specific Store(s) | Manages store staff, registers, inventory, shifts, sales |
| `supervisor` | Supervisor | Specific Store(s) | Approves voids, refunds, manual discounts, cash corrections |
| `cashier` | Cashier | Specific Register / Shift | Operates POS terminal, cart, checkout, shift cash in/out |
| `warehouse-staff`| Warehouse Staff | Specific Warehouse(s) | Receiving purchase orders, stock opname, warehouse transfers |
| `sales-rep` | Sales Representative | Specific Store(s) | Assisted sales, customer relations, commission tracking |
| `finance-staff` | Finance Staff | Tenant Organization | Invoices, supplier payments, cash flow, reconciliation |
| `auditor` | Auditor / Viewer | Tenant Organization | Read-only inspection of audit logs, financial reports |

---

## 3. Permissions Matrix

| Module & Permission | Super Admin | Tenant Owner | Company Admin | Store Manager | Supervisor | Cashier | Warehouse Staff | Finance Staff | Auditor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Platform Management** |
| `platform.tenants.manage` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `platform.subscriptions.manage` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Organization & Billing** |
| `tenant.profile.update` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `tenant.subscription.view`| ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `tenant.subscription.change`| ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Store & Register** |
| `store.view` | ❌ | ✅ | ✅ | ✅ (Own) | ✅ (Own) | ✅ (Own) | ❌ | ❌ | ✅ |
| `store.manage` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `register.manage` | ❌ | ✅ | ✅ | ✅ (Own) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **POS & Checkout** |
| `pos.terminal.access` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `pos.sale.create` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `pos.sale.hold_resume` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `pos.sale.void` | ❌ | ✅ | ✅ | ✅ | ✅ (Approve)| ❌ | ❌ | ❌ | ❌ |
| `pos.sale.refund` | ❌ | ✅ | ✅ | ✅ | ✅ (Approve)| ❌ | ❌ | ❌ | ❌ |
| `pos.discount.apply` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ (Limit) | ❌ | ❌ | ❌ |
| `pos.discount.override` | ❌ | ✅ | ✅ | ✅ | ✅ (Approve)| ❌ | ❌ | ❌ | ❌ |
| **Shift & Cash** |
| `shift.open` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `shift.close` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ (Own) | ❌ | ❌ | ❌ |
| `shift.variance.approve`| ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `shift.cash_movement` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ (Own) | ❌ | ❌ | ❌ |
| **Products & Catalog** |
| `product.view` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `product.create_update` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `product.pricing.update`| ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Inventory & Purchasing** |
| `inventory.view` | ❌ | ✅ | ✅ | ✅ (Store)| ✅ (Store)| ❌ | ✅ (WH) | ✅ | ✅ |
| `inventory.adjust` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ (Approve)| ❌ | ❌ |
| `inventory.transfer` | ❌ | ✅ | ✅ | ✅ (Request)| ❌ | ❌ | ✅ | ❌ | ❌ |
| `inventory.stock_opname`| ❌ | ✅ | ✅ | ✅ (Store)| ❌ | ❌ | ✅ (WH) | ❌ | ❌ |
| `purchase.order.manage` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ (Receive)| ✅ | ❌ |
| **Reports & Audit** |
| `reports.sales.view` | ❌ | ✅ | ✅ | ✅ (Store)| ✅ (Store)| ❌ | ❌ | ✅ | ✅ |
| `reports.finance.view` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `audit_log.view` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `users.manage` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Policy Resolution Pattern

Every controller and Inertia action enforces policy checks:

```php
// Example: Authorizing refund at store
public function refund(Request $request, Sale $sale)
{
    $this->authorize('refund', $sale);
    // ...
}
```

Tenant and Store scoping are automatically evaluated inside the Policy:
1. `$user->tenant_id === $sale->tenant_id` (strict tenant boundary)
2. `$user->hasRole('owner') || $user->hasRole('company-admin') || $user->stores->contains($sale->store_id)` (store boundary)
3. `$user->hasPermissionTo('pos.sale.refund')` (granular capability)

