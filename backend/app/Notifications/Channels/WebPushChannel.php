<?php

namespace App\Notifications\Channels;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class WebPushChannel
{
    public function send(object $notifiable, Notification $notification): void
    {
        if (! method_exists($notifiable, 'pushSubscriptions') || ! method_exists($notification, 'toWebPush')) {
            return;
        }

        $subscriptions = $notifiable->pushSubscriptions()->get();
        if ($subscriptions->isEmpty()) {
            return;
        }

        $webPush = new WebPush([
            'VAPID' => [
                'subject' => config('services.webpush.subject'),
                'publicKey' => config('services.webpush.public_key'),
                'privateKey' => config('services.webpush.private_key'),
            ],
        ]);
        $payload = json_encode($notification->toWebPush($notifiable), JSON_THROW_ON_ERROR);

        foreach ($subscriptions as $storedSubscription) {
            $webPush->queueNotification(Subscription::create([
                'endpoint' => $storedSubscription->endpoint,
                'publicKey' => $storedSubscription->public_key,
                'authToken' => $storedSubscription->auth_token,
                'contentEncoding' => $storedSubscription->content_encoding,
            ]), $payload, ['TTL' => 3600, 'urgency' => 'high']);
        }

        foreach ($webPush->flush() as $report) {
            if ($report->isSubscriptionExpired()) {
                $notifiable->pushSubscriptions()
                    ->where('endpoint_hash', hash('sha256', $report->getEndpoint()))
                    ->delete();
            } elseif (! $report->isSuccess()) {
                Log::warning('Merchant web push delivery failed', [
                    'user_id' => $notifiable->id ?? null,
                    'reason' => $report->getReason(),
                ]);
            }
        }
    }
}
