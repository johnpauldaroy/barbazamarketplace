<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StorePaymentMethod extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'type',
        'provider',
        'label',
        'account_name',
        'account_identifier',
        'qr_image_path',
        'instructions',
        'is_enabled',
        'requires_reference',
        'requires_proof',
        'sort_order',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'requires_reference' => 'boolean',
        'requires_proof' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
