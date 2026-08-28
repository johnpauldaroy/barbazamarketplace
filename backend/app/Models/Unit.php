<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Unit extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'label',
        'is_fractional',
        'dimension',
        'conversion_factor',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_fractional' => 'boolean',
        'conversion_factor' => 'decimal:6',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public const DEFAULT_CODE = 'pc';

    public static function defaultUnit(): ?self
    {
        return static::query()->where('code', self::DEFAULT_CODE)->first();
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'base_unit_id');
    }
}
