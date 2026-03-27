<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StoreInquiry extends Model
{
    use HasFactory;

    public const STATUS_OPEN = 'open';
    public const STATUS_RESOLVED = 'resolved';

    protected $fillable = [
        'store_id',
        'user_id',
        'name',
        'email',
        'phone',
        'message',
        'status',
        'resolved_at',
        'resolved_by_user_id',
        'source_ip',
    ];

    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
        ];
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function resolvedByUser()
    {
        return $this->belongsTo(User::class, 'resolved_by_user_id');
    }
}
