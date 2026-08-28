<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\EmailVerificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:50',
            'search' => 'nullable|string|max:255',
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $perPage = (int) ($validated['per_page'] ?? 20);

        $users = User::query()
            ->with('store')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($nestedQuery) use ($search) {
                    $nestedQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'users' => $users->getCollection()
                ->map(fn (User $user) => $this->formatUser($user))
                ->values(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
                'has_more_pages' => $users->hasMorePages(),
            ],
        ]);
    }

    public function store(Request $request, EmailVerificationService $emailVerification)
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
            'email' => Str::lower(trim((string) $request->input('email'))),
        ]);

        $payload = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'string', 'email:rfc', 'max:254', 'unique:users,email'],
            'password' => ['required', 'string', 'max:72', Password::min(8), 'confirmed'],
            'is_admin' => 'nullable|boolean',
        ]);

        $user = User::create([
            'name' => $payload['name'],
            'email' => $payload['email'],
            'password' => Hash::make($payload['password']),
            'is_admin' => (bool) ($payload['is_admin'] ?? false),
            'is_merchant' => false,
            'store_id' => null,
        ]);
        $emailSent = $emailVerification->send($user);

        return response()->json([
            'message' => 'User created successfully',
            'verification_required' => true,
            'verification_email_sent' => $emailSent,
            'user' => $this->formatUser($user->load('store')),
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $user = User::findOrFail($id);
        if ($user->is_merchant) {
            return response()->json([
                'message' => 'Merchant accounts must be updated from store management.',
            ], 422);
        }

        if ($request->has('name')) {
            $request->merge(['name' => trim((string) $request->input('name'))]);
        }
        if ($request->has('email')) {
            $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);
        }

        $payload = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:100'],
            'email' => ['sometimes', 'required', 'string', 'email:rfc', 'max:254', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'max:72', Password::min(8), 'confirmed'],
            'is_admin' => 'nullable|boolean',
        ]);

        if ($request->user()->id === $user->id && array_key_exists('is_admin', $payload) && ! $payload['is_admin']) {
            return response()->json([
                'message' => 'You cannot remove your own admin access.',
            ], 422);
        }

        if (array_key_exists('name', $payload)) {
            $user->name = $payload['name'];
        }
        if (array_key_exists('email', $payload)) {
            $user->email = $payload['email'];
        }
        if (array_key_exists('is_admin', $payload)) {
            $user->is_admin = (bool) $payload['is_admin'];
        }
        if (! empty($payload['password'])) {
            $user->password = Hash::make($payload['password']);
        }

        $user->save();

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $this->formatUser($user->fresh()->load('store')),
        ]);
    }

    public function destroy(Request $request, int $id)
    {
        $user = User::findOrFail($id);
        if ($request->user()->id === $user->id) {
            return response()->json([
                'message' => 'You cannot delete your own account.',
            ], 422);
        }

        $isMerchant = (bool) $user->is_merchant;
        $user->delete();

        return response()->json([
            'message' => $isMerchant ? 'Merchant account deleted successfully' : 'User deleted successfully',
        ]);
    }

    protected function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified' => $user->hasVerifiedEmail(),
            'is_admin' => (bool) $user->is_admin,
            'is_merchant' => (bool) $user->is_merchant,
            'store_id' => $user->store_id,
            'store' => $user->store ? [
                'id' => $user->store->id,
                'name' => $user->store->name,
                'slug' => $user->store->slug,
                'status' => $user->store->status,
            ] : null,
            'created_at' => optional($user->created_at)->toISOString(),
            'updated_at' => optional($user->updated_at)->toISOString(),
        ];
    }
}
