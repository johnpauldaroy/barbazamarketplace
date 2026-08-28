<?php

use App\Http\Controllers\AdminReviewController;
use App\Http\Controllers\AdminStoreController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MerchantInquiryController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\MerchantProductController;
use App\Http\Controllers\MerchantPaymentMethodController;
use App\Http\Controllers\MerchantStoreController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\OrderFeedbackController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductVariantController;
use App\Http\Controllers\ProductReviewController;
use App\Http\Controllers\PaymentSubmissionController;
use App\Http\Controllers\PublicStoreController;
use App\Http\Controllers\StoreInquiryController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// CORS preflight (OPTIONS) handler
Route::options('/{any}', function () {
    return response('', 204)
        ->header('Access-Control-Allow-Origin', '*')
        ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
})->where('any', '.*');

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->whereNumber('id')
    ->name('verification.verify');
Route::post('/email/verification-notification', [AuthController::class, 'resendVerification']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::get('/products/{id}/reviews', [ProductReviewController::class, 'index']);
Route::get('/categories', [ProductController::class, 'categories']);
Route::get('/units', [ProductVariantController::class, 'units']);
Route::get('/stores', [PublicStoreController::class, 'index']);
Route::get('/stores/{slug}', [PublicStoreController::class, 'show']);
Route::post('/stores/{slug}/inquiries', [StoreInquiryController::class, 'store'])->middleware('throttle:8,1');
Route::get('/feedback-links/{token}', [OrderFeedbackController::class, 'show'])->middleware('throttle:30,1');
Route::post('/feedback-links/{token}/submit', [OrderFeedbackController::class, 'submit'])->middleware('throttle:10,1');

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::middleware('verified')->group(function () {
        Route::patch('/user/password', [AuthController::class, 'changePassword']);
        Route::get('/user', [AuthController::class, 'me']);

        Route::post('/orders', [OrderController::class, 'store']);
        Route::post('/checkout/quote', [OrderController::class, 'quote']);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::post('/orders/{id}/payment-proof', [PaymentSubmissionController::class, 'store']);
        Route::get('/orders/{orderId}/payment-proofs/{submissionId}', [PaymentSubmissionController::class, 'proof']);
        Route::patch('/orders/{id}/status', [OrderController::class, 'updateStatus']);
        Route::get('/products/{id}/reviews/me', [ProductReviewController::class, 'me']);
        Route::post('/products/{id}/reviews', [ProductReviewController::class, 'upsert']);
        Route::delete('/products/{id}/reviews/me', [ProductReviewController::class, 'destroyMine']);
        Route::post('/reviews/{reviewId}/report', [ProductReviewController::class, 'report']);

        // Admin product management routes
        Route::middleware('admin')->group(function () {
            Route::get('/admin/dashboard', [OrderController::class, 'adminSummary']);
            Route::get('/admin/reports', [OrderController::class, 'adminReports']);
            Route::get('/admin/users', [AdminUserController::class, 'index']);
            Route::post('/admin/users', [AdminUserController::class, 'store']);
            Route::put('/admin/users/{id}', [AdminUserController::class, 'update']);
            Route::delete('/admin/users/{id}', [AdminUserController::class, 'destroy']);
            Route::get('/admin/stores', [AdminStoreController::class, 'index']);
            Route::post('/admin/stores', [AdminStoreController::class, 'store']);
            Route::put('/admin/stores/{storeId}', [AdminStoreController::class, 'update']);
            Route::delete('/admin/stores/{storeId}', [AdminStoreController::class, 'destroy']);
            Route::post('/admin/stores/{storeId}/merchants', [AdminStoreController::class, 'storeMerchant']);
            Route::put('/admin/merchants/{userId}', [AdminStoreController::class, 'updateMerchant']);
            Route::post('/categories', [ProductController::class, 'storeCategory']);
            Route::put('/categories/{name}', [ProductController::class, 'updateCategory']);
            Route::delete('/categories/{name}', [ProductController::class, 'destroyCategory']);
            Route::post('/products', [ProductController::class, 'store']);
            Route::post('/products/bulk-import', [ProductController::class, 'bulkImport']);
            Route::put('/products/{id}', [ProductController::class, 'update']);
            Route::delete('/products/{id}', [ProductController::class, 'destroy']);
            Route::get('/products/{product}/inventory-movements', [InventoryController::class, 'movements']);
            Route::post('/products/{product}/inventory-adjustments', [InventoryController::class, 'adjust']);
            Route::post('/products/{product}/unit-conversion/preview', [InventoryController::class, 'previewConversion']);
            Route::post('/products/{product}/unit-conversion', [InventoryController::class, 'convert']);
            Route::get('/admin/reviews', [AdminReviewController::class, 'index']);
            Route::patch('/admin/reviews/{id}/visibility', [AdminReviewController::class, 'updateVisibility']);
            Route::patch('/admin/review-reports/{id}', [AdminReviewController::class, 'updateReport']);
        });

        // Merchants may read their own options; only admins may change them.
        Route::get('/products/{productId}/variants', [ProductVariantController::class, 'index']);
        Route::post('/products/{productId}/variants', [ProductVariantController::class, 'store'])->middleware('admin');
        Route::put('/products/{productId}/variants/{variantId}', [ProductVariantController::class, 'update'])->middleware('admin');
        Route::delete('/products/{productId}/variants/{variantId}', [ProductVariantController::class, 'destroy'])->middleware('admin');

        Route::middleware('merchant')->group(function () {
            Route::get('/merchant/store', [MerchantStoreController::class, 'show']);
            Route::put('/merchant/store', [MerchantStoreController::class, 'update']);
            Route::get('/merchant/payment-methods', [MerchantPaymentMethodController::class, 'index']);
            Route::post('/merchant/payment-methods', [MerchantPaymentMethodController::class, 'store']);
            Route::put('/merchant/payment-methods/{id}', [MerchantPaymentMethodController::class, 'update']);
            Route::delete('/merchant/payment-methods/{id}', [MerchantPaymentMethodController::class, 'destroy']);
            Route::get('/merchant/orders', [OrderController::class, 'merchantIndex']);
            Route::patch('/merchant/orders/{id}/status', [OrderController::class, 'merchantUpdateStatus']);
            Route::patch('/merchant/orders/{id}/payment', [PaymentSubmissionController::class, 'review']);
            Route::get('/merchant/products', [MerchantProductController::class, 'index']);
            Route::post('/merchant/products', [MerchantProductController::class, 'store']);
            Route::put('/merchant/products/{id}', [MerchantProductController::class, 'update']);
            Route::delete('/merchant/products/{id}', [MerchantProductController::class, 'destroy']);
            Route::get('/merchant/categories', [MerchantProductController::class, 'categories']);
            Route::post('/merchant/categories', [MerchantProductController::class, 'storeCategory']);
            Route::get('/merchant/inquiries', [MerchantInquiryController::class, 'index']);
            Route::patch('/merchant/inquiries/{id}/status', [MerchantInquiryController::class, 'updateStatus']);
        });
    });
});
