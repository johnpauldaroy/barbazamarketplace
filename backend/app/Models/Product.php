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
        'base_unit_id',
        'has_variants',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        // Stock counts base units, which may be fractional for weight/volume.
        'stock' => 'decimal:3',
        'low_stock_threshold' => 'integer',
        'has_variants' => 'boolean',
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

    public function variants()
    {
        return $this->hasMany(ProductVariant::class)->orderBy('sort_order')->orderBy('id');
    }

    public function activeVariants()
    {
        return $this->variants()->where('is_active', true);
    }

    public function baseUnit()
    {
        return $this->belongsTo(Unit::class, 'base_unit_id');
    }

    /**
     * The variant pre-selected on the product page. Falls back to the first
     * active variant so a product whose default was deactivated still sells.
     */
    public function defaultVariant(): ?ProductVariant
    {
        $variants = $this->relationLoaded('variants')
            ? $this->variants
            : $this->variants()->get();

        return $variants->firstWhere('is_default', true)
            ?? $variants->firstWhere('is_active', true)
            ?? $variants->first();
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
