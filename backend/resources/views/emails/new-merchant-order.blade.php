<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>New merchant order</title></head>
<body style="margin:0;background:#f4f7fb;color:#1e293b;font-family:Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f4f7fb;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;overflow:hidden;border:1px solid #dfe7f4;border-radius:16px;background:#ffffff;">
      <tr><td style="padding:28px 32px;background:#2954c8;color:#ffffff;">
        <div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.8;">{{ $order->store?->name }}</div>
        <h1 style="margin:8px 0 0;font-size:26px;line-height:1.25;">New order #{{ $order->id }}</h1>
      </td></tr>
      <tr><td style="padding:30px 32px;">
        <p style="margin:0 0 20px;font-size:16px;line-height:1.6;">A new order from <strong>{{ $order->customer_name ?: 'a customer' }}</strong> is ready for review.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:22px;border-collapse:collapse;">
          @foreach ($order->items as $item)
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #eef2f7;font-size:14px;">{{ $item->product?->title ?: 'Product' }}@if($item->variant_name) ({{ $item->variant_name }})@endif × {{ $item->quantity }}</td>
              <td align="right" style="padding:10px 0;border-bottom:1px solid #eef2f7;font-size:14px;font-weight:700;">₱{{ number_format((float) $item->price * $item->quantity, 2) }}</td>
            </tr>
          @endforeach
          <tr>
            <td style="padding-top:16px;font-size:16px;font-weight:700;">Order total</td>
            <td align="right" style="padding-top:16px;font-size:18px;font-weight:800;color:#2954c8;">₱{{ number_format((float) $order->total_amount, 2) }}</td>
          </tr>
        </table>
        <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#64748b;">Delivery to: {{ $order->shipping_address }}@if($order->shipping_city), {{ $order->shipping_city }}@endif</p>
        <a href="{{ $ordersUrl }}" style="display:inline-block;padding:13px 20px;border-radius:10px;background:#2954c8;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Review order</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
