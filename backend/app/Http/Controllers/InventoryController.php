<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Unit;
use App\Services\InventoryService;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function __construct(private readonly InventoryService $inventory) {}

    public function movements(Product $product)
    {
        return response()->json([
            'movements' => $product->inventoryMovements()
                ->with(['unit:id,code,label', 'actor:id,name,email'])
                ->latest()->limit(100)->get()->map(fn ($movement) => [
                    'id' => $movement->id,
                    'type' => $movement->type,
                    'quantity_delta' => (float) $movement->quantity_delta,
                    'balance_after' => (float) $movement->balance_after,
                    'unit' => $movement->unit,
                    'actor' => $movement->actor,
                    'order_id' => $movement->order_id,
                    'reason' => $movement->reason,
                    'metadata' => $movement->metadata,
                    'created_at' => optional($movement->created_at)->toISOString(),
                ]),
        ]);
    }

    public function adjust(Request $request, Product $product)
    {
        $data = $request->validate([
            'operation' => 'required|string|in:add,remove,set',
            'quantity' => 'required|numeric|min:0',
            'reason' => 'required|string|min:3|max:255',
        ]);
        $movement = $this->inventory->adjust($product, $data['operation'], (float) $data['quantity'], $request->user()->id, trim($data['reason']));

        return response()->json(['message' => 'Inventory updated.', 'stock' => (float) $movement->balance_after, 'movement' => $movement]);
    }

    public function previewConversion(Request $request, Product $product)
    {
        $data = $request->validate(['base_unit_id' => 'required|integer|exists:units,id', 'conversion_factor' => 'nullable|numeric|min:0.000001']);
        return response()->json(['preview' => $this->inventory->previewConversion($product, Unit::findOrFail($data['base_unit_id']), isset($data['conversion_factor']) ? (float) $data['conversion_factor'] : null)]);
    }

    public function convert(Request $request, Product $product)
    {
        $data = $request->validate([
            'base_unit_id' => 'required|integer|exists:units,id',
            'conversion_factor' => 'nullable|numeric|min:0.000001',
            'version' => 'required|string',
            'reason' => 'required|string|min:3|max:255',
        ]);
        $preview = $this->inventory->convert(
            $product,
            Unit::findOrFail($data['base_unit_id']),
            isset($data['conversion_factor']) ? (float) $data['conversion_factor'] : null,
            $data['version'],
            $request->user()->id,
            trim($data['reason']),
        );

        return response()->json(['message' => 'Inventory unit converted.', 'preview' => $preview, 'product' => $product->fresh()->load('baseUnit')]);
    }
}
