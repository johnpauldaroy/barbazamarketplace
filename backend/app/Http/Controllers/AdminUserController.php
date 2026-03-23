<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

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

    public function store(Request $request)
    {
        $payload = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'is_admin' => 'nullable|boolean',
        ]);

        $user = User::create([
            'name' => $payload['name'],
            'email' => $payload['email'],
            'password' => Hash::make($payload['password']),
            'is_admin' => (bool) ($payload['is_admin'] ?? false),
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $this->formatUser($user),
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $user = User::findOrFail($id);

        $payload = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => 'nullable|string|min:8|confirmed',
            'is_admin' => 'nullable|boolean',
        ]);

        if ($request->user()->id === $user->id && array_key_exists('is_admin', $payload) && !$payload['is_admin']) {
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
        if (!empty($payload['password'])) {
            $user->password = Hash::make($payload['password']);
        }

        $user->save();

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $this->formatUser($user->fresh()),
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

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully',
        ]);
    }

    protected function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => (bool) $user->is_admin,
            'created_at' => optional($user->created_at)->toISOString(),
            'updated_at' => optional($user->updated_at)->toISOString(),
        ];
    }
}

