<?php

namespace App\Notifications;

use App\Models\Order;
use App\Notifications\Channels\WebPushChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewMerchantOrder extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Order $order)
    {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        $channels = ['mail'];

        if (method_exists($notifiable, 'pushSubscriptions')
            && filled(config('services.webpush.public_key'))
            && filled(config('services.webpush.private_key'))
            && filled(config('services.webpush.subject'))) {
            $channels[] = WebPushChannel::class;
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->order->loadMissing(['items.product', 'store']);

        return (new MailMessage)
            ->subject("New order #{$this->order->id} for {$this->order->store?->name}")
            ->view('emails.new-merchant-order', [
                'order' => $this->order,
                'ordersUrl' => rtrim((string) config('app.frontend_url'), '/').'/merchant/orders',
            ]);
    }

    public function toWebPush(object $notifiable): array
    {
        $this->order->loadMissing(['items', 'store']);
        $itemCount = (int) $this->order->items->sum('quantity');

        return [
            'title' => "New order #{$this->order->id}",
            'body' => sprintf(
                '%s placed an order for %d item%s worth ₱%s.',
                $this->order->customer_name ?: 'A customer',
                $itemCount,
                $itemCount === 1 ? '' : 's',
                number_format((float) $this->order->total_amount, 2)
            ),
            'icon' => '/logo192.png',
            'badge' => '/favicon-32.png',
            'tag' => "merchant-order-{$this->order->id}",
            'url' => '/merchant/orders',
            'order_id' => $this->order->id,
        ];
    }
}
