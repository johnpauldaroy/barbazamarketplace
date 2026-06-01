<?php

namespace App\Http\Controllers;

use App\Models\OrderFeedback;
use App\Models\OrderFeedbackLink;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderFeedbackController extends Controller
{
    public function show(string $token)
    {
        $tokenHash = hash('sha256', $token);

        $link = OrderFeedbackLink::query()
            ->with(['order', 'order.user'])
            ->where('token_hash', $tokenHash)
            ->first();

        if (!$link) {
            return response()->json(['message' => 'Feedback link not found.'], 404);
        }

        $isExpired = $link->expires_at && $link->expires_at->isPast();
        $hasFeedback = OrderFeedback::query()->where('order_id', $link->order_id)->exists();

        if ($isExpired || $link->used_at || $hasFeedback) {
            return response()->json(['message' => 'Feedback link is no longer available.'], 410);
        }

        return response()->json([
            'link' => [
                'order_id' => $link->order_id,
                'email' => $link->email,
                'customer_name' => $link->order?->customer_name ?? $link->order?->user?->name,
                'expires_at' => optional($link->expires_at)->toISOString(),
                'is_used' => false,
            ],
        ]);
    }

    public function submit(Request $request, string $token)
    {
        $tokenHash = hash('sha256', $token);

        $payload = $request->validate([
            'full_name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'rating' => 'required|integer|min:1|max:5',
            'message' => 'required|string|max:2000',
        ]);

        return DB::transaction(function () use ($tokenHash, $payload) {
            $link = OrderFeedbackLink::query()
                ->where('token_hash', $tokenHash)
                ->lockForUpdate()
                ->first();

            if (!$link) {
                return response()->json(['message' => 'Feedback link not found.'], 404);
            }

            $isExpired = $link->expires_at && $link->expires_at->isPast();
            if ($isExpired || $link->used_at) {
                return response()->json(['message' => 'Feedback link is no longer available.'], 410);
            }

            $existing = OrderFeedback::query()->where('order_id', $link->order_id)->first();
            if ($existing) {
                return response()->json(['message' => 'Feedback was already submitted for this order.'], 409);
            }

            $feedback = OrderFeedback::query()->create([
                'order_id' => $link->order_id,
                'email' => $payload['email'] ?? $link->email,
                'full_name' => trim((string) $payload['full_name']),
                'rating' => (int) $payload['rating'],
                'message' => trim((string) $payload['message']),
            ]);

            $link->used_at = now();
            $link->save();

            return response()->json([
                'message' => 'Feedback submitted successfully.',
                'feedback' => [
                    'order_id' => $feedback->order_id,
                    'rating' => (int) $feedback->rating,
                    'created_at' => optional($feedback->created_at)->toISOString(),
                ],
            ], 201);
        });
    }
}
