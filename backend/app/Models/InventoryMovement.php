<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id', 'unit_id', 'actor_id', 'order_id', 'type',
        'quantity_delta', 'balance_after', 'reason', 'metadata',
    ];

    protected $casts = [
        'quantity_delta' => 'decimal:3',
        'balance_after' => 'decimal:3',
        'metadata' => 'array',
    ];

    public function product() { return $this->belongsTo(Product::class); }
    public function unit() { return $this->belongsTo(Unit::class); }
    public function actor() { return $this->belongsTo(User::class, 'actor_id'); }
    public function order() { return $this->belongsTo(Order::class); }
}
