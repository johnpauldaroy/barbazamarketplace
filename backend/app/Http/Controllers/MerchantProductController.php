<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use App\Services\InventoryService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MerchantProductController extends Controller
{
    public function __construct(private readonly InventoryService $inventory) {}

    public function index(Request $request)
    {
        $validated = $request->validate([
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:24',
            'search' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:100',
            'sort' => 'nullable|string|in:name,newest,price-low,price-high,stock',
        ]);

        $storeId = (int) $request->user()->store_id;
        $perPage = (int) ($validated['per_page'] ?? 9);
        $search = trim((string) ($validated['search'] ?? ''));
        $category = trim((string) ($validated['category'] ?? ''));
        $sort = $validated['sort'] ?? 'name';

        $products = $this->applyVisibleReviewSummary(
            Product::query()->with(['store', 'baseUnit', 'variants', 'images'])
        )
            ->where('store_id', $storeId)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($nestedQuery) use ($search) {
                    $nestedQuery
                        ->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($category !== '', fn ($query) => $query->where('category', $category));

        switch ($sort) {
            case 'newest':
                $products->orderByDesc('created_at');
                break;
            case 'price-low':
                $products->orderBy('price')->orderBy('title');
                break;
            case 'price-high':
                $products->orderByDesc('price')->orderBy('title');
                break;
            case 'stock':
                $products->orderByDesc('stock')->orderBy('title');
                break;
            case 'name':
            default:
                $products->orderBy('title');
                break;
        }

        $paginatedProducts = $products->paginate($perPage)->withQueryString();

        return response()->json([
            'products' => $paginatedProducts->getCollection()->map(
                fn (Product $product) => $this->formatProduct($product)
            )->values(),
            'categories' => $this->getCategoryCollection($storeId),
            'meta' => [
                'current_page' => $paginatedProducts->currentPage(),
                'last_page' => $paginatedProducts->lastPage(),
                'per_page' => $paginatedProducts->perPage(),
                'total' => $paginatedProducts->total(),
                'has_more_pages' => $paginatedProducts->hasMorePages(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $storeId = (int) $request->user()->store_id;

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'category' => 'required|string|max:100',
            'image' => 'nullable|image|max:5120',
            'images' => 'nullable|array|max:8',
            'images.*' => 'image|max:5120',
            'stock' => 'required|numeric|min:0|max:999999999.999',
            'low_stock_threshold' => 'sometimes|nullable|numeric|min:0|max:999999999.999',
        ]);

        $unit = Unit::defaultUnit();
        $stock = (float) $validated['stock'];
        $threshold = (float) ($validated['low_stock_threshold'] ?? 10);
        $this->inventory->assertQuantityForUnit($stock, $unit, 'stock', true);
        $this->inventory->assertQuantityForUnit($threshold, $unit, 'low_stock_threshold', true);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products', 'public');
        }

        $galleryPaths = array_map(
            fn ($file) => $file->store('products', 'public'),
            $request->file('images', [])
        );
        if (! $imagePath && $galleryPaths) {
            $imagePath = $galleryPaths[0];
        }

        $category = trim($validated['category']);
        $this->ensureCategoryExists($category, $storeId);
        $product = DB::transaction(function () use ($validated, $storeId, $unit, $stock, $threshold, $category, $imagePath, $galleryPaths, $request) {
            $product = Product::create([
                'store_id' => $storeId,
                'title' => trim($validated['title']),
                'description' => $validated['description'] ?? null,
                'price' => (float) $validated['price'],
                'category' => $category,
                'image' => $imagePath,
                'stock' => 0,
                'low_stock_threshold' => $threshold,
                'base_unit_id' => $unit->id,
                'has_variants' => false,
            ]);
            $product->ensureDefaultVariant();
            foreach ($galleryPaths as $index => $path) {
                $product->images()->create(['path' => $path, 'sort_order' => $index]);
            }
            $this->inventory->movement($product, $stock, 'opening', $request->user()->id, null, 'Merchant opening inventory');

            return $product;
        });
        $product->load(['store', 'baseUnit', 'variants', 'images']);

        return response()->json([
            'message' => 'Product created successfully',
            'product' => $this->formatProduct($product),
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $storeId = (int) $request->user()->store_id;
        $product = Product::query()
            ->with('baseUnit')
            ->where('store_id', $storeId)
            ->findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|required|numeric|min:0',
            'category' => 'sometimes|required|string|max:100',
            'image' => 'nullable|image|max:5120',
            'images' => 'nullable|array|max:8',
            'images.*' => 'image|max:5120',
            'remove_image_ids' => 'nullable|array',
            'remove_image_ids.*' => 'integer|exists:product_images,id',
            'stock' => 'sometimes|required|numeric|min:0|max:999999999.999',
            'low_stock_threshold' => 'sometimes|nullable|numeric|min:0|max:999999999.999',
        ]);

        $data = collect($validated)->except(['image', 'images', 'remove_image_ids', 'stock'])->all();
        if (array_key_exists('title', $data)) {
            $data['title'] = trim($data['title']);
        }
        if (array_key_exists('category', $data)) {
            $data['category'] = trim($data['category']);
        }
        if (array_key_exists('low_stock_threshold', $data)) {
            $this->inventory->assertQuantityForUnit((float) $data['low_stock_threshold'], $product->baseUnit, 'low_stock_threshold', true);
        }

        $oldImage = $product->image;
        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('products', 'public');
        }

        // Merchant products only ever belong to that merchant's own store, so
        // scoping the removal ids to this product is enough to prevent a
        // cross-store id from deleting someone else's gallery row.
        $removeIds = collect($validated['remove_image_ids'] ?? [])->map(fn ($id) => (int) $id);
        $removedImages = $removeIds->isNotEmpty()
            ? $product->images()->whereIn('id', $removeIds)->get()
            : collect();
        $galleryPaths = array_map(
            fn ($file) => $file->store('products', 'public'),
            $request->file('images', [])
        );

        $this->ensureCategoryExists($data['category'] ?? $product->category, $storeId);
        DB::transaction(function () use ($validated, $data, $product, $request) {
            if (array_key_exists('stock', $validated) && (float) $validated['stock'] !== (float) $product->stock) {
                $this->inventory->adjust($product, 'set', (float) $validated['stock'], $request->user()->id, 'Merchant product update');
            }
            if (array_key_exists('price', $data)) {
                $product->ensureDefaultVariant()->update(['price' => $data['price']]);
            }
            $product->update($data);
        });

        if ($removedImages->isNotEmpty()) {
            $product->images()->whereIn('id', $removedImages->pluck('id'))->delete();
        }
        if ($galleryPaths) {
            $nextSortOrder = (int) $product->images()->max('sort_order') + 1;
            foreach ($galleryPaths as $index => $path) {
                $product->images()->create(['path' => $path, 'sort_order' => $nextSortOrder + $index]);
            }
        }

        if (array_key_exists('image', $data) && $oldImage && $oldImage !== $data['image']) {
            Storage::disk('public')->delete($oldImage);
        }

        // Keep the single `image` column (every existing thumbnail call site)
        // pointed at the first gallery entry once one exists, so removing the
        // current primary doesn't leave it referencing a deleted file.
        if (! $request->hasFile('image') && ! array_key_exists('image', $data)) {
            $primary = $product->images()->first();
            if ($primary && $product->image !== $primary->path) {
                $product->update(['image' => $primary->path]);
            } elseif (! $primary && $removedImages->isNotEmpty()) {
                $product->update(['image' => null]);
            }
        }

        foreach ($removedImages as $removedImage) {
            Storage::disk('public')->delete($removedImage->path);
        }

        return response()->json([
            'message' => 'Product updated successfully',
            'product' => $this->formatProduct($product->fresh()->load(['store', 'baseUnit', 'variants', 'images'])),
        ]);
    }

    public function destroy(Request $request, int $id)
    {
        abort(403, 'Product management is restricted to administrators.');

        $storeId = (int) $request->user()->store_id;
        $product = Product::query()
            ->where('store_id', $storeId)
            ->findOrFail($id);

        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }

        $product->delete();

        return response()->json([
            'message' => 'Product deleted successfully',
        ]);
    }

    public function categories(Request $request)
    {
        $storeId = (int) $request->user()->store_id;

        return response()->json([
            'categories' => $this->getCategoryCollection($storeId),
        ]);
    }

    public function storeCategory(Request $request)
    {
        $storeId = (int) $request->user()->store_id;
        $validated = $request->validate([
            'name' => 'nullable|string|max:100',
            'category' => 'nullable|string|max:100',
        ]);

        $name = trim((string) ($validated['name'] ?? $validated['category'] ?? ''));
        if ($name === '') {
            return response()->json([
                'message' => 'Category name is required.',
            ], 422);
        }

        // Match against global (platform) categories too, so a merchant cannot
        // create a private duplicate that shadows an admin-defined category.
        $existingCategory = Category::query()
            ->visibleToStore($storeId)
            ->whereRaw('LOWER(name) = ?', [Str::lower($name)])
            ->first();

        if (!$existingCategory) {
            Category::create([
                'store_id' => $storeId,
                'name' => $name,
            ]);
        }

        return response()->json([
            'message' => $existingCategory ? 'Category already exists' : 'Category created successfully',
            'categories' => $this->getCategoryCollection($storeId),
        ], $existingCategory ? 200 : 201);
    }

    protected function getCategoryCollection(int $storeId)
    {
        // Platform-store categories are global: admin defines them once and every
        // store inherits them, alongside its own private categories.
        $storedCategories = Category::query()
            ->select('name')
            ->visibleToStore($storeId)
            ->whereNotNull('name')
            ->where('name', '!=', '')
            ->pluck('name');

        $productCategories = Product::query()
            ->select('category')
            ->where('store_id', $storeId)
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->orderBy('category')
            ->pluck('category');

        return $storedCategories
            ->merge($productCategories)
            ->map(fn ($category) => trim((string) $category))
            ->filter(fn ($category) => $category !== '')
            ->unique(fn ($category) => Str::lower($category))
            ->sortBy(fn ($category) => Str::lower($category))
            ->values();
    }

    protected function ensureCategoryExists(?string $categoryName, int $storeId): void
    {
        $name = trim((string) $categoryName);
        if ($name === '') {
            return;
        }

        $exists = Category::query()
            ->visibleToStore($storeId)
            ->whereRaw('LOWER(name) = ?', [Str::lower($name)])
            ->exists();

        if (!$exists) {
            Category::create([
                'store_id' => $storeId,
                'name' => $name,
            ]);
        }
    }

    protected function applyVisibleReviewSummary(Builder $query): Builder
    {
        static $productReviewsTableExists;

        if ($productReviewsTableExists === null) {
            $productReviewsTableExists = Schema::hasTable('product_reviews');
        }

        if (!$productReviewsTableExists) {
            return $query;
        }

        return $query
            ->withAvg([
                'reviews as visible_reviews_average_rating' => fn ($reviewQuery) => $reviewQuery->visible(),
            ], 'rating')
            ->withCount([
                'reviews as visible_reviews_count' => fn ($reviewQuery) => $reviewQuery->visible(),
            ]);
    }

    protected function formatImages(Product $product): array
    {
        $images = $product->relationLoaded('images')
            ? $product->images
            : $product->images()->get();

        return $images->map(fn (\App\Models\ProductImage $image) => [
            'id' => $image->id,
            'url' => $image->url,
        ])->values()->all();
    }

    protected function formatProduct(Product $product): array
    {
        $store = $product->store;

        return [
            'id' => $product->id,
            'store_id' => $product->store_id,
            'store' => $store ? [
                'id' => $store->id,
                'name' => $store->name,
                'slug' => $store->slug,
                'status' => $store->status,
            ] : null,
            'title' => $product->title,
            'name' => $product->title,
            'description' => $product->description,
            'price' => (float) $product->price,
            'category' => $product->category,
            'category_slug' => Str::slug($product->category ?? 'general'),
            'image' => $product->image,
            'image_url' => $product->image_url,
            'images' => $this->formatImages($product),
            'stock' => (float) $product->stock,
            'base_unit' => $product->baseUnit ? [
                'id' => $product->baseUnit->id,
                'code' => $product->baseUnit->code,
                'label' => $product->baseUnit->label,
                'is_fractional' => (bool) $product->baseUnit->is_fractional,
            ] : null,
            'has_variants' => (bool) $product->has_variants,
            'variants' => $product->variants->where('is_active', true)->map(function ($variant) use ($product) {
                $variant->setRelation('product', $product);
                return [
                    'id' => $variant->id, 'name' => $variant->name, 'sku' => $variant->sku,
                    'base_unit_quantity' => (float) $variant->base_unit_quantity,
                    'price' => (float) $variant->price, 'is_default' => (bool) $variant->is_default,
                    'available_quantity' => $variant->availableQuantity(),
                ];
            })->values(),
            'low_stock_threshold' => (float) $product->low_stock_threshold,
            'is_low_stock' => $product->isLowStock(),
            'is_in_stock' => (float) $product->stock > 0,
            'review_summary' => [
                'average_rating' => round((float) ($product->visible_reviews_average_rating ?? 0), 2),
                'ratings_count' => (int) ($product->visible_reviews_count ?? 0),
            ],
            'created_at' => optional($product->created_at)->toISOString(),
            'updated_at' => optional($product->updated_at)->toISOString(),
        ];
    }
}
