<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'name',
    ];

    protected static function booted(): void
    {
        static::creating(function (Category $category) {
            if ($category->store_id) {
                return;
            }

            $category->store_id = Store::ensurePlatformStore()->id;
        });
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Categories owned by the platform store are global: admins define them once
     * and every store inherits them, on top of its own private categories.
     */
    public function scopeVisibleToStore($query, ?int $storeId)
    {
        $platformStoreId = Store::ensurePlatformStore()->id;

        if (!$storeId || $storeId === $platformStoreId) {
            return $query->where('store_id', $platformStoreId);
        }

        return $query->whereIn('store_id', [$platformStoreId, $storeId]);
    }

    public function scopeGlobal($query)
    {
        return $query->where('store_id', Store::ensurePlatformStore()->id);
    }
}
