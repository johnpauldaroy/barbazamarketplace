<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'name',
        'sku',
        'base_unit_quantity',
        'price',
        'is_default',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'base_unit_quantity' => 'decimal:3',
        'price' => 'decimal:2',
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Base units consumed by selling $quantity of this variant.
     */
    public function baseUnitsFor(int $quantity): float
    {
        return round((float) $this->base_unit_quantity * $quantity, 3);
    }

    /**
     * How many of THIS variant the product's remaining stock can cover.
     * A variant that consumes 25 base units is unsellable once fewer than 25 remain,
     * even though the product still reports stock.
     */
    public function availableQuantity(): int
    {
        $ratio = (float) $this->base_unit_quantity;
        if ($ratio <= 0) {
            return 0;
        }

        $stock = (float) ($this->product?->stock ?? 0);

        return (int) floor($stock / $ratio);
    }

    public function isInStock(): bool
    {
        return $this->availableQuantity() > 0;
    }
}
