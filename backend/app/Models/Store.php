<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class Store extends Model
{
    use HasFactory;

    public const PLATFORM_STORE_SLUG = 'platform-store';

    protected $fillable = [
        'name',
        'slug',
        'status',
        'description',
        'contact_email',
        'contact_phone',
        'address_line_1',
        'address_line_2',
        'city',
        'province',
        'postal_code',
        'country',
        'logo_image',
        'cover_image',
        'facebook_url',
    ];

    protected static function booted(): void
    {
        static::created(function (Store $store) {
            if (! Schema::hasTable('store_payment_methods')) {
                return;
            }

            $store->paymentMethods()->firstOrCreate(
                ['type' => 'cod', 'label' => 'Cash on Delivery'],
                [
                    'instructions' => 'Pay in cash when your order is delivered.',
                    'is_enabled' => true,
                    'requires_reference' => false,
                    'requires_proof' => false,
                ]
            );
        });
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function categories()
    {
        return $this->hasMany(Category::class);
    }

    public function inquiries()
    {
        return $this->hasMany(StoreInquiry::class);
    }

    public function paymentMethods()
    {
        return $this->hasMany(StorePaymentMethod::class)->orderBy('sort_order')->orderBy('id');
    }

    public function isActive(): bool
    {
        return ($this->status ?? 'active') === 'active';
    }

    public static function ensurePlatformStore(): self
    {
        $store = self::query()->where('slug', self::PLATFORM_STORE_SLUG)->first();
        if ($store) {
            return $store;
        }

        return self::create([
            'name' => 'Platform Store',
            'slug' => self::PLATFORM_STORE_SLUG,
            'status' => 'active',
            'description' => 'Default store for platform-managed catalog items.',
        ]);
    }

    public static function resolveUniqueSlug(string $name, ?int $ignoreStoreId = null): string
    {
        $base = Str::slug($name);
        if ($base === '') {
            $base = 'store';
        }

        $slug = $base;
        $attempt = 2;

        while (
            self::query()
                ->when($ignoreStoreId, fn ($query) => $query->where('id', '!=', $ignoreStoreId))
                ->where('slug', $slug)
                ->exists()
        ) {
            $slug = "{$base}-{$attempt}";
            $attempt++;
        }

        return $slug;
    }
}
