<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:24',
            'search' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:100',
            'store_id' => 'nullable|integer|exists:stores,id',
            'sort' => 'nullable|string|in:name,newest,price-low,price-high,stock',
        ]);

        $perPage = (int) ($validated['per_page'] ?? 9);
        $search = trim((string) ($validated['search'] ?? ''));
        $category = trim((string) ($validated['category'] ?? ''));
        $storeId = isset($validated['store_id']) ? (int) $validated['store_id'] : null;
        $sort = $validated['sort'] ?? 'name';

        $products = $this->applyVisibleReviewSummary(
            Product::query()->with('store')
        )
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($nestedQuery) use ($search) {
                    $nestedQuery
                        ->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($category !== '', fn ($query) => $query->where('category', $category))
            ->when($storeId, fn ($query) => $query->where('store_id', $storeId));

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

    public function show($id)
    {
        $product = $this->applyVisibleReviewSummary(
            Product::query()->with('store')
        )->findOrFail($id);

        return response()->json([
            'product' => $this->formatProduct($product),
        ]);
    }

    public function categories(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'nullable|integer|exists:stores,id',
        ]);
        $storeId = isset($validated['store_id']) ? (int) $validated['store_id'] : null;

        return response()->json([
            'categories' => $this->getCategoryCollection($storeId),
        ]);
    }

    public function storeCategory(Request $request)
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:100',
            'category' => 'nullable|string|max:100',
            'store_id' => 'nullable|integer|exists:stores,id',
        ]);

        $name = trim((string) ($validated['name'] ?? $validated['category'] ?? ''));
        if ($name === '') {
            return response()->json([
                'message' => 'Category name is required.',
            ], 422);
        }

        $storeId = isset($validated['store_id'])
            ? (int) $validated['store_id']
            : Store::ensurePlatformStore()->id;

        $existingCategory = Category::query()
            ->where('store_id', $storeId)
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

    public function updateCategory(Request $request, string $name)
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:100',
            'category' => 'nullable|string|max:100',
            'store_id' => 'nullable|integer|exists:stores,id',
        ]);

        $oldName = trim(urldecode($name));
        $newName = trim((string) ($validated['name'] ?? $validated['category'] ?? ''));

        if ($oldName === '' || $newName === '') {
            return response()->json([
                'message' => 'Category name is required.',
            ], 422);
        }

        $storeId = isset($validated['store_id'])
            ? (int) $validated['store_id']
            : Store::ensurePlatformStore()->id;

        if (Str::lower($oldName) === Str::lower($newName)) {
            return response()->json([
                'message' => 'Category updated successfully',
                'categories' => $this->getCategoryCollection($storeId),
            ]);
        }

        $oldCategory = $this->findCategoryByName($oldName, $storeId);
        $targetCategory = $this->findCategoryByName($newName, $storeId);
        $productCount = $this->productCategoryQuery($oldName, $storeId)->count();

        if (!$oldCategory && $productCount === 0) {
            return response()->json([
                'message' => 'Category not found.',
            ], 404);
        }

        DB::transaction(function () use ($oldCategory, $targetCategory, $oldName, $newName, $storeId) {
            if ($targetCategory && $oldCategory && $targetCategory->id !== $oldCategory->id) {
                $oldCategory->delete();
            } elseif ($oldCategory) {
                $oldCategory->update(['name' => $newName]);
            } elseif (!$targetCategory) {
                Category::create([
                    'store_id' => $storeId,
                    'name' => $newName,
                ]);
            }

            $this->productCategoryQuery($oldName, $storeId)->update(['category' => $newName]);
        });

        return response()->json([
            'message' => 'Category updated successfully',
            'categories' => $this->getCategoryCollection($storeId),
        ]);
    }

    public function destroyCategory(Request $request, string $name)
    {
        $validated = $request->validate([
            'store_id' => 'nullable|integer|exists:stores,id',
        ]);

        $categoryName = trim(urldecode($name));
        if ($categoryName === '') {
            return response()->json([
                'message' => 'Category name is required.',
            ], 422);
        }

        $storeId = isset($validated['store_id'])
            ? (int) $validated['store_id']
            : Store::ensurePlatformStore()->id;

        $productCount = $this->productCategoryQuery($categoryName, $storeId)->count();
        if ($productCount > 0) {
            return response()->json([
                'message' => 'Category is used by products. Update those products before deleting it.',
            ], 409);
        }

        $category = $this->findCategoryByName($categoryName, $storeId);
        if (!$category) {
            return response()->json([
                'message' => 'Category not found.',
            ], 404);
        }

        $category->delete();

        return response()->json([
            'message' => 'Category deleted successfully',
            'categories' => $this->getCategoryCollection($storeId),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'category' => 'required|string|max:100',
            'store_id' => 'nullable|integer|exists:stores,id',
            'image' => 'nullable',
            'stock' => 'required|integer|min:0'
        ]);

        $storeId = $request->input('store_id')
            ? (int) $request->input('store_id')
            : Store::ensurePlatformStore()->id;

        $data = $request->except('image');
        $data['store_id'] = $storeId;
        
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products', 'public');
            $data['image'] = $imagePath;
        } elseif (is_string($request->image) && $request->image !== '') {
            $data['image'] = $request->image;
        }

        $this->ensureCategoryExists($data['category'] ?? null, $storeId);
        $product = Product::create($data);
        $product->load('store');

        return response()->json([
            'message' => 'Product created successfully',
            'product' => $this->formatProduct($product),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        
        $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|required|numeric|min:0',
            'category' => 'sometimes|required|string|max:100',
            'store_id' => 'nullable|integer|exists:stores,id',
            'image' => 'nullable',
            'stock' => 'sometimes|required|integer|min:0'
        ]);

        $data = $request->except('image');
        $targetStoreId = array_key_exists('store_id', $data)
            ? (int) $data['store_id']
            : (int) $product->store_id;
        $data['store_id'] = $targetStoreId;
        
        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }
            $imagePath = $request->file('image')->store('products', 'public');
            $data['image'] = $imagePath;
        } elseif (is_string($request->image) && $request->image !== '') {
            $data['image'] = $request->image;
        }

        $this->ensureCategoryExists($data['category'] ?? $product->category, $targetStoreId);
        $product->update($data);

        return response()->json([
            'message' => 'Product updated successfully',
            'product' => $this->formatProduct($product->fresh()->load('store')),
        ]);
    }

    public function bulkImport(Request $request)
    {
        $request->validate([
            'products'          => 'required|array|min:1|max:500',
            'products.*.title'    => 'required|string|max:255',
            'products.*.price'    => 'required|numeric|min:0',
            'products.*.category' => 'required|string|max:100',
            'products.*.stock'    => 'required|integer|min:0',
            'products.*.description' => 'nullable|string',
            'products.*.store_id'    => 'nullable|integer|exists:stores,id',
        ]);

        $defaultStoreId = Store::ensurePlatformStore()->id;
        $created = [];
        $errors  = [];

        foreach ($request->products as $index => $row) {
            try {
                $storeId = isset($row['store_id']) && $row['store_id']
                    ? (int) $row['store_id']
                    : $defaultStoreId;

                $this->ensureCategoryExists($row['category'], $storeId);

                $product = Product::create([
                    'title'       => trim($row['title']),
                    'description' => $row['description'] ?? null,
                    'price'       => $row['price'],
                    'category'    => $row['category'],
                    'stock'       => $row['stock'],
                    'store_id'    => $storeId,
                    'image'       => null,
                ]);

                $product->load('store');
                $created[] = $this->formatProduct($product);
            } catch (\Throwable $e) {
                $errors[] = ['row' => $index + 1, 'title' => $row['title'] ?? '?', 'error' => $e->getMessage()];
            }
        }

        return response()->json([
            'message' => count($created) . ' product(s) imported successfully.',
            'imported' => count($created),
            'failed'   => count($errors),
            'products' => $created,
            'errors'   => $errors,
        ], 201);
    }

    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        
        // Delete image if exists
        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }

        $product->delete();
        return response()->json(['message' => 'Product deleted successfully']);
    }

    protected function getCategoryCollection(?int $storeId = null)
    {
        $storedCategories = Category::query()
            ->select('name')
            ->whereNotNull('name')
            ->where('name', '!=', '')
            ->when($storeId, fn ($query) => $query->where('store_id', $storeId))
            ->pluck('name');

        $productCategories = Product::query()
            ->select('category')
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->when($storeId, fn ($query) => $query->where('store_id', $storeId))
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
            ->where('store_id', $storeId)
            ->whereRaw('LOWER(name) = ?', [Str::lower($name)])
            ->exists();

        if (!$exists) {
            Category::create([
                'store_id' => $storeId,
                'name' => $name,
            ]);
        }
    }

    protected function findCategoryByName(string $name, int $storeId): ?Category
    {
        return Category::query()
            ->where('store_id', $storeId)
            ->whereRaw('LOWER(name) = ?', [Str::lower($name)])
            ->first();
    }

    protected function productCategoryQuery(string $name, int $storeId): Builder
    {
        return Product::query()
            ->where('store_id', $storeId)
            ->whereRaw('LOWER(category) = ?', [Str::lower($name)]);
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
            'stock' => (int) $product->stock,
            'is_in_stock' => (int) $product->stock > 0,
            'review_summary' => [
                'average_rating' => round((float) ($product->visible_reviews_average_rating ?? 0), 2),
                'ratings_count' => (int) ($product->visible_reviews_count ?? 0),
            ],
            'created_at' => optional($product->created_at)->toISOString(),
            'updated_at' => optional($product->updated_at)->toISOString(),
        ];
    }
}
