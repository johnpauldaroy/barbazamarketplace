<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderFeedback extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'email',
        'full_name',
        'rating',
        'message',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}

