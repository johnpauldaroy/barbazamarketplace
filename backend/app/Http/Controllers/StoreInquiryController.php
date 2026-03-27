<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Models\StoreInquiry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Laravel\Sanctum\PersonalAccessToken;

class StoreInquiryController extends Controller
{
    public function store(Request $request, string $slug)
    {
        $store = Store::query()
            ->where('status', 'active')
            ->where('slug', $slug)
            ->firstOrFail();

        $user = $this->resolveAuthenticatedUser($request);
        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'message' => 'required|string|max:5000',
            'website' => 'nullable|string|max:0',
        ]);

        $validator->after(function ($validator) use ($request, $user) {
            $name = trim((string) $request->input('name'));
            $email = trim((string) $request->input('email'));

            if (!$user && $name === '') {
                $validator->errors()->add('name', 'Name is required for guest inquiries.');
            }
            if (!$user && $email === '') {
                $validator->errors()->add('email', 'Email is required for guest inquiries.');
            }
        });

        $payload = $validator->validate();
        $submittedName = trim((string) ($payload['name'] ?? ''));
        $submittedEmail = trim((string) ($payload['email'] ?? ''));
        $resolvedName = $submittedName !== '' ? $submittedName : trim((string) ($user?->name ?? ''));
        $resolvedEmail = $submittedEmail !== '' ? $submittedEmail : trim((string) ($user?->email ?? ''));

        if ($resolvedName === '' || $resolvedEmail === '') {
            return response()->json([
                'message' => 'Name and email are required.',
            ], 422);
        }

        $inquiry = StoreInquiry::create([
            'store_id' => $store->id,
            'user_id' => $user?->id,
            'name' => $resolvedName,
            'email' => $resolvedEmail,
            'phone' => trim((string) ($payload['phone'] ?? '')) ?: null,
            'message' => trim((string) $payload['message']),
            'status' => StoreInquiry::STATUS_OPEN,
            'source_ip' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Inquiry submitted successfully.',
            'inquiry' => [
                'id' => $inquiry->id,
                'status' => $inquiry->status,
                'created_at' => optional($inquiry->created_at)->toISOString(),
            ],
        ], 201);
    }

    protected function resolveAuthenticatedUser(Request $request): ?User
    {
        $bearerToken = $request->bearerToken();
        if (!$bearerToken) {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($bearerToken);
        $tokenable = $accessToken?->tokenable;

        return $tokenable instanceof User ? $tokenable : null;
    }
}
