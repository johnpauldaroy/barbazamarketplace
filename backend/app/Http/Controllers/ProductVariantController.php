<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductVariantController extends Controller
{
    /**
     * Selling units, shared by every store so the catalogue keeps one vocabulary.
     */
    public function units()
    {
        return response()->json([
            'units' => Unit::query()
                ->orderBy('sort_order')
                ->orderBy('label')
                ->get()
                ->map(fn (Unit $unit) => [
                    'id' => $unit->id,
                    'code' => $unit->code,
                    'label' => $unit->label,
                    'is_fractional' => (bool) $unit->is_fractional,
                ]),
        ]);
    }

    public function index(Request $request, int $productId)
    {
        $product = $this->authorizeProduct($request, $productId);

        return response()->json([
            'variants' => $this->serialize($product),
        ]);
    }

    public function store(Request $request, int $productId)
    {
        $product = $this->authorizeProduct($request, $productId);
        $data = $this->validatePayload($request, $product);

        $variant = DB::transaction(function () use ($product, $data) {
            $variant = $product->variants()->create($data);
            $this->normaliseDefaults($product, $variant);

            return $variant;
        });

        $this->syncHasVariants($product);

        return response()->json([
            'message' => 'Option added',
            'variant' => $this->serializeOne($variant->fresh(), $product->fresh()),
            'variants' => $this->serialize($product->fresh()),
        ], 201);
    }

    public function update(Request $request, int $productId, int $variantId)
    {
        $product = $this->authorizeProduct($request, $productId);
        $variant = $product->variants()->findOrFail($variantId);
        $data = $this->validatePayload($request, $product, $variant);

        DB::transaction(function () use ($product, $variant, $data) {
            $variant->update($data);
            $this->normaliseDefaults($product, $variant);
        });

        $this->syncHasVariants($product);

        return response()->json([
            'message' => 'Option updated',
            'variant' => $this->serializeOne($variant->fresh(), $product->fresh()),
            'variants' => $this->serialize($product->fresh()),
        ]);
    }

    public function destroy(Request $request, int $productId, int $variantId)
    {
        $product = $this->authorizeProduct($request, $productId);
        $variant = $product->variants()->findOrFail($variantId);

        // Order history references variants, so one that has sold is deactivated
        // rather than deleted: receipts must keep resolving.
        if ($variant->orderItems()->exists()) {
            $variant->update(['is_active' => false]);
            $this->normaliseDefaults($product, null);
            $this->syncHasVariants($product);

            return response()->json([
                'message' => 'Option has past orders, so it was hidden instead of deleted.',
                'variants' => $this->serialize($product->fresh()),
            ]);
        }

        if ($product->variants()->count() <= 1) {
            return response()->json([
                'message' => 'A product needs at least one option.',
            ], 409);
        }

        DB::transaction(function () use ($product, $variant) {
            $variant->delete();
            $this->normaliseDefaults($product->fresh(), null);
        });

        $this->syncHasVariants($product);

        return response()->json([
            'message' => 'Option removed',
            'variants' => $this->serialize($product->fresh()),
        ]);
    }

    /**
     * Merchants may only touch their own store's products; admins may touch any.
     */
    protected function authorizeProduct(Request $request, int $productId): Product
    {
        $user = $request->user();

        $query = Product::query()->with(['variants', 'baseUnit']);

        if (! $user->is_admin) {
            $query->where('store_id', (int) $user->store_id);
        }

        return $query->findOrFail($productId);
    }

    protected function validatePayload(Request $request, Product $product, ?ProductVariant $existing = null): array
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'sku' => 'nullable|string|max:64',
            'base_unit_quantity' => 'required|numeric|min:0.001',
            'price' => 'required|numeric|min:0',
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        // Discrete units (piece, pack, sack) cannot be sold in fractions.
        $baseUnit = $product->baseUnit;
        $ratio = (float) $validated['base_unit_quantity'];

        if ($baseUnit && ! $baseUnit->is_fractional && floor($ratio) !== $ratio) {
            throw ValidationException::withMessages([
                'base_unit_quantity' => ["{$baseUnit->label} cannot be split, so use a whole number."],
            ]);
        }

        $duplicate = $product->variants()
            ->whereRaw('LOWER(name) = ?', [mb_strtolower(trim($validated['name']))])
            ->when($existing, fn ($query) => $query->where('id', '!=', $existing->id))
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages([
                'name' => ['This product already has an option with that name.'],
            ]);
        }

        $validated['name'] = trim($validated['name']);

        return $validated;
    }

    /**
     * Keep exactly one default, and never leave the default on an inactive option.
     */
    protected function normaliseDefaults(Product $product, ?ProductVariant $preferred): void
    {
        $variants = $product->variants()->get();
        if ($variants->isEmpty()) {
            return;
        }

        $target = null;

        if ($preferred && $preferred->is_default && $preferred->is_active) {
            $target = $preferred;
        }

        if (! $target) {
            $target = $variants->firstWhere(fn ($variant) => $variant->is_default && $variant->is_active)
                ?? $variants->firstWhere('is_active', true)
                ?? $variants->first();
        }

        foreach ($variants as $variant) {
            $shouldBeDefault = $variant->id === $target->id;

            if ((bool) $variant->is_default !== $shouldBeDefault) {
                $variant->update(['is_default' => $shouldBeDefault]);
            }
        }
    }

    protected function syncHasVariants(Product $product): void
    {
        $count = $product->variants()->where('is_active', true)->count();
        $product->forceFill(['has_variants' => $count > 1])->save();
    }

    protected function serialize(Product $product): array
    {
        return $product->variants()
            ->get()
            ->map(fn (ProductVariant $variant) => $this->serializeOne($variant, $product))
            ->all();
    }

    protected function serializeOne(ProductVariant $variant, Product $product): array
    {
        $variant->setRelation('product', $product);

        return [
            'id' => $variant->id,
            'name' => $variant->name,
            'sku' => $variant->sku,
            'base_unit_quantity' => (float) $variant->base_unit_quantity,
            'price' => (float) $variant->price,
            'is_default' => (bool) $variant->is_default,
            'is_active' => (bool) $variant->is_active,
            'sort_order' => (int) $variant->sort_order,
            'available_quantity' => $variant->availableQuantity(),
        ];
    }
}
