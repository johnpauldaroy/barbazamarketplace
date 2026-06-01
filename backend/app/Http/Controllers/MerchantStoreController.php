<?php

namespace App\Http\Controllers;

use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MerchantStoreController extends Controller
{
    public function show(Request $request)
    {
        $store = $request->user()?->store;
        if (!$store) {
            return response()->json(['message' => 'Store not found for merchant account.'], 404);
        }

        return response()->json([
            'store' => $this->formatStore($store),
        ]);
    }

    public function update(Request $request)
    {
        $store = $request->user()?->store;
        if (!$store) {
            return response()->json(['message' => 'Store not found for merchant account.'], 404);
        }

        $payload = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'contact_email' => 'nullable|email|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'address_line_1' => 'nullable|string|max:255',
            'address_line_2' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:120',
            'province' => 'nullable|string|max:120',
            'postal_code' => 'nullable|string|max:30',
            'country' => 'nullable|string|max:120',
            'logo_image' => 'nullable|string|max:2048',
            'cover_image' => 'nullable|string|max:2048',
            'logo_image_file' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'cover_image_file' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'facebook_url' => 'nullable|url|max:2048',
        ]);

        if (array_key_exists('name', $payload)) {
            $store->name = trim($payload['name']);
        }

        if (array_key_exists('slug', $payload)) {
            $slugSeed = trim((string) $payload['slug']);
            if ($slugSeed !== '') {
                $store->slug = Store::resolveUniqueSlug($slugSeed, $store->id);
            }
        } elseif (array_key_exists('name', $payload)) {
            $store->slug = Store::resolveUniqueSlug((string) $store->name, $store->id);
        }

        if (array_key_exists('description', $payload)) {
            $store->description = $this->normalizeNullableString($payload['description']);
        }
        if (array_key_exists('contact_email', $payload)) {
            $store->contact_email = $this->normalizeNullableString($payload['contact_email']);
        }
        if (array_key_exists('contact_phone', $payload)) {
            $store->contact_phone = $this->normalizeNullableString($payload['contact_phone']);
        }
        if (array_key_exists('address_line_1', $payload)) {
            $store->address_line_1 = $this->normalizeNullableString($payload['address_line_1']);
        }
        if (array_key_exists('address_line_2', $payload)) {
            $store->address_line_2 = $this->normalizeNullableString($payload['address_line_2']);
        }
        if (array_key_exists('city', $payload)) {
            $store->city = $this->normalizeNullableString($payload['city']);
        }
        if (array_key_exists('province', $payload)) {
            $store->province = $this->normalizeNullableString($payload['province']);
        }
        if (array_key_exists('postal_code', $payload)) {
            $store->postal_code = $this->normalizeNullableString($payload['postal_code']);
        }
        if (array_key_exists('country', $payload)) {
            $store->country = $this->normalizeNullableString($payload['country']);
        }
        if (array_key_exists('logo_image', $payload)) {
            $store->logo_image = $this->normalizeNullableString($payload['logo_image']);
        }
        if (array_key_exists('cover_image', $payload)) {
            $store->cover_image = $this->normalizeNullableString($payload['cover_image']);
        }
        if (array_key_exists('facebook_url', $payload)) {
            $store->facebook_url = $this->normalizeNullableString($payload['facebook_url']);
        }
        if ($request->hasFile('logo_image_file')) {
            $this->removeManagedStoreImage($store->logo_image);
            $store->logo_image = $this->storeImageFile($request->file('logo_image_file'), 'stores/logo');
        }
        if ($request->hasFile('cover_image_file')) {
            $this->removeManagedStoreImage($store->cover_image);
            $store->cover_image = $this->storeImageFile($request->file('cover_image_file'), 'stores/cover');
        }

        $store->save();

        return response()->json([
            'message' => 'Store updated successfully',
            'store' => $this->formatStore($store->fresh()),
        ]);
    }

    protected function formatStore(Store $store): array
    {
        return [
            'id' => $store->id,
            'name' => $store->name,
            'slug' => $store->slug,
            'status' => $store->status,
            'description' => $store->description,
            'contact_email' => $store->contact_email,
            'contact_phone' => $store->contact_phone,
            'address_line_1' => $store->address_line_1,
            'address_line_2' => $store->address_line_2,
            'city' => $store->city,
            'province' => $store->province,
            'postal_code' => $store->postal_code,
            'country' => $store->country,
            'logo_image' => $this->toImageUrl($store->logo_image),
            'cover_image' => $this->toImageUrl($store->cover_image),
            'facebook_url' => $store->facebook_url,
            'created_at' => optional($store->created_at)->toISOString(),
            'updated_at' => optional($store->updated_at)->toISOString(),
        ];
    }

    protected function normalizeNullableString($value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = trim((string) $value);
        return $normalized === '' ? null : $normalized;
    }

    protected function storeImageFile(?UploadedFile $file, string $directory): ?string
    {
        if (!$file) {
            return null;
        }

        return $file->store($directory, 'public');
    }

    protected function removeManagedStoreImage(?string $storedValue): void
    {
        $path = $this->extractStoragePath($storedValue);
        if (!$path) {
            return;
        }

        Storage::disk('public')->delete($path);
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

        $path = $this->extractStoragePath($normalized);
        if (!$path) {
            return $normalized;
        }

        return asset('storage/' . $path);
    }

    protected function extractStoragePath(?string $storedValue): ?string
    {
        if (!$storedValue) {
            return null;
        }

        $normalized = ltrim(trim($storedValue), '/');
        if ($normalized === '') {
            return null;
        }

        if (Str::startsWith($normalized, ['http://', 'https://', 'data:'])) {
            return null;
        }

        return Str::startsWith($normalized, 'storage/')
            ? Str::after($normalized, 'storage/')
            : $normalized;
    }
}
