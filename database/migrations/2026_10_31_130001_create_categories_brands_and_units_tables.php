<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Categories (Hierarchical)
        Schema::create('product_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->uuid('parent_id')->nullable();
            $table->string('name');
            $table->string('slug', 100);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'slug']);
            $table->index(['tenant_id', 'is_active']);
        });

        // Add self-referencing foreign key after table creation (PostgreSQL requirement)
        Schema::table('product_categories', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('product_categories')->nullOnDelete();
        });

        // 2. Brands
        Schema::create('brands', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug', 100);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'slug']);
            $table->index(['tenant_id', 'is_active']);
        });

        // 3. Units of Measure
        Schema::create('units', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('code', 20); // PCS, BOX, PACK, KG, L
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'is_active']);
        });

        // 4. Unit Conversions
        Schema::create('unit_conversions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('from_unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignUuid('to_unit_id')->constrained('units')->cascadeOnDelete();
            $table->decimal('multiplier', 12, 4); // 1 BOX = 12 PCS -> multiplier 12.0000
            $table->timestamps();

            $table->unique(['tenant_id', 'from_unit_id', 'to_unit_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('unit_conversions');
        Schema::dropIfExists('units');
        Schema::dropIfExists('brands');
        Schema::dropIfExists('product_categories');
    }
};
