<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
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
        'payment_reference',
    ];

    protected $casts = [
        'subtotal_amount' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
}
