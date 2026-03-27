<?php

namespace App\Http\Controllers;

use App\Models\StoreInquiry;
use Illuminate\Http\Request;

class MerchantInquiryController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'status' => 'nullable|string|in:open,resolved',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:50',
        ]);

        $storeId = (int) $request->user()->store_id;
        $status = trim((string) ($validated['status'] ?? ''));
        $perPage = (int) ($validated['per_page'] ?? 20);

        $inquiries = StoreInquiry::query()
            ->where('store_id', $storeId)
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'inquiries' => $inquiries->getCollection()->map(
                fn (StoreInquiry $inquiry) => $this->formatInquiry($inquiry)
            )->values(),
            'meta' => [
                'current_page' => $inquiries->currentPage(),
                'last_page' => $inquiries->lastPage(),
                'per_page' => $inquiries->perPage(),
                'total' => $inquiries->total(),
                'has_more_pages' => $inquiries->hasMorePages(),
            ],
        ]);
    }

    public function updateStatus(Request $request, int $id)
    {
        $payload = $request->validate([
            'status' => 'required|string|in:open,resolved',
        ]);

        $storeId = (int) $request->user()->store_id;
        $inquiry = StoreInquiry::query()
            ->where('store_id', $storeId)
            ->findOrFail($id);

        $nextStatus = $payload['status'];
        $inquiry->status = $nextStatus;

        if ($nextStatus === StoreInquiry::STATUS_RESOLVED) {
            $inquiry->resolved_at = now();
            $inquiry->resolved_by_user_id = $request->user()->id;
        } else {
            $inquiry->resolved_at = null;
            $inquiry->resolved_by_user_id = null;
        }

        $inquiry->save();

        return response()->json([
            'message' => 'Inquiry status updated.',
            'inquiry' => $this->formatInquiry($inquiry->fresh()),
        ]);
    }

    protected function formatInquiry(StoreInquiry $inquiry): array
    {
        return [
            'id' => $inquiry->id,
            'store_id' => $inquiry->store_id,
            'user_id' => $inquiry->user_id,
            'name' => $inquiry->name,
            'email' => $inquiry->email,
            'phone' => $inquiry->phone,
            'message' => $inquiry->message,
            'status' => $inquiry->status,
            'resolved_at' => optional($inquiry->resolved_at)->toISOString(),
            'resolved_by_user_id' => $inquiry->resolved_by_user_id,
            'created_at' => optional($inquiry->created_at)->toISOString(),
            'updated_at' => optional($inquiry->updated_at)->toISOString(),
        ];
    }
}
