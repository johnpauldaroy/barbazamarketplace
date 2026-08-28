<?php

namespace App\Services;

use App\Models\InventoryMovement;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Unit;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function movement(
        Product $product,
        float $delta,
        string $type,
        ?int $actorId = null,
        ?int $orderId = null,
        ?string $reason = null,
        array $metadata = [],
        bool $applyDelta = true,
    ): InventoryMovement {
        $delta = round($delta, 3);
        $balance = round((float) $product->stock + ($applyDelta ? $delta : 0), 3);

        if ($balance < 0) {
            throw ValidationException::withMessages(['quantity' => ['This adjustment would make stock negative.']]);
        }

        if ($applyDelta) {
            $product->forceFill(['stock' => $balance])->save();
        }

        return $product->inventoryMovements()->create([
            'unit_id' => $product->base_unit_id,
            'actor_id' => $actorId,
            'order_id' => $orderId,
            'type' => $type,
            'quantity_delta' => $delta,
            'balance_after' => $balance,
            'reason' => $reason,
            'metadata' => $metadata ?: null,
        ]);
    }

    public function adjust(Product $product, string $operation, float $quantity, int $actorId, string $reason): InventoryMovement
    {
        return DB::transaction(function () use ($product, $operation, $quantity, $actorId, $reason) {
            $locked = Product::query()->with('baseUnit')->lockForUpdate()->findOrFail($product->id);
            $this->assertQuantityForUnit($quantity, $locked->baseUnit, 'quantity', $operation === 'set');

            $delta = match ($operation) {
                'add' => $quantity,
                'remove' => -$quantity,
                'set' => $quantity - (float) $locked->stock,
                default => throw ValidationException::withMessages(['operation' => ['Choose add, remove, or set.']]),
            };

            return $this->movement($locked, $delta, $operation === 'set' ? 'correction' : ($operation === 'add' ? 'restock' : 'removal'), $actorId, null, $reason);
        });
    }

    public function conversionFactor(Unit $from, Unit $to, ?float $explicitFactor): float
    {
        if ($from->id === $to->id) {
            return 1;
        }
        if ($from->dimension === $to->dimension) {
            return round((float) $from->conversion_factor / (float) $to->conversion_factor, 6);
        }
        if (! $explicitFactor || $explicitFactor <= 0) {
            throw ValidationException::withMessages(['conversion_factor' => ['Enter how many new units equal one current unit.']]);
        }
        return round($explicitFactor, 6);
    }

    public function previewConversion(Product $product, Unit $to, ?float $explicitFactor): array
    {
        $product->loadMissing(['baseUnit', 'variants']);
        $from = $product->baseUnit;
        if (! $from) {
            throw ValidationException::withMessages(['base_unit_id' => ['The product has no current inventory unit.']]);
        }
        if (! $to->is_active && $to->id !== $from->id) {
            throw ValidationException::withMessages(['base_unit_id' => ['Choose an active measured inventory unit.']]);
        }

        $factor = $this->conversionFactor($from, $to, $explicitFactor);
        $stock = $this->converted((float) $product->stock, $factor);
        $threshold = $this->converted((float) $product->low_stock_threshold, $factor);
        $variants = $product->variants->map(fn ($variant) => [
            'id' => $variant->id,
            'name' => $variant->name,
            'before' => (float) $variant->base_unit_quantity,
            'after' => $this->converted((float) $variant->base_unit_quantity, $factor),
        ])->values()->all();

        $this->assertQuantityForUnit($stock, $to, 'stock', true);
        $this->assertQuantityForUnit($threshold, $to, 'low_stock_threshold', true);
        foreach ($variants as $variant) {
            $this->assertQuantityForUnit($variant['after'], $to, 'variants', false);
        }

        return [
            'product_id' => $product->id,
            'version' => $this->versionFor($product),
            'factor' => $factor,
            'from_unit' => $this->unitPayload($from),
            'to_unit' => $this->unitPayload($to),
            'stock' => ['before' => (float) $product->stock, 'after' => $stock],
            'low_stock_threshold' => ['before' => (float) $product->low_stock_threshold, 'after' => $threshold],
            'variants' => $variants,
        ];
    }

    public function convert(Product $product, Unit $to, ?float $explicitFactor, string $expectedVersion, int $actorId, string $reason): array
    {
        return DB::transaction(function () use ($product, $to, $explicitFactor, $expectedVersion, $actorId, $reason) {
            $locked = Product::query()->with(['baseUnit', 'variants'])->lockForUpdate()->findOrFail($product->id);
            if ($this->versionFor($locked) !== $expectedVersion) {
                throw ValidationException::withMessages(['version' => ['Inventory changed after this preview. Review the conversion again.']]);
            }

            $preview = $this->previewConversion($locked, $to, $explicitFactor);
            $oldUnit = $locked->baseUnit;
            $oldStock = (float) $locked->stock;
            $locked->forceFill([
                'base_unit_id' => $to->id,
                'stock' => $preview['stock']['after'],
                'low_stock_threshold' => $preview['low_stock_threshold']['after'],
            ])->save();

            foreach ($preview['variants'] as $convertedVariant) {
                $locked->variants->firstWhere('id', $convertedVariant['id'])?->update([
                    'base_unit_quantity' => $convertedVariant['after'],
                ]);
            }

            OrderItem::query()->where('product_id', $locked->id)->whereNotNull('base_units_deducted')
                ->eachById(function (OrderItem $item) use ($preview, $to) {
                    $item->forceFill([
                        'base_units_deducted' => $this->converted((float) $item->base_units_deducted, $preview['factor']),
                        'inventory_unit_id' => $to->id,
                    ])->save();
                });

            $locked->setRelation('baseUnit', $to);
            $this->movement($locked, 0, 'unit_conversion', $actorId, null, $reason, [
                'from_unit' => $this->unitPayload($oldUnit),
                'to_unit' => $this->unitPayload($to),
                'factor' => $preview['factor'],
                'stock_before' => $oldStock,
            ], false);

            return $preview;
        });
    }

    public function assertQuantityForUnit(float $quantity, ?Unit $unit, string $field, bool $allowZero): void
    {
        if (($allowZero ? $quantity < 0 : $quantity <= 0) || $quantity > 999999999.999) {
            throw ValidationException::withMessages([$field => ['Enter a valid inventory quantity.']]);
        }
        if ($unit && ! $unit->is_fractional && abs($quantity - round($quantity)) > 0.000001) {
            throw ValidationException::withMessages([$field => ["{$unit->label} must use a whole number."]]);
        }
    }

    private function converted(float $value, float $factor): float
    {
        return round($value * $factor, 3);
    }

    private function unitPayload(Unit $unit): array
    {
        return ['id' => $unit->id, 'code' => $unit->code, 'label' => $unit->label, 'dimension' => $unit->dimension];
    }

    private function versionFor(Product $product): string
    {
        $product->loadMissing('variants');
        return hash('sha256', json_encode([
            $product->id, $product->base_unit_id, (string) $product->stock,
            (string) $product->low_stock_threshold,
            $product->variants->map(fn ($variant) => [$variant->id, (string) $variant->base_unit_quantity])->values()->all(),
        ]));
    }
}
