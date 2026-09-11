<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use Illuminate\Http\Request;

class MerchantPushSubscriptionController extends Controller
{
    public function index(Request $request)
    {
        return response()->json([
            'available' => $this->isConfigured(),
            'public_key' => $this->isConfigured() ? config('services.webpush.public_key') : null,
            'subscription_count' => $request->user()->pushSubscriptions()->count(),
        ]);
    }

    public function store(Request $request)
    {
        if (! $this->isConfigured()) {
            return response()->json(['message' => 'Push notifications are not configured on the server.'], 503);
        }

        $payload = $request->validate([
            'endpoint' => ['required', 'url', 'max:4096'],
            'keys' => ['required', 'array'],
            'keys.p256dh' => ['required', 'string', 'max:1000'],
            'keys.auth' => ['required', 'string', 'max:500'],
            'contentEncoding' => ['nullable', 'string', 'in:aesgcm,aes128gcm'],
        ]);

        $endpointHash = hash('sha256', $payload['endpoint']);
        $subscription = PushSubscription::query()->updateOrCreate(
            ['endpoint_hash' => $endpointHash],
            [
                'user_id' => $request->user()->id,
                'endpoint' => $payload['endpoint'],
                'public_key' => $payload['keys']['p256dh'],
                'auth_token' => $payload['keys']['auth'],
                'content_encoding' => $payload['contentEncoding'] ?? 'aes128gcm',
                'user_agent' => substr((string) $request->userAgent(), 0, 500) ?: null,
            ]
        );

        return response()->json([
            'message' => 'Push notifications enabled for this device.',
            'subscription_id' => $subscription->id,
        ], $subscription->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request)
    {
        $payload = $request->validate([
            'endpoint' => ['required', 'url', 'max:4096'],
        ]);

        $deleted = $request->user()->pushSubscriptions()
            ->where('endpoint_hash', hash('sha256', $payload['endpoint']))
            ->delete();

        return response()->json([
            'message' => 'Push notifications disabled for this device.',
            'removed' => $deleted > 0,
        ]);
    }

    private function isConfigured(): bool
    {
        return filled(config('services.webpush.public_key'))
            && filled(config('services.webpush.private_key'))
            && filled(config('services.webpush.subject'));
    }
}
