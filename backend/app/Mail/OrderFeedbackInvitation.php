<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderFeedbackInvitation extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Order $order,
        public string $feedbackUrl,
        public ?string $expiresAtIso = null
    ) {
    }

    public function build()
    {
        return $this
            ->subject('Share your experience with e-KoopMart')
            ->view('emails.order-feedback-invitation');
    }
}

