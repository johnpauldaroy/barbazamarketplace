<?php

namespace App\Http\Controllers;

use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PublicStoreController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:24',
            'search' => 'nullable|string|max:255',
        ]);

        $perPage = (int) ($validated['per_page'] ?? 12);
        $search = trim((string) ($validated['search'] ?? ''));

        $stores = Store::query()
            ->where('status', 'active')
            ->withCount('products')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($nestedQuery) use ($search) {
                    $nestedQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('slug', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('city', 'like', "%{$search}%")
                        ->orWhere('province', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'stores' => $stores->getCollection()->map(
                fn (Store $store) => $this->formatStore($store, false)
            )->values(),
            'meta' => [
                'current_page' => $stores->currentPage(),
                'last_page' => $stores->lastPage(),
                'per_page' => $stores->perPage(),
                'total' => $stores->total(),
                'has_more_pages' => $stores->hasMorePages(),
            ],
        ]);
    }

    public function show(string $slug)
    {
        $store = Store::query()
            ->where('status', 'active')
            ->where('slug', $slug)
            ->withCount('products')
            ->firstOrFail();

        return response()->json([
            'store' => $this->formatStore($store, true),
        ]);
    }

    protected function formatStore(Store $store, bool $includeContactFields): array
    {
        $payload = [
            'id' => $store->id,
            'name' => $store->name,
            'slug' => $store->slug,
            'status' => $store->status,
            'description' => $store->description,
            'city' => $store->city,
            'province' => $store->province,
            'country' => $store->country,
            'logo_image' => $this->toImageUrl($store->logo_image),
            'cover_image' => $this->toImageUrl($store->cover_image),
            'product_count' => (int) ($store->products_count ?? 0),
            'created_at' => optional($store->created_at)->toISOString(),
            'updated_at' => optional($store->updated_at)->toISOString(),
        ];

        if ($includeContactFields) {
            $payload['contact_email'] = $store->contact_email;
            $payload['contact_phone'] = $store->contact_phone;
            $payload['address_line_1'] = $store->address_line_1;
            $payload['address_line_2'] = $store->address_line_2;
            $payload['postal_code'] = $store->postal_code;
        }

        $payload['facebook_url'] = $store->facebook_url;

        return $payload;
    }

    protected function toImageUrl(?string $storedValue): ?string
    {
        if (!$storedValue) {
            return null;
        }

        $normalized = trim($storedValue);
        if ($normalized === '') {
            return null;
        }

        if (Str::startsWith($normalized, ['http://', 'https://', 'data:'])) {
            return $normalized;
        }

        $normalizedPath = ltrim($normalized, '/');
        $path = Str::startsWith($normalizedPath, 'storage/')
            ? Str::after($normalizedPath, 'storage/')
            : $normalizedPath;

        return '/storage/' . $path;
    }
}
