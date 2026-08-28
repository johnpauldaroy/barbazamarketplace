<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\PaymentSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PaymentSubmissionController extends Controller
{
    public function store(Request $request, int $orderId)
    {
        $order = Order::query()->with('paymentMethod')->findOrFail($orderId);
        if ((int) $order->user_id !== (int) $request->user()->id) {
            abort(403, 'You cannot submit payment for this order.');
        }
        if (in_array($order->payment_status, ['paid', 'refunded'], true)) {
            throw ValidationException::withMessages(['payment' => ['This payment can no longer be changed.']]);
        }
        if (in_array($order->payment_method, ['cod', 'cash_pickup'], true)) {
            throw ValidationException::withMessages(['payment' => ['This payment method does not require an online payment proof.']]);
        }

        $payload = $request->validate([
            'reference_number' => 'required|string|max:160',
            'proof' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $file = $request->file('proof');
        $submission = PaymentSubmission::create([
            'order_id' => $order->id,
            'reference_number' => trim($payload['reference_number']),
            'proof_path' => $file->store('payment-proofs'),
            'original_filename' => $file->getClientOriginalName(),
            'status' => 'under_review',
            'submitted_at' => now(),
        ]);

        $order->update([
            'payment_reference' => $submission->reference_number,
            'payment_status' => 'under_review',
        ]);

        return response()->json([
            'message' => 'Payment proof submitted for merchant review.',
            'payment_submission' => $this->formatSubmission($submission),
        ], 201);
    }

    public function review(Request $request, int $orderId)
    {
        $payload = $request->validate([
            'action' => ['required', 'string', Rule::in(['approve', 'reject'])],
            'rejection_reason' => 'nullable|required_if:action,reject|string|max:1000',
        ]);

        $order = Order::query()
            ->with('paymentSubmissions')
            ->where('store_id', $request->user()->store_id)
            ->findOrFail($orderId);

        $submission = $order->paymentSubmissions->first();
        if (! $submission && ! in_array($order->payment_method, ['cod', 'cash_pickup'], true)) {
            throw ValidationException::withMessages(['payment' => ['No payment proof has been submitted.']]);
        }

        $approved = $payload['action'] === 'approve';
        if ($submission) {
            $submission->update([
                'status' => $approved ? 'approved' : 'rejected',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'rejection_reason' => $approved ? null : trim($payload['rejection_reason']),
            ]);
        }

        $order->update([
            'payment_status' => $approved ? 'paid' : 'rejected',
            'paid_at' => $approved ? now() : null,
        ]);

        return response()->json([
            'message' => $approved ? 'Payment approved.' : 'Payment rejected.',
            'order_id' => $order->id,
            'payment_status' => $order->payment_status,
            'payment_submission' => $submission ? $this->formatSubmission($submission->fresh()) : null,
        ]);
    }

    public function proof(Request $request, int $orderId, int $submissionId)
    {
        $order = Order::query()->findOrFail($orderId);
        $user = $request->user();
        $authorized = $user->is_admin
            || (int) $order->user_id === (int) $user->id
            || ($user->is_merchant && (int) $order->store_id === (int) $user->store_id);

        if (! $authorized) {
            abort(403, 'You cannot view this payment proof.');
        }

        $submission = PaymentSubmission::query()
            ->where('order_id', $order->id)
            ->findOrFail($submissionId);

        abort_unless(Storage::exists($submission->proof_path), 404);

        return Storage::response($submission->proof_path, $submission->original_filename);
    }

    private function formatSubmission(PaymentSubmission $submission): array
    {
        return [
            'id' => $submission->id,
            'reference_number' => $submission->reference_number,
            'status' => $submission->status,
            'submitted_at' => optional($submission->submitted_at)->toISOString(),
            'reviewed_at' => optional($submission->reviewed_at)->toISOString(),
            'rejection_reason' => $submission->rejection_reason,
            'proof_available' => (bool) $submission->proof_path,
        ];
    }
}
