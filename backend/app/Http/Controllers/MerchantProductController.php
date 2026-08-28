<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MerchantProductController extends Controller
{
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
            Product::query()->with('store')
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

        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'category' => 'required|string|max:100',
            'image' => 'nullable',
            'stock' => 'required|integer|min:0',
            'low_stock_threshold' => 'sometimes|nullable|integer|min:0|max:100000',
        ]);

        $data = $request->except('image');
        $data['store_id'] = $storeId;

        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products', 'public');
            $data['image'] = $imagePath;
        } elseif (is_string($request->image) && $request->image !== '') {
            $data['image'] = $request->image;
        }

        $this->ensureCategoryExists($data['category'] ?? null, $storeId);
        $product = Product::create($data)->load('store');

        return response()->json([
            'message' => 'Product created successfully',
            'product' => $this->formatProduct($product),
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $storeId = (int) $request->user()->store_id;
        $product = Product::query()
            ->where('store_id', $storeId)
            ->findOrFail($id);

        $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|required|numeric|min:0',
            'category' => 'sometimes|required|string|max:100',
            'image' => 'nullable',
            'stock' => 'sometimes|required|integer|min:0',
            'low_stock_threshold' => 'sometimes|nullable|integer|min:0|max:100000',
        ]);

        $data = $request->except('image');
        $data['store_id'] = $storeId;

        if ($request->hasFile('image')) {
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }
            $imagePath = $request->file('image')->store('products', 'public');
            $data['image'] = $imagePath;
        } elseif (is_string($request->image) && $request->image !== '') {
            $data['image'] = $request->image;
        }

        $this->ensureCategoryExists($data['category'] ?? $product->category, $storeId);
        $product->update($data);

        return response()->json([
            'message' => 'Product updated successfully',
            'product' => $this->formatProduct($product->fresh()->load('store')),
        ]);
    }

    public function destroy(Request $request, int $id)
    {
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
            'low_stock_threshold' => (int) $product->low_stock_threshold,
            'is_low_stock' => $product->isLowStock(),
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
