@php
  $customerName = trim((string) ($order->customer_name ?: optional($order->user)->name));
@endphp

<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #0b1739;">
  <h2 style="margin: 0 0 12px;">Share Your Experience</h2>
  <p style="margin: 0 0 12px;">
    @if($customerName !== '')
      Hi {{ $customerName }},
    @else
      Hi,
    @endif
  </p>
  <p style="margin: 0 0 16px;">
    Thank you for your order (Order #{{ $order->id }}). We genuinely value your feedback.
  </p>
  <p style="margin: 0 0 18px;">
    <a
      href="{{ $feedbackUrl }}"
      style="display: inline-block; padding: 10px 16px; background: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700;"
    >
      Leave Feedback
    </a>
  </p>
  @if(!empty($expiresAtIso))
    <p style="margin: 0; color: #64748b; font-size: 12px;">
      This link may expire on {{ $expiresAtIso }}.
    </p>
  @endif
  <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">
    If you did not place this order, you can ignore this email.
  </p>
</div>

