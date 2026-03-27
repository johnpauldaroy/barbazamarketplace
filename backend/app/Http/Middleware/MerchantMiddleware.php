<?php

namespace App\Http\Middleware;

use App\Models\Store;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class MerchantMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !$user->is_merchant || !$user->store_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $store = Store::query()->find($user->store_id);
        if (!$store || !$store->isActive()) {
            return response()->json(['message' => 'Merchant store is inactive'], 403);
        }

        return $next($request);
    }
}

