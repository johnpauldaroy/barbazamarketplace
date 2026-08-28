<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'order_group_id',
        'store_id',
        'subtotal_amount',
        'shipping_fee',
        'total_amount',
        'status',
        'shipping_address',
        'shipping_city',
        'customer_name',
        'customer_email',
        'customer_phone',
        'payment_method',
        'store_payment_method_id',
        'payment_method_label',
        'payment_details',
        'payment_reference',
        'payment_status',
        'payment_due_at',
        'paid_at',
    ];

    protected $casts = [
        'subtotal_amount' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'payment_details' => 'array',
        'payment_due_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function group()
    {
        return $this->belongsTo(OrderGroup::class, 'order_group_id');
    }

    public function paymentMethod()
    {
        return $this->belongsTo(StorePaymentMethod::class, 'store_payment_method_id');
    }

    public function paymentSubmissions()
    {
        return $this->hasMany(PaymentSubmission::class)->latest('submitted_at');
    }
}
