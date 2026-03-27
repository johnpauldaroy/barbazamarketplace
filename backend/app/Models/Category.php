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
}
