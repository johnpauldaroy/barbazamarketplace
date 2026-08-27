<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderFeedbackLink;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Mail\OrderFeedbackInvitation;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    protected const STATUS_FLOW = [
        'pending',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded',
    ];

    public function index()
    {
        $user = Auth::user();
        if ($user && $user->is_admin) {
            $orders = Order::with(['items.product.store', 'user'])->latest()->get();
        } else {
            $orders = Order::where('user_id', Auth::id())
                ->with(['items.product.store', 'user'])
                ->latest()
                ->get();
        }

        return response()->json([
            'orders' => $orders->map(fn (Order $order) => $this->formatOrderResponse($order))->values(),
        ]);
    }

    public function adminSummary(Request $request)
    {
        $from = $request->query('from');
        $to   = $request->query('to');

        $orderQuery = Order::with(['items.product.store', 'user'])->latest();
        if ($from) {
            $orderQuery->whereDate('created_at', '>=', $from);
        }
        if ($to) {
            $orderQuery->whereDate('created_at', '<=', $to);
        }
        $orders = $orderQuery->get();

        $products = Product::query()->orderBy('title')->get();

        $productSalesQuery = OrderItem::query()
            ->select('product_id', DB::raw('SUM(quantity) as units_sold'), DB::raw('SUM(quantity * price) as revenue'))
            ->groupBy('product_id');
        if ($from || $to) {
            $productSalesQuery->whereHas('order', function (Builder $q) use ($from, $to) {
                if ($from) $q->whereDate('created_at', '>=', $from);
                if ($to)   $q->whereDate('created_at', '<=', $to);
            });
        }
        $productSales = $productSalesQuery->get()->keyBy('product_id');

        $revenueOrders = $orders->filter(fn (Order $order) => !$this->isInventoryRestored($order->status));
        $totalRevenue = $revenueOrders->sum(fn (Order $order) => (float) $order->total_amount);
        $uniqueCustomers = $orders
            ->map(fn (Order $order) => strtolower((string) ($order->customer_email ?: optional($order->user)->email ?: "guest-{$order->id}")))
            ->filter()
            ->unique()
            ->count();

        // Build sales trend: 6 intervals based on range granularity
        $monthlySales = $this->buildSalesTrend($revenueOrders, $from, $to);

        $statusBreakdown = collect(self::STATUS_FLOW)
            ->map(function (string $status) use ($orders) {
                return [
                    'name' => ucfirst($status),
                    'status' => $status,
                    'count' => $orders->where('status', $status)->count(),
                ];
            })
            ->filter(fn (array $item) => $item['count'] > 0)
            ->values();

        $topProducts = $products
            ->map(function (Product $product) use ($productSales) {
                $sales = $productSales->get($product->id);
                return [
                    'id' => $product->id,
                    'title' => $product->title,
                    'category' => $product->category,
                    'image' => $product->image,
                    'image_url' => $product->image_url,
                    'stock' => (int) $product->stock,
                    'units_sold' => (int) ($sales->units_sold ?? 0),
                    'revenue' => round((float) ($sales->revenue ?? 0), 2),
                ];
            })
            ->sort(function (array $left, array $right) {
                if ($left['units_sold'] === $right['units_sold']) {
                    return $right['revenue'] <=> $left['revenue'];
                }
                return $right['units_sold'] <=> $left['units_sold'];
            })
            ->take(5)
            ->values();

        $lowStockProducts = $products
            ->filter(fn (Product $product) => $product->isLowStock())
            ->sortBy('stock')
            ->take(6)
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'title' => $product->title,
                'category' => $product->category,
                'stock' => (int) $product->stock,
                'image' => $product->image,
                'image_url' => $product->image_url,
            ])
            ->values();

        // Category breakdown for pie chart (filtered)
        $categoryBreakdown = $orders
            ->flatMap(fn (Order $order) => $order->items)
            ->groupBy(fn ($item) => optional($item->product)->category ?: 'Uncategorized')
            ->map(fn ($items, $category) => [
                'name' => $category,
                'count' => $items->count(),
            ])
            ->values();

        return response()->json([
            'summary' => [
                'total_revenue' => round($totalRevenue, 2),
                'total_orders' => $orders->count(),
                'pending_orders' => $orders->where('status', 'pending')->count(),
                'processing_orders' => $orders->where('status', 'processing')->count(),
                'shipped_orders' => $orders->where('status', 'shipped')->count(),
                'delivered_orders' => $orders->where('status', 'delivered')->count(),
                'cancelled_orders' => $orders->where('status', 'cancelled')->count(),
                'refunded_orders' => $orders->where('status', 'refunded')->count(),
                'average_order_value' => $revenueOrders->count() > 0 ? round($totalRevenue / $revenueOrders->count(), 2) : 0,
                'unique_customers' => $uniqueCustomers,
                'total_products' => $products->count(),
                'active_categories' => $products->pluck('category')->filter()->unique()->count(),
                'low_stock_products' => $products->filter(fn (Product $product) => $product->isLowStock())->count(),
                'out_of_stock_products' => $products->filter(fn (Product $product) => (int) $product->stock <= 0)->count(),
            ],
            'monthly_sales' => $monthlySales,
            'status_breakdown' => $statusBreakdown,
            'top_products' => $topProducts,
            'low_stock_products' => $lowStockProducts,
            'category_breakdown' => $categoryBreakdown,
            'recent_orders' => $orders
                ->take(8)
                ->map(fn (Order $order) => $this->formatOrderResponse($order))
                ->values(),
        ]);
    }

    private function buildSalesTrend($revenueOrders, ?string $from, ?string $to)
    {
        $start = $from ? Carbon::parse($from) : now()->subMonths(5)->startOfMonth();
        $end   = $to   ? Carbon::parse($to)   : now();
        $diffDays = $start->diffInDays($end);

        if ($diffDays <= 1) {
            // Hourly for today
            return collect(range(0, 23))->map(function (int $hour) use ($revenueOrders, $start) {
                $hourOrders = $revenueOrders->filter(
                    fn (Order $o) => optional($o->created_at)->format('Y-m-d H') === $start->format('Y-m-d') . ' ' . str_pad($hour, 2, '0', STR_PAD_LEFT)
                );
                return [
                    'month' => $start->format('Y-m-d') . " {$hour}:00",
                    'label' => $hour . ':00',
                    'orders' => $hourOrders->count(),
                    'revenue' => round($hourOrders->sum(fn (Order $o) => (float) $o->total_amount), 2),
                ];
            })->values();
        }

        if ($diffDays <= 31) {
            // Daily
            $days = (int) $diffDays + 1;
            return collect(range(0, $days - 1))->map(function (int $i) use ($revenueOrders, $start) {
                $date = $start->copy()->addDays($i);
                $dayOrders = $revenueOrders->filter(
                    fn (Order $o) => optional($o->created_at)->format('Y-m-d') === $date->format('Y-m-d')
                );
                return [
                    'month' => $date->format('Y-m-d'),
                    'label' => $date->format('M j'),
                    'orders' => $dayOrders->count(),
                    'revenue' => round($dayOrders->sum(fn (Order $o) => (float) $o->total_amount), 2),
                ];
            })->values();
        }

        if ($diffDays <= 90) {
            // Weekly
            $weeks = (int) ceil($diffDays / 7);
            return collect(range(0, $weeks - 1))->map(function (int $i) use ($revenueOrders, $start) {
                $weekStart = $start->copy()->addWeeks($i);
                $weekEnd   = $weekStart->copy()->addDays(6);
                $weekOrders = $revenueOrders->filter(function (Order $o) use ($weekStart, $weekEnd) {
                    $d = optional($o->created_at);
                    return $d && $d->gte($weekStart) && $d->lte($weekEnd);
                });
                return [
                    'month' => $weekStart->format('Y-m-d'),
                    'label' => 'W' . $weekStart->weekOfYear,
                    'orders' => $weekOrders->count(),
                    'revenue' => round($weekOrders->sum(fn (Order $o) => (float) $o->total_amount), 2),
                ];
            })->values();
        }

        // Monthly (default — up to 12 months)
        $months = min((int) ceil($diffDays / 30), 12);
        return collect(range(0, $months - 1))->map(function (int $i) use ($revenueOrders, $start) {
            $date = $start->copy()->startOfMonth()->addMonths($i);
            $monthOrders = $revenueOrders->filter(
                fn (Order $o) => optional($o->created_at)->format('Y-m') === $date->format('Y-m')
            );
            return [
                'month' => $date->format('Y-m'),
                'label' => $date->format('M'),
                'orders' => $monthOrders->count(),
                'revenue' => round($monthOrders->sum(fn (Order $o) => (float) $o->total_amount), 2),
            ];
        })->values();
    }

    public function adminReports(Request $request)
    {
        $from     = $request->query('from');
        $to       = $request->query('to');
        $storeId  = $request->query('store_id');
        $status   = $request->query('status');
        $category = $request->query('category');

        // Base order query
        $orderQuery = Order::with(['items.product.store', 'user'])->latest();
        if ($from)    $orderQuery->whereDate('created_at', '>=', $from);
        if ($to)      $orderQuery->whereDate('created_at', '<=', $to);
        if ($status && $status !== 'all') $orderQuery->where('status', $status);
        if ($storeId) {
            $orderQuery->whereHas('items.product', fn (Builder $q) => $q->where('store_id', $storeId));
        }
        $orders = $orderQuery->get();

        $revenueOrders = $orders->filter(fn (Order $o) => !$this->isInventoryRestored($o->status));
        $totalRevenue  = $revenueOrders->sum(fn (Order $o) => (float) $o->total_amount);
        $totalOrders   = $orders->count();
        $avgOrderValue = $revenueOrders->count() > 0 ? round($totalRevenue / $revenueOrders->count(), 2) : 0;

        // Unique customers
        $uniqueCustomers = $orders
            ->map(fn (Order $o) => strtolower($o->customer_email ?: optional($o->user)->email ?: "guest-{$o->id}"))
            ->filter()->unique()->count();

        // Sales trend (auto-granularity)
        $salesTrend = $this->buildSalesTrend($revenueOrders, $from, $to);

        // Revenue by store
        $revenueByStore = $revenueOrders
            ->flatMap(fn (Order $o) => $o->items)
            ->filter(fn ($item) => $item->product && $item->product->store)
            ->when($storeId, fn ($c) => $c->filter(fn ($i) => (string)$i->product->store_id === (string)$storeId))
            ->groupBy(fn ($item) => $item->product->store->name ?? 'Unknown')
            ->map(fn ($items, $name) => [
                'store'   => $name,
                'revenue' => round($items->sum(fn ($i) => (float)$i->price * $i->quantity), 2),
                'orders'  => $items->pluck('order_id')->unique()->count(),
                'units'   => $items->sum('quantity'),
            ])
            ->sortByDesc('revenue')
            ->values();

        // Top products
        $productSalesQuery = OrderItem::query()
            ->select('product_id',
                DB::raw('SUM(quantity) as units_sold'),
                DB::raw('SUM(quantity * price) as revenue'))
            ->groupBy('product_id');
        if ($from || $to || $storeId || ($status && $status !== 'all')) {
            $productSalesQuery->whereHas('order', function (Builder $q) use ($from, $to, $status) {
                if ($from)   $q->whereDate('created_at', '>=', $from);
                if ($to)     $q->whereDate('created_at', '<=', $to);
                if ($status && $status !== 'all') $q->where('status', $status);
            });
        }
        if ($storeId) {
            $productSalesQuery->whereHas('product', fn (Builder $q) => $q->where('store_id', $storeId));
        }
        if ($category) {
            $productSalesQuery->whereHas('product', fn (Builder $q) => $q->where('category', $category));
        }
        $productSales = $productSalesQuery->get()->keyBy('product_id');

        $productQuery = Product::query()->with('store');
        if ($storeId)  $productQuery->where('store_id', $storeId);
        if ($category) $productQuery->where('category', $category);
        $products = $productQuery->get();

        $topProducts = $products->map(fn (Product $p) => [
            'id'         => $p->id,
            'title'      => $p->title,
            'category'   => $p->category,
            'store'      => optional($p->store)->name ?? 'N/A',
            'stock'      => (int) $p->stock,
            'units_sold' => (int) ($productSales->get($p->id)?->units_sold ?? 0),
            'revenue'    => round((float) ($productSales->get($p->id)?->revenue ?? 0), 2),
            'image_url'  => $p->image_url,
        ])->sortByDesc('units_sold')->take(10)->values();

        // Category performance
        $categoryPerformance = $productSales->map(function ($sale) use ($products) {
            $product = $products->firstWhere('id', $sale->product_id);
            return [
                'category' => $product?->category ?? 'Unknown',
                'units'    => (int) $sale->units_sold,
                'revenue'  => round((float) $sale->revenue, 2),
            ];
        })->groupBy('category')->map(fn ($rows, $cat) => [
            'category' => $cat,
            'units'    => $rows->sum('units'),
            'revenue'  => round($rows->sum('revenue'), 2),
        ])->sortByDesc('revenue')->values();

        // Order status breakdown
        $statusBreakdown = collect(self::STATUS_FLOW)->map(fn ($s) => [
            'status' => $s,
            'name'   => ucfirst($s),
            'count'  => $orders->where('status', $s)->count(),
        ])->filter(fn ($i) => $i['count'] > 0)->values();

        // New customers over time (by registration date)
        $customerQuery = User::query()->where('is_admin', false)->where('is_merchant', false);
        if ($from) $customerQuery->whereDate('created_at', '>=', $from);
        if ($to)   $customerQuery->whereDate('created_at', '<=', $to);
        $newCustomers = $customerQuery->get()
            ->groupBy(fn (User $u) => optional($u->created_at)->format('Y-m-d') ?? 'N/A')
            ->map(fn ($g, $date) => ['date' => $date, 'count' => $g->count()])
            ->sortBy('date')->values();

        // Low stock products
        $lowStock = $products->filter(fn (Product $p) => $p->isLowStock())
            ->sortBy('stock')->take(10)
            ->map(fn (Product $p) => [
                'id'       => $p->id,
                'title'    => $p->title,
                'category' => $p->category,
                'store'    => optional($p->store)->name ?? 'N/A',
                'stock'    => (int) $p->stock,
            ])->values();

        // Available filter options
        $stores     = Store::query()->orderBy('name')->get(['id', 'name']);
        $categories = Product::query()->select('category')->distinct()->orderBy('category')->pluck('category');

        return response()->json([
            'summary' => [
                'total_revenue'    => round($totalRevenue, 2),
                'total_orders'     => $totalOrders,
                'avg_order_value'  => $avgOrderValue,
                'unique_customers' => $uniqueCustomers,
            ],
            'sales_trend'          => $salesTrend,
            'revenue_by_store'     => $revenueByStore,
            'top_products'         => $topProducts,
            'category_performance' => $categoryPerformance,
            'status_breakdown'     => $statusBreakdown,
            'new_customers'        => $newCustomers,
            'low_stock'            => $lowStock,
            'filter_options'       => [
                'stores'     => $stores,
                'categories' => $categories,
                'statuses'   => self::STATUS_FLOW,
            ],
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$user->is_admin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'status' => ['required', 'string', Rule::in(self::STATUS_FLOW)],
        ]);

        $order = Order::with(['items.product.store', 'user'])->findOrFail($id);
        $nextStatus = strtolower((string) $request->status);
        $previousStatus = strtolower((string) $order->status);

        DB::transaction(function () use ($order, $previousStatus, $nextStatus) {
            if (!$this->isInventoryRestored($previousStatus) && $this->isInventoryRestored($nextStatus)) {
                $this->restoreInventoryForOrder($order);
            }

            if ($this->isInventoryRestored($previousStatus) && !$this->isInventoryRestored($nextStatus)) {
                $this->reserveInventoryForOrder($order);
            }

            $order->status = $nextStatus;
            $order->save();
        });

        $order->refresh()->load(['items.product.store', 'user']);

        return response()->json([
            'message' => 'Order status updated',
            'order' => $this->formatOrderResponse($order)
        ]);
    }

    public function merchantIndex(Request $request)
    {
        $storeId = (int) $request->user()->store_id;
        $validated = $request->validate([
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
            'search' => 'nullable|string|max:255',
            'status' => ['nullable', 'string', Rule::in(array_merge(['all'], self::STATUS_FLOW))],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $status = strtolower((string) ($validated['status'] ?? 'all'));
        $perPage = (int) ($validated['per_page'] ?? 15);

        $orders = Order::query()
            ->with(['items.product.store', 'user'])
            ->whereHas('items.product', fn (Builder $query) => $query->where('store_id', $storeId))
            ->when($status !== 'all', fn (Builder $query) => $query->where('status', $status))
            ->when($search !== '', function (Builder $query) use ($search) {
                $query->where(function (Builder $nestedQuery) use ($search) {
                    if (is_numeric($search)) {
                        $nestedQuery->where('id', (int) $search);
                    }

                    $nestedQuery
                        ->orWhere('customer_name', 'like', "%{$search}%")
                        ->orWhere('customer_email', 'like', "%{$search}%")
                        ->orWhere('customer_phone', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%")
                        ->orWhereHas('user', function (Builder $userQuery) use ($search) {
                            $userQuery
                                ->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                });
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'orders' => $orders->getCollection()
                ->map(fn (Order $order) => $this->formatMerchantOrderResponse($order, $storeId))
                ->values(),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
                'has_more_pages' => $orders->hasMorePages(),
            ],
        ]);
    }

    public function merchantUpdateStatus(Request $request, int $id)
    {
        $storeId = (int) $request->user()->store_id;

        $request->validate([
            'status' => ['required', 'string', Rule::in(self::STATUS_FLOW)],
        ]);

        $order = Order::query()
            ->with(['items.product.store', 'user'])
            ->whereHas('items.product', fn (Builder $query) => $query->where('store_id', $storeId))
            ->findOrFail($id);

        $merchantOrderView = $this->buildMerchantOrderView($order, $storeId);
        if ($merchantOrderView['has_other_store_items']) {
            return response()->json([
                'message' => 'Status updates for mixed-store orders are only available to admins.',
            ], 409);
        }

        $nextStatus = strtolower((string) $request->status);
        $previousStatus = strtolower((string) $order->status);

        DB::transaction(function () use ($order, $previousStatus, $nextStatus) {
            if (!$this->isInventoryRestored($previousStatus) && $this->isInventoryRestored($nextStatus)) {
                $this->restoreInventoryForOrder($order);
            }

            if ($this->isInventoryRestored($previousStatus) && !$this->isInventoryRestored($nextStatus)) {
                $this->reserveInventoryForOrder($order);
            }

            $order->status = $nextStatus;
            $order->save();
        });

        $order->refresh()->load(['items.product.store', 'user']);

        return response()->json([
            'message' => 'Order status updated',
            'order' => $this->formatMerchantOrderResponse($order, $storeId),
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'items' => 'required|array',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'nullable|numeric',
            'subtotal_amount' => 'nullable|numeric|min:0',
            'shipping_fee' => 'nullable|numeric|min:0',
            'total_amount' => 'nullable|numeric|min:0',
            'shipping_address' => 'required|string',
            'shipping_city' => 'nullable|string',
            'customer_name' => 'nullable|string',
            'customer_email' => 'nullable|email',
            'customer_phone' => 'nullable|string',
            'payment_method' => 'nullable|string',
            'payment_reference' => 'nullable|string',
            'customer' => 'nullable|array',
            'customer.fullName' => 'nullable|string',
            'customer.name' => 'nullable|string',
            'customer.email' => 'nullable|email',
            'customer.phone' => 'nullable|string',
            'customer.paymentMethod' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();
            $customer = $request->input('customer', []);
            $shippingFee = round((float) $request->input('shipping_fee', 0), 2);
            $customerName = $request->input('customer_name')
                ?? $customer['fullName']
                ?? $customer['name']
                ?? null;
            $customerEmail = $request->input('customer_email')
                ?? $customer['email']
                ?? null;
            $customerPhone = $request->input('customer_phone')
                ?? $customer['phone']
                ?? null;
            $paymentMethod = $request->input('payment_method')
                ?? $customer['paymentMethod']
                ?? null;
            $paymentReference = $request->input('payment_reference');
            $itemsPayload = collect($request->items);
            $products = Product::lockForUpdate()
                ->whereIn('id', $itemsPayload->pluck('product_id')->all())
                ->get()
                ->keyBy('id');
            $subtotalAmount = 0.0;

            $order = Order::create([
                'user_id' => $user->id,
                'subtotal_amount' => 0,
                'shipping_fee' => $shippingFee,
                'total_amount' => 0,
                'shipping_address' => $request->shipping_address,
                'shipping_city' => $request->shipping_city,
                'customer_name' => $customerName,
                'customer_email' => $customerEmail,
                'customer_phone' => $customerPhone,
                'payment_method' => $paymentMethod,
                'payment_reference' => $paymentReference,
                'status' => 'pending'
            ]);

            foreach ($itemsPayload as $item) {
                $product = $products->get($item['product_id']);
                if (!$product) {
                    throw ValidationException::withMessages([
                        'items' => ["Product {$item['product_id']} could not be found."],
                    ]);
                }

                $requestedQty = (int) $item['quantity'];
                if ($product->stock < $requestedQty) {
                    throw ValidationException::withMessages([
                        'items' => ["Insufficient stock for {$product->title}."],
                    ]);
                }

                $product->stock = $product->stock - $requestedQty;
                $product->save();

                $unitPrice = round((float) $product->price, 2);
                $subtotalAmount += $unitPrice * $requestedQty;

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $requestedQty,
                    'price' => $unitPrice,
                ]);
            }

            $order->subtotal_amount = round($subtotalAmount, 2);
            $order->total_amount = round($subtotalAmount + $shippingFee, 2);
            $order->save();

            DB::commit();

            $order->load(['items.product.store', 'user']);

            $customerEmailNormalized = strtolower(trim((string) ($customerEmail ?: '')));
            if ($customerEmailNormalized !== '') {
                $token = Str::random(64);
                $expiresAt = now()->addDays(30);

                OrderFeedbackLink::query()->create([
                    'order_id' => $order->id,
                    'email' => $customerEmailNormalized,
                    'token_hash' => hash('sha256', $token),
                    'expires_at' => $expiresAt,
                ]);

                $frontend = rtrim((string) config('app.frontend_url'), '/');
                $feedbackUrl = "{$frontend}/feedback/{$token}";

                try {
                    Mail::to($customerEmailNormalized)->send(
                        new OrderFeedbackInvitation($order, $feedbackUrl, $expiresAt->toISOString())
                    );
                } catch (\Throwable $mailError) {
                    Log::warning('Order feedback invitation email failed', [
                        'order_id' => $order->id,
                        'email' => $customerEmailNormalized,
                        'error' => $mailError->getMessage(),
                    ]);
                }
            }

            return response()->json([
                'message' => 'Order placed successfully',
                'order' => $this->formatOrderResponse($order)
            ], 201);

        } catch (ValidationException $e) {
            DB::rollBack();
            throw $e;
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Order failed', 'error' => $e->getMessage()], 500);
        }
    }

    protected function formatOrderResponse(Order $order): array
    {
        $customerName = $order->customer_name ?: ($order->user ? $order->user->name : null);
        $customerEmail = $order->customer_email ?: ($order->user ? $order->user->email : null);
        $customerPhone = $order->customer_phone;
        $paymentMethod = $order->payment_method;
        $normalizedStatus = strtolower((string) $order->status);

        $items = $order->items->map(fn (OrderItem $item) => $this->formatOrderItem($item));

        return [
            'id' => $order->id,
            'status' => $normalizedStatus,
            'subtotal_amount' => (float) ($order->subtotal_amount ?? $order->total_amount),
            'shipping_fee' => (float) ($order->shipping_fee ?? 0),
            'total' => (float) $order->total_amount,
            'total_amount' => (float) $order->total_amount,
            'shipping_address' => $order->shipping_address,
            'shipping_city' => $order->shipping_city,
            'payment_method' => $paymentMethod,
            'payment_reference' => $order->payment_reference,
            'created_at' => optional($order->created_at)->toISOString(),
            'updated_at' => optional($order->updated_at)->toISOString(),
            'customer' => [
                'fullName' => $customerName,
                'name' => $customerName,
                'email' => $customerEmail,
                'phone' => $customerPhone,
                'paymentMethod' => $paymentMethod,
                'address' => $order->shipping_address,
                'city' => $order->shipping_city,
            ],
            'items' => $items,
            'order_items' => $items,
            'item_count' => $items->sum('quantity'),
        ];
    }

    protected function formatMerchantOrderResponse(Order $order, int $storeId): array
    {
        $orderView = $this->buildMerchantOrderView($order, $storeId);

        return array_merge($this->formatOrderResponse($order), [
            'store_items' => $orderView['store_items'],
            'store_subtotal_amount' => $orderView['store_subtotal_amount'],
            'store_item_count' => $orderView['store_item_count'],
            'has_other_store_items' => $orderView['has_other_store_items'],
            'merchant_can_update_status' => !$orderView['has_other_store_items'],
        ]);
    }

    protected function buildMerchantOrderView(Order $order, int $storeId): array
    {
        $storeItems = $order->items
            ->filter(fn (OrderItem $item) => (int) optional($item->product)->store_id === $storeId)
            ->values()
            ->map(fn (OrderItem $item) => $this->formatOrderItem($item))
            ->values();

        $hasOtherStoreItems = $order->items->contains(
            fn (OrderItem $item) => (int) optional($item->product)->store_id !== $storeId
        );

        return [
            'store_items' => $storeItems,
            'store_subtotal_amount' => round((float) $storeItems->sum('total_price'), 2),
            'store_item_count' => (int) $storeItems->sum('quantity'),
            'has_other_store_items' => $hasOtherStoreItems,
        ];
    }

    protected function formatOrderItem(OrderItem $item): array
    {
        $product = $item->product;
        $store = $product ? $product->store : null;
        $lineTotal = round((float) $item->price * (int) $item->quantity, 2);

        return [
            'id' => $item->id,
            'product_id' => $item->product_id,
            'store_id' => (int) ($product->store_id ?? 0),
            'store_name' => $store ? $store->name : null,
            'store_slug' => $store ? $store->slug : null,
            'quantity' => (int) $item->quantity,
            'price' => (float) $item->price,
            'name' => $product ? ($product->title ?? $product->name) : 'Item',
            'image' => $product ? $product->image : null,
            'image_url' => $product ? $product->image_url : null,
            'total_price' => $lineTotal,
        ];
    }

    protected function isInventoryRestored(?string $status): bool
    {
        return in_array(strtolower((string) $status), ['cancelled', 'refunded'], true);
    }

    protected function restoreInventoryForOrder(Order $order): void
    {
        $order->loadMissing('items.product.store');

        foreach ($order->items as $item) {
            if ($item->product) {
                $item->product->increment('stock', $item->quantity);
            }
        }
    }

    protected function reserveInventoryForOrder(Order $order): void
    {
        $order->loadMissing('items.product.store');

        foreach ($order->items as $item) {
            $product = $item->product;

            if (!$product) {
                continue;
            }

            if ($product->stock < $item->quantity) {
                throw ValidationException::withMessages([
                    'status' => ["Unable to move order #{$order->id} back to an active state because {$product->title} does not have enough stock."],
                ]);
            }

            $product->decrement('stock', $item->quantity);
        }
    }
}
