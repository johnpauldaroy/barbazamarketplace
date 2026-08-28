<?php

namespace App\Console\Commands;

use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Console\Command;

class AuditInventoryUnits extends Command
{
    protected $signature = 'inventory:audit-units {--dry-run : Report findings without making changes}';
    protected $description = 'Audit products, variants, prices, units, and order deductions for unit-aware inventory readiness.';

    public function handle(): int
    {
        $checks = [
            ['Products without a base unit', Product::whereNull('base_unit_id')->count()],
            ['Products using inactive packaging units', Product::whereHas('baseUnit', fn ($q) => $q->where('is_active', false))->count()],
            ['Discrete products with fractional stock', Product::whereHas('baseUnit', fn ($q) => $q->where('is_fractional', false))->get()->filter(fn ($p) => (float) $p->stock !== floor((float) $p->stock))->count()],
            ['Products without variants', Product::doesntHave('variants')->count()],
            ['Products whose compatibility price differs from the default option', Product::with('variants')->get()->filter(fn ($p) => $p->defaultVariant() && (float) $p->price !== (float) $p->defaultVariant()->price)->count()],
            ['Order items missing an inventory unit', OrderItem::whereNotNull('base_units_deducted')->whereNull('inventory_unit_id')->count()],
        ];

        $this->table(['Check', 'Count'], $checks);
        $issues = collect($checks)->sum(fn ($row) => $row[1]);
        $this->line($issues ? "{$issues} issue(s) require review." : 'Inventory unit audit passed.');
        $this->comment('This command is read-only; --dry-run is accepted for deployment-script clarity.');

        return $issues ? self::FAILURE : self::SUCCESS;
    }
}
