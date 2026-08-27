<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Models\User;
use App\Services\EmailVerificationService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AdminStoreController extends Controller
{
    public function index()
    {
        $stores = Store::query()
            ->with([
                'users' => fn ($query) => $query
                    ->where('is_merchant', true)
                    ->orderByDesc('created_at'),
            ])
            ->orderBy('name')
            ->get();

        return response()->json([
            'stores' => $stores->map(fn (Store $store) => $this->formatStore($store, true))->values(),
        ]);
    }

    public function store(Request $request)
    {
        $payload = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'status' => 'nullable|string|in:active,inactive',
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

        $name = trim($payload['name']);
        $slugSeed = trim((string) ($payload['slug'] ?? $name));
        $logoImage = $this->normalizeNullableString($payload['logo_image'] ?? null);
        $coverImage = $this->normalizeNullableString($payload['cover_image'] ?? null);

        if ($request->hasFile('logo_image_file')) {
            $logoImage = $this->storeImageFile($request->file('logo_image_file'), 'stores/logo');
        }

        if ($request->hasFile('cover_image_file')) {
            $coverImage = $this->storeImageFile($request->file('cover_image_file'), 'stores/cover');
        }

        $store = Store::create([
            'name' => $name,
            'slug' => Store::resolveUniqueSlug($slugSeed),
            'status' => $payload['status'] ?? 'active',
            'description' => $this->normalizeNullableString($payload['description'] ?? null),
            'contact_email' => $this->normalizeNullableString($payload['contact_email'] ?? null),
            'contact_phone' => $this->normalizeNullableString($payload['contact_phone'] ?? null),
            'address_line_1' => $this->normalizeNullableString($payload['address_line_1'] ?? null),
            'address_line_2' => $this->normalizeNullableString($payload['address_line_2'] ?? null),
            'city' => $this->normalizeNullableString($payload['city'] ?? null),
            'province' => $this->normalizeNullableString($payload['province'] ?? null),
            'postal_code' => $this->normalizeNullableString($payload['postal_code'] ?? null),
            'country' => $this->normalizeNullableString($payload['country'] ?? null),
            'logo_image' => $logoImage,
            'cover_image' => $coverImage,
            'facebook_url' => $this->normalizeNullableString($payload['facebook_url'] ?? null),
        ]);

        return response()->json([
            'message' => 'Store created successfully',
            'store' => $this->formatStore($store->fresh(), true),
        ], 201);
    }

    public function update(Request $request, int $storeId)
    {
        $store = Store::query()->findOrFail($storeId);

        $payload = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'status' => 'nullable|string|in:active,inactive',
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

        if (array_key_exists('status', $payload)) {
            $store->status = $payload['status'];
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
            'store' => $this->formatStore($store->fresh(), true),
        ]);
    }

    public function destroy(int $storeId)
    {
        $store = Store::query()->findOrFail($storeId);
        $store->status = 'inactive';
        $store->save();

        return response()->json([
            'message' => 'Store has been set to inactive',
            'store' => $this->formatStore($store->fresh(), true),
        ]);
    }

    public function storeMerchant(Request $request, int $storeId, EmailVerificationService $emailVerification)
    {
        $store = Store::query()->findOrFail($storeId);

        $request->merge([
            'name' => trim((string) $request->input('name')),
            'email' => Str::lower(trim((string) $request->input('email'))),
        ]);

        $payload = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'string', 'email:rfc', 'max:254', 'unique:users,email'],
            'password' => ['required', 'string', 'max:72', Password::min(8), 'confirmed'],
        ]);

        $merchant = User::create([
            'name' => trim($payload['name']),
            'email' => trim($payload['email']),
            'password' => Hash::make($payload['password']),
            'is_admin' => false,
            'is_merchant' => true,
            'store_id' => $store->id,
        ]);
        $emailSent = $emailVerification->send($merchant);

        $merchant->load('store');

        return response()->json([
            'message' => 'Merchant created successfully',
            'verification_required' => true,
            'verification_email_sent' => $emailSent,
            'merchant' => $this->formatMerchant($merchant),
        ], 201);
    }

    public function updateMerchant(Request $request, int $userId)
    {
        $merchant = User::query()->findOrFail($userId);

        if ($request->has('name')) {
            $request->merge(['name' => trim((string) $request->input('name'))]);
        }
        if ($request->has('email')) {
            $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);
        }

        $payload = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:100'],
            'email' => ['sometimes', 'required', 'string', 'email:rfc', 'max:254', Rule::unique('users', 'email')->ignore($merchant->id)],
            'password' => ['nullable', 'string', 'max:72', Password::min(8), 'confirmed'],
            'is_merchant' => 'nullable|boolean',
            'store_id' => 'nullable|integer|exists:stores,id',
        ]);

        $nextIsMerchant = array_key_exists('is_merchant', $payload)
            ? (bool) $payload['is_merchant']
            : (bool) $merchant->is_merchant;
        $nextStoreId = array_key_exists('store_id', $payload)
            ? $payload['store_id']
            : $merchant->store_id;

        if ($nextIsMerchant && ! $nextStoreId) {
            return response()->json([
                'message' => 'Merchant accounts must be assigned to a store.',
            ], 422);
        }

        if (array_key_exists('name', $payload)) {
            $merchant->name = trim($payload['name']);
        }
        if (array_key_exists('email', $payload)) {
            $merchant->email = trim($payload['email']);
        }
        if (! empty($payload['password'])) {
            $merchant->password = Hash::make($payload['password']);
        }

        $merchant->is_admin = false;
        $merchant->is_merchant = $nextIsMerchant;
        $merchant->store_id = $nextIsMerchant ? $nextStoreId : null;
        $merchant->save();
        $merchant->load('store');

        return response()->json([
            'message' => 'Merchant updated successfully',
            'merchant' => $this->formatMerchant($merchant),
        ]);
    }

    protected function formatStore(Store $store, bool $includeMerchants = false): array
    {
        $response = [
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

        if ($includeMerchants) {
            $merchants = $store->users->filter(fn (User $user) => (bool) $user->is_merchant)->values();
            $response['merchant_count'] = $merchants->count();
            $response['merchants'] = $merchants->map(fn (User $user) => $this->formatMerchant($user))->values();
        }

        return $response;
    }

    protected function formatMerchant(User $merchant): array
    {
        $store = $merchant->store;

        return [
            'id' => $merchant->id,
            'name' => $merchant->name,
            'email' => $merchant->email,
            'email_verified' => $merchant->hasVerifiedEmail(),
            'is_admin' => (bool) $merchant->is_admin,
            'is_merchant' => (bool) $merchant->is_merchant,
            'store_id' => $merchant->store_id,
            'store' => $store ? [
                'id' => $store->id,
                'name' => $store->name,
                'slug' => $store->slug,
                'status' => $store->status,
            ] : null,
            'created_at' => optional($merchant->created_at)->toISOString(),
            'updated_at' => optional($merchant->updated_at)->toISOString(),
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
        if (! $file) {
            return null;
        }

        return $file->store($directory, 'public');
    }

    protected function removeManagedStoreImage(?string $storedValue): void
    {
        $path = $this->extractStoragePath($storedValue);
        if (! $path) {
            return;
        }

        Storage::disk('public')->delete($path);
    }

    protected function toImageUrl(?string $storedValue): ?string
    {
        if (! $storedValue) {
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
        if (! $path) {
            return $normalized;
        }

        return '/storage/'.$path;
    }

    protected function extractStoragePath(?string $storedValue): ?string
    {
        if (! $storedValue) {
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
