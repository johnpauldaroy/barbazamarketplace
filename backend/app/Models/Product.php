<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'title',
        'description',
        'price',
        'category',
        'image',
        'stock',
    ];

    protected $casts = [
        'price' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::creating(function (Product $product) {
            if ($product->store_id) {
                return;
            }

            $product->store_id = Store::ensurePlatformStore()->id;
        });
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function reviews()
    {
        return $this->hasMany(ProductReview::class);
    }

    public function getImageUrlAttribute()
    {
        if ($this->image) {
            return '/storage/' . $this->image;
        }
        return null;
    }
}
