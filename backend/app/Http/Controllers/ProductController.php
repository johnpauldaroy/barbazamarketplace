<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
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
            'sort' => 'nullable|string|in:name,newest,price-low,price-high,stock',
        ]);

        $perPage = (int) ($validated['per_page'] ?? 9);
        $search = trim((string) ($validated['search'] ?? ''));
        $category = trim((string) ($validated['category'] ?? ''));
        $sort = $validated['sort'] ?? 'name';

        $products = Product::query()
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
            'categories' => $this->getCategoryCollection(),
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
        return response()->json([
            'product' => $this->formatProduct(Product::findOrFail($id)),
        ]);
    }

    public function categories()
    {
        return response()->json([
            'categories' => $this->getCategoryCollection(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'category' => 'required|string|max:100',
            'image' => 'nullable',
            'stock' => 'required|integer|min:0'
        ]);

        $data = $request->except('image');
        
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products', 'public');
            $data['image'] = $imagePath;
        } elseif (is_string($request->image) && $request->image !== '') {
            $data['image'] = $request->image;
        }

        $product = Product::create($data);

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
            'image' => 'nullable',
            'stock' => 'sometimes|required|integer|min:0'
        ]);

        $data = $request->except('image');
        
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

        $product->update($data);

        return response()->json([
            'message' => 'Product updated successfully',
            'product' => $this->formatProduct($product->fresh()),
        ]);
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

    protected function getCategoryCollection()
    {
        return Product::query()
            ->select('category')
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->values();
    }

    protected function formatProduct(Product $product): array
    {
        return [
            'id' => $product->id,
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
            'created_at' => optional($product->created_at)->toISOString(),
            'updated_at' => optional($product->updated_at)->toISOString(),
        ];
    }
}
