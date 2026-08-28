<?php

namespace App\Http\Controllers;

use App\Models\StorePaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MerchantPaymentMethodController extends Controller
{
    private const TYPES = ['cod', 'qrph', 'gcash', 'maya', 'bank_transfer', 'cash_pickup'];

    public function index(Request $request)
    {
        return response()->json([
            'payment_methods' => $request->user()->store->paymentMethods()->get()->map(
                fn (StorePaymentMethod $method) => $this->formatMethod($method)
            )->values(),
        ]);
    }

    public function store(Request $request)
    {
        $store = $request->user()->store;
        $payload = $this->validatedPayload($request);
        $payload['store_id'] = $store->id;
        $payload['sort_order'] = $payload['sort_order'] ?? ((int) $store->paymentMethods()->max('sort_order') + 1);

        if ($request->hasFile('qr_image')) {
            $payload['qr_image_path'] = $request->file('qr_image')->store('payment-methods/qr', 'public');
        }

        if (($payload['type'] ?? null) === 'qrph' && empty($payload['qr_image_path'])) {
            throw ValidationException::withMessages(['qr_image' => ['Upload the official QR Ph merchant image.']]);
        }

        $method = StorePaymentMethod::create($payload);

        return response()->json([
            'message' => 'Payment method created successfully.',
            'payment_method' => $this->formatMethod($method),
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $method = $this->ownedMethod($request, $id);
        $payload = $this->validatedPayload($request, $method);

        if ($request->hasFile('qr_image')) {
            if ($method->qr_image_path) {
                Storage::disk('public')->delete($method->qr_image_path);
            }
            $payload['qr_image_path'] = $request->file('qr_image')->store('payment-methods/qr', 'public');
        }

        $nextType = $payload['type'] ?? $method->type;
        $nextQrPath = $payload['qr_image_path'] ?? $method->qr_image_path;
        if ($nextType === 'qrph' && ! $nextQrPath) {
            throw ValidationException::withMessages(['qr_image' => ['Upload the official QR Ph merchant image.']]);
        }

        $nextEnabled = array_key_exists('is_enabled', $payload) ? (bool) $payload['is_enabled'] : $method->is_enabled;
        if (! $nextEnabled && $method->is_enabled && $this->enabledCount($request) <= 1) {
            throw ValidationException::withMessages(['is_enabled' => ['Keep at least one payment method enabled.']]);
        }

        $method->update($payload);

        return response()->json([
            'message' => 'Payment method updated successfully.',
            'payment_method' => $this->formatMethod($method->fresh()),
        ]);
    }

    public function destroy(Request $request, int $id)
    {
        $method = $this->ownedMethod($request, $id);
        if ($method->is_enabled && $this->enabledCount($request) <= 1) {
            throw ValidationException::withMessages(['payment_method' => ['Keep at least one payment method enabled.']]);
        }

        if ($method->qr_image_path) {
            Storage::disk('public')->delete($method->qr_image_path);
        }
        $method->delete();

        return response()->json(['message' => 'Payment method removed successfully.']);
    }

    private function validatedPayload(Request $request, ?StorePaymentMethod $method = null): array
    {
        $rules = [
            'type' => [$method ? 'sometimes' : 'required', 'string', Rule::in(self::TYPES)],
            'provider' => 'nullable|string|max:80',
            'label' => [$method ? 'sometimes' : 'required', 'string', 'max:120'],
            'account_name' => 'nullable|string|max:255',
            'account_identifier' => 'nullable|string|max:255',
            'instructions' => 'nullable|string|max:2000',
            'is_enabled' => 'sometimes|boolean',
            'requires_reference' => 'sometimes|boolean',
            'requires_proof' => 'sometimes|boolean',
            'sort_order' => 'nullable|integer|min:0|max:1000',
            'qr_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ];

        $payload = $request->validate($rules);
        unset($payload['qr_image']);

        foreach (['provider', 'account_name', 'account_identifier', 'instructions'] as $field) {
            if (array_key_exists($field, $payload)) {
                $value = trim((string) ($payload[$field] ?? ''));
                $payload[$field] = $value === '' ? null : $value;
            }
        }
        if (array_key_exists('label', $payload)) {
            $payload['label'] = trim($payload['label']);
        }

        return $payload;
    }

    private function ownedMethod(Request $request, int $id): StorePaymentMethod
    {
        return StorePaymentMethod::query()
            ->where('store_id', $request->user()->store_id)
            ->findOrFail($id);
    }

    private function enabledCount(Request $request): int
    {
        return StorePaymentMethod::query()
            ->where('store_id', $request->user()->store_id)
            ->where('is_enabled', true)
            ->count();
    }

    private function formatMethod(StorePaymentMethod $method): array
    {
        return [
            'id' => $method->id,
            'type' => $method->type,
            'provider' => $method->provider,
            'label' => $method->label,
            'account_name' => $method->account_name,
            'account_identifier' => $method->account_identifier,
            'qr_image_url' => $method->qr_image_path ? '/storage/'.$method->qr_image_path : null,
            'instructions' => $method->instructions,
            'is_enabled' => (bool) $method->is_enabled,
            'requires_reference' => (bool) $method->requires_reference,
            'requires_proof' => (bool) $method->requires_proof,
            'sort_order' => (int) $method->sort_order,
        ];
    }
}
