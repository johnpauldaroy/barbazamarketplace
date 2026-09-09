<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductGalleryTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->admin = User::factory()->create(['is_admin' => true]);
        $this->store = Store::create(['name' => 'Gallery Store', 'slug' => 'gallery-store', 'status' => 'active']);
        Sanctum::actingAs($this->admin);
    }

    public function test_creating_a_product_with_multiple_images_stores_a_gallery_and_sets_the_primary_image(): void
    {
        $piece = Unit::where('code', 'pc')->firstOrFail();

        $response = $this->postJson('/api/products', [
            'store_id' => $this->store->id,
            'title' => 'Coop Mug',
            'category' => 'Handicrafts',
            'base_unit_id' => $piece->id,
            'stock' => 10,
            'price' => 150,
            'images' => [
                UploadedFile::fake()->image('front.jpg'),
                UploadedFile::fake()->image('back.jpg'),
            ],
        ])->assertCreated();

        $product = Product::with('images')->findOrFail($response->json('product.id'));

        $this->assertCount(2, $product->images);
        $this->assertSame($product->images->first()->path, $product->image);
        Storage::disk('public')->assertExists($product->images[0]->path);
        Storage::disk('public')->assertExists($product->images[1]->path);
        $this->assertCount(2, $response->json('product.images'));
    }

    public function test_updating_a_product_can_add_and_remove_gallery_images(): void
    {
        $product = $this->makeProductWithImages(2);
        $originalImages = $product->images()->orderBy('sort_order')->get();
        $keepImage = $originalImages->last();
        $removedImage = $originalImages->first();

        $response = $this->postJson("/api/products/{$product->id}", [
            '_method' => 'PUT',
            'remove_image_ids' => [$removedImage->id],
            'images' => [UploadedFile::fake()->image('side.jpg')],
        ])->assertOk();

        $product->refresh();
        $this->assertCount(2, $product->images);
        $this->assertFalse($product->images->contains('id', $removedImage->id));
        $this->assertTrue($product->images->contains('id', $keepImage->id));
        Storage::disk('public')->assertMissing($removedImage->path);

        // The removed image was the primary (first) one, so the primary
        // pointer must follow the gallery rather than 404 on a deleted file.
        $this->assertSame($product->images->first()->path, $product->image);
        $this->assertSame($product->image, $response->json('product.image'));
    }

    public function test_removing_every_gallery_image_clears_the_primary_image(): void
    {
        $product = $this->makeProductWithImages(1);
        $onlyImage = $product->images()->firstOrFail();

        $this->postJson("/api/products/{$product->id}", [
            '_method' => 'PUT',
            'remove_image_ids' => [$onlyImage->id],
        ])->assertOk();

        $product->refresh();
        $this->assertCount(0, $product->images);
        $this->assertNull($product->image);
    }

    public function test_deleting_a_product_removes_its_gallery_files(): void
    {
        $product = $this->makeProductWithImages(2);
        $paths = $product->images()->pluck('path');

        $this->deleteJson("/api/products/{$product->id}")->assertOk();

        foreach ($paths as $path) {
            Storage::disk('public')->assertMissing($path);
        }
        $this->assertDatabaseMissing('product_images', ['product_id' => $product->id]);
    }

    private function makeProductWithImages(int $count): Product
    {
        $piece = Unit::where('code', 'pc')->firstOrFail();
        $response = $this->postJson('/api/products', [
            'store_id' => $this->store->id,
            'title' => 'Coop Tote Bag',
            'category' => 'Handicrafts',
            'base_unit_id' => $piece->id,
            'stock' => 10,
            'price' => 150,
            'images' => array_map(fn ($i) => UploadedFile::fake()->image("img{$i}.jpg"), range(1, $count)),
        ])->assertCreated();

        return Product::findOrFail($response->json('product.id'));
    }
}
