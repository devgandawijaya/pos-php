# Database Architecture & Entity Relationship Diagram (ERD)

## 1. Relational Design Principles

The database follows PostgreSQL enterprise patterns:
1. **Tenant Isolation**: Every tenant-owned table contains `tenant_id UUID NOT NULL` indexed in composite indexes.
2. **Numeric Precision**: Monetary fields use `NUMERIC(15,2)` or `NUMERIC(18,4)` for unit prices.
3. **Primary Keys**: UUIDv7 (or ULID / UUIDv4) for high-scale distributed inserts without sequence collision.
4. **Referential Integrity**: Explicit foreign key constraints with `ON DELETE RESTRICT` for financial and inventory ledgers.
5. **Auditing**: Every mutation stores `created_at`, `updated_at`, and references actor `created_by` / `updated_by`.

---

## 2. Core Entity Relationship Diagram (Mermaid)

```mermaid
erDiagram
    TENANTS ||--o{ SUBSCRIPTIONS : has
    SUBSCRIPTION_PLANS ||--o{ SUBSCRIPTIONS : defines
    TENANTS ||--o{ STORES : owns
    TENANTS ||--o{ WAREHOUSES : owns
    TENANTS ||--o{ USERS : employs
    TENANTS ||--o{ PRODUCTS : catalogs
    TENANTS ||--o{ CUSTOMERS : maintains
    
    STORES ||--o{ REGISTERS : equips
    REGISTERS ||--o{ SHIFTS : operates
    USERS ||--o{ SHIFTS : opens
    SHIFTS ||--o{ SHIFT_CASH_MOVEMENTS : tracks
    
    USERS ||--o{ USER_ROLES : assigned
    ROLES ||--o{ USER_ROLES : defines
    ROLES ||--o{ ROLE_PERMISSIONS : grants
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : contains
    USERS ||--o{ USER_STORE_ACCESS : restricted_to

    PRODUCT_CATEGORIES ||--o{ PRODUCTS : classifies
    UNITS ||--o{ PRODUCTS : measures
    PRODUCTS ||--o{ PRODUCT_VARIANTS : has
    PRODUCTS ||--o{ STOCK_BALANCES : stocks
    WAREHOUSES ||--o{ STOCK_BALANCES : holds
    
    STOCK_BALANCES ||--o{ INVENTORY_MOVEMENTS : logs
    
    STORES ||--o{ SALES : rings
    REGISTERS ||--o{ SALES : records
    SHIFTS ||--o{ SALES : reconciles
    USERS ||--o{ SALES : serves
    CUSTOMERS ||--o{ SALES : purchases
    SALES ||--o{ SALE_ITEMS : contains
    PRODUCTS ||--o{ SALE_ITEMS : snapshots
    SALES ||--o{ SALE_PAYMENTS : settles
    PAYMENT_METHODS ||--o{ SALE_PAYMENTS : uses

    TENANTS {
        uuid id PK
        string name
        string slug UK
        string email
        string phone
        string status
        string currency
        string timezone
        timestamp created_at
    }

    SUBSCRIPTIONS {
        uuid id PK
        uuid tenant_id FK
        uuid plan_id FK
        string status
        timestamp starts_at
        timestamp ends_at
        timestamp trial_ends_at
    }

    USERS {
        uuid id PK
        uuid tenant_id FK
        string name
        string email UK
        string password
        string status
        timestamp email_verified_at
    }

    STORES {
        uuid id PK
        uuid tenant_id FK
        string code
        string name
        string address
        string phone
        string status
        boolean is_active
    }

    REGISTERS {
        uuid id PK
        uuid tenant_id FK
        uuid store_id FK
        string code
        string name
        string status
        boolean is_active
    }

    SHIFTS {
        uuid id PK
        uuid tenant_id FK
        uuid store_id FK
        uuid register_id FK
        uuid cashier_id FK
        numeric opening_cash
        numeric closing_cash
        numeric expected_cash
        numeric variance
        string status
        timestamp opened_at
        timestamp closed_at
    }

    PRODUCTS {
        uuid id PK
        uuid tenant_id FK
        uuid category_id FK
        uuid unit_id FK
        string name
        string sku UK
        string barcode
        numeric purchase_cost
        numeric selling_price
        boolean track_inventory
        boolean is_active
    }

    STOCK_BALANCES {
        uuid id PK
        uuid tenant_id FK
        uuid warehouse_id FK
        uuid product_id FK
        numeric quantity
        numeric reserved_quantity
        numeric min_stock_alert
    }

    INVENTORY_MOVEMENTS {
        uuid id PK
        uuid tenant_id FK
        uuid warehouse_id FK
        uuid product_id FK
        string movement_type
        numeric quantity_change
        numeric balance_after
        numeric unit_cost
        string reference_type
        uuid reference_id
        timestamp created_at
    }

    SALES {
        uuid id PK
        uuid tenant_id FK
        uuid store_id FK
        uuid register_id FK
        uuid shift_id FK
        uuid cashier_id FK
        uuid customer_id FK
        string invoice_number UK
        string idempotency_key UK
        numeric subtotal
        numeric discount_total
        numeric tax_total
        numeric grand_total
        numeric paid_amount
        numeric change_amount
        string payment_status
        string status
        timestamp completed_at
    }

    SALE_ITEMS {
        uuid id PK
        uuid tenant_id FK
        uuid sale_id FK
        uuid product_id FK
        string product_name_snapshot
        string sku_snapshot
        numeric unit_price
        numeric quantity
        numeric subtotal
        numeric discount_amount
        numeric tax_amount
        numeric total
    }

    SALE_PAYMENTS {
        uuid id PK
        uuid tenant_id FK
        uuid sale_id FK
        uuid payment_method_id FK
        numeric amount
        numeric tendered
        numeric change
        string reference_number
        string status
    }
```

---

## 3. Storage & Indexing Strategy

1. **Composite Indexes for Tenant Scoping**:
   - `CREATE INDEX idx_products_tenant_sku ON products (tenant_id, sku);`
   - `CREATE INDEX idx_products_tenant_barcode ON products (tenant_id, barcode);`
   - `CREATE INDEX idx_sales_tenant_store_completed ON sales (tenant_id, store_id, completed_at);`
   - `CREATE INDEX idx_inventory_tenant_warehouse_product ON stock_balances (tenant_id, warehouse_id, product_id);`
2. **Idempotency Safeguard**:
   - `CREATE UNIQUE INDEX idx_sales_idempotency ON sales (tenant_id, idempotency_key);`
3. **Financial Immutability**:
   - Deleted sales or inventory movements are disallowed. Adjustments require reverse credit notes or inverse inventory movements.

