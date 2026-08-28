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
        'sort_order',
    ];

    protected $casts = [
        'is_fractional' => 'boolean',
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
