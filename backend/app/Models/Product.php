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
        'low_stock_threshold',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'stock' => 'integer',
        'low_stock_threshold' => 'integer',
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

    /**
     * A product is low on stock when it still has units left but has fallen to
     * or below its own threshold. Out-of-stock (0) is a separate state and is
     * deliberately excluded here so the two dashboard counts do not overlap.
     */
    public function isLowStock(): bool
    {
        return $this->stock > 0 && $this->stock <= $this->low_stock_threshold;
    }

    public function scopeLowStock($query)
    {
        return $query->where('stock', '>', 0)
            ->whereColumn('stock', '<=', 'low_stock_threshold');
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
