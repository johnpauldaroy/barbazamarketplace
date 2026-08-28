import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, CalendarRange, Download, FileSpreadsheet, FileText, RotateCcw, Search, ShoppingCart, Store, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchMerchantOrders, fetchMerchantProducts, fetchMerchantStore } from '../api/EcommerceApi';
import { useToast } from '../components/ui/use-toast';
import { formatPeso } from '../lib/marketplace';
import { exportMerchantReportCsv, exportMerchantReportExcel, exportMerchantReportPdf } from '../lib/merchantReportExport';

const MERCHANT_OVERVIEW_PAGE_SIZE = 24;
const MERCHANT_ORDERS_PAGE_SIZE = 100;
const ORDER_STATUS_SEQUENCE = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
const STATUS_COLORS = {
  pending: '#F59E0B',
  processing: '#2EA7FF',
  shipped: '#2954C8',
  delivered: '#12B981',
  cancelled: '#EF4444',
  refunded: '#94A3B8',
};
const NON_REVENUE_STATUSES = new Set(['cancelled', 'refunded']);
const PAYMENT_STATUS_SEQUENCE = ['unpaid', 'under_review', 'paid', 'rejected', 'refunded'];

const toDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dateRangeForPreset = (preset) => {
  const now = new Date();
  const end = toDateInput(now);
  const start = new Date(now);

  if (preset === 'all') return { from: '', to: '' };
  if (preset === 'this_year') return { from: `${now.getFullYear()}-01-01`, to: end };
  if (preset === 'last_7_days') start.setDate(now.getDate() - 6);
  else if (preset === 'last_30_days') start.setDate(now.getDate() - 29);
  else if (preset === 'last_90_days') start.setDate(now.getDate() - 89);
  else start.setMonth(now.getMonth() - 5, 1);

  return { from: toDateInput(start), to: end };
};

const defaultFilters = () => ({
  preset: 'last_6_months',
  ...dateRangeForPreset('last_6_months'),
  status: 'all',
  paymentStatus: 'all',
  search: '',
});

const toMonthKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const normalizeOrderStatus = (status) => String(status || 'pending').toLowerCase();
const statusLabel = (status) => normalizeOrderStatus(status).replace(/^\w/, (char) => char.toUpperCase());
const shortLabel = (text, maxLength = 18) => {
  const value = String(text || '').trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
};

const MerchantOverviewPage = () => {
  const { toast } = useToast();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(defaultFilters);
  const [exporting, setExporting] = useState('');

  const loadAllProducts = useCallback(async () => {
    let page = 1;
    let hasMore = true;
    const allProducts = [];

    while (hasMore) {
      const response = await fetchMerchantProducts({
        page,
        per_page: MERCHANT_OVERVIEW_PAGE_SIZE,
        sort: 'name',
      });
      const pageProducts = Array.isArray(response?.products) ? response.products : [];
      allProducts.push(...pageProducts);
      hasMore = Boolean(response?.meta?.has_more_pages);
      page += 1;
    }

    return allProducts;
  }, []);

  const loadAllOrders = useCallback(async () => {
    let page = 1;
    let hasMore = true;
    const allOrders = [];

    while (hasMore) {
      const response = await fetchMerchantOrders({
        page,
        per_page: MERCHANT_ORDERS_PAGE_SIZE,
        status: 'all',
      });
      const pageOrders = Array.isArray(response?.orders) ? response.orders : [];
      allOrders.push(...pageOrders);
      hasMore = Boolean(response?.meta?.has_more_pages);
      page += 1;
    }

    return allOrders;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [storeResponse, allProducts, allOrders] = await Promise.all([
        fetchMerchantStore(),
        loadAllProducts(),
        loadAllOrders(),
      ]);

      setStore(storeResponse?.store || null);
      setProducts(allProducts);
      setOrders(allOrders);
    } catch (error) {
      toast({
        title: 'Unable to load merchant portal',
        description: error?.message || 'Failed to load merchant summary.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [loadAllOrders, loadAllProducts, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const inventoryValue = useMemo(
    () =>
      products.reduce(
        (total, product) => {
          const options = Array.isArray(product?.variants) ? product.variants : [];
          const defaultOption = options.find((option) => option.is_default) || options[0];
          const ratio = Number(defaultOption?.base_unit_quantity || 1);
          const price = Number(defaultOption?.price ?? product?.price ?? 0);
          return total + (ratio > 0 ? Number(product?.stock || 0) / ratio * price : 0);
        },
        0
      ),
    [products]
  );

  const filteredOrders = useMemo(() => {
    const fromDate = filters.from ? new Date(`${filters.from}T00:00:00`) : null;
    const toDate = filters.to ? new Date(`${filters.to}T23:59:59.999`) : null;
    const query = filters.search.trim().toLowerCase();

    return orders.filter((order) => {
      const createdAt = new Date(order?.created_at);
      if (fromDate && (!Number.isNaN(createdAt.getTime()) && createdAt < fromDate)) return false;
      if (toDate && (!Number.isNaN(createdAt.getTime()) && createdAt > toDate)) return false;
      if (filters.status !== 'all' && normalizeOrderStatus(order?.status) !== filters.status) return false;
      if (filters.paymentStatus !== 'all' && String(order?.payment_status || 'unpaid') !== filters.paymentStatus) return false;
      if (!query) return true;

      const items = Array.isArray(order?.store_items) ? order.store_items : [];
      return [
        order?.id,
        order?.customer?.name,
        order?.customer?.email,
        order?.payment_method_label,
        order?.payment_method,
        order?.payment_reference,
        ...items.flatMap((item) => [item?.name, item?.product_id]),
      ].filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }, [filters, orders]);

  const revenueOrders = useMemo(
    () => filteredOrders.filter((order) => !NON_REVENUE_STATUSES.has(normalizeOrderStatus(order?.status))),
    [filteredOrders]
  );

  const grossRevenue = useMemo(
    () => revenueOrders.reduce((total, order) => total + Number(order?.store_subtotal_amount || 0), 0),
    [revenueOrders]
  );

  const averageOrderValue = useMemo(
    () => (revenueOrders.length > 0 ? grossRevenue / revenueOrders.length : 0),
    [grossRevenue, revenueOrders.length]
  );

  const monthlyPerformance = useMemo(() => {
    const now = new Date();
    const frames = [];

    for (let monthOffset = 5; monthOffset >= 0; monthOffset -= 1) {
      const frameDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      frames.push({
        key: toMonthKey(frameDate),
        label: frameDate.toLocaleString('en-US', { month: 'short' }),
        orders: 0,
        revenue: 0,
      });
    }

    const frameByKey = new Map(frames.map((item) => [item.key, item]));

    filteredOrders.forEach((order) => {
      const createdAt = new Date(order?.created_at);
      if (Number.isNaN(createdAt.getTime())) {
        return;
      }

      const key = toMonthKey(createdAt);
      const frame = frameByKey.get(key);
      if (!frame) {
        return;
      }

      frame.orders += 1;
      if (!NON_REVENUE_STATUSES.has(normalizeOrderStatus(order?.status))) {
        frame.revenue += Number(order?.store_subtotal_amount || 0);
      }
    });

    return frames.map((frame) => ({
      ...frame,
      revenue: Math.round(frame.revenue * 100) / 100,
    }));
  }, [filteredOrders]);

  const statusBreakdown = useMemo(() => {
    const counts = ORDER_STATUS_SEQUENCE.reduce(
      (accumulator, status) => ({ ...accumulator, [status]: 0 }),
      {}
    );

    filteredOrders.forEach((order) => {
      const status = normalizeOrderStatus(order?.status);
      if (Object.prototype.hasOwnProperty.call(counts, status)) {
        counts[status] += 1;
      }
    });

    return ORDER_STATUS_SEQUENCE
      .map((status) => ({
        status,
        label: statusLabel(status),
        count: counts[status] || 0,
        color: STATUS_COLORS[status],
      }))
      .filter((item) => item.count > 0);
  }, [filteredOrders]);

  const topProductsByRevenue = useMemo(() => {
    const totalsByProduct = new Map();

    revenueOrders.forEach((order) => {
      const storeItems = Array.isArray(order?.store_items) ? order.store_items : [];
      storeItems.forEach((item) => {
        const key = item?.product_id || item?.name;
        if (!key) return;

        const name = String(item?.name || `Product #${item?.product_id || 'N/A'}`);
        const previous = totalsByProduct.get(key) || { name, revenue: 0, units: 0 };
        const quantity = Number(item?.quantity || 0);
        const revenue = Number(item?.total_price || Number(item?.price || 0) * quantity);

        totalsByProduct.set(key, {
          name,
          revenue: previous.revenue + revenue,
          units: previous.units + quantity,
        });
      });
    });

    return Array.from(totalsByProduct.values())
      .sort((left, right) => right.revenue - left.revenue)
      .slice(0, 6)
      .map((item) => ({
        ...item,
        label: shortLabel(item.name, 20),
        revenue: Math.round(item.revenue * 100) / 100,
      }));
  }, [revenueOrders]);

  const inventoryByCategory = useMemo(() => {
    const buckets = new Map();

    products.forEach((product) => {
      const category = String(product?.category || 'Uncategorized').trim() || 'Uncategorized';
      const quantity = Number(product?.stock || 0);
      const value = Number(product?.price || 0) * quantity;
      const previous = buckets.get(category) || { category, quantity: 0, value: 0 };

      buckets.set(category, {
        category,
        quantity: previous.quantity + quantity,
        value: previous.value + value,
      });
    });

    return Array.from(buckets.values())
      .sort((left, right) => right.value - left.value)
      .slice(0, 6)
      .map((item) => ({
        ...item,
        value: Math.round(item.value * 100) / 100,
      }));
  }, [products]);

  const filterLabel = useMemo(() => {
    const formatDate = (value) => {
      if (!value) return '';
      const date = new Date(`${value}T00:00:00`);
      return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    if (!filters.from && !filters.to) return 'All available dates';
    if (filters.from && filters.to) return `${formatDate(filters.from)} – ${formatDate(filters.to)}`;
    return filters.from ? `From ${formatDate(filters.from)}` : `Through ${formatDate(filters.to)}`;
  }, [filters.from, filters.to]);

  const exportSummary = useMemo(() => ({
    orders: filteredOrders.length,
    grossRevenue,
    averageOrderValue,
    products: products.length,
    inventoryValue,
  }), [averageOrderValue, filteredOrders.length, grossRevenue, inventoryValue, products.length]);

  const updatePreset = (preset) => setFilters((current) => ({
    ...current,
    preset,
    ...(preset === 'custom' ? {} : dateRangeForPreset(preset)),
  }));

  const updateDate = (field, value) => setFilters((current) => ({ ...current, preset: 'custom', [field]: value }));

  const handleExport = async (format) => {
    if (filteredOrders.length === 0) {
      toast({ title: 'Nothing to export', description: 'Adjust the filters to include at least one order.', variant: 'destructive' });
      return;
    }

    setExporting(format);
    try {
      const exportData = {
        orders: filteredOrders,
        products,
        storeName: store?.name || 'Merchant',
        summary: exportSummary,
        filterLabel,
      };
      if (format === 'csv') exportMerchantReportCsv(exportData);
      if (format === 'excel') await exportMerchantReportExcel(exportData);
      if (format === 'pdf') await exportMerchantReportPdf(exportData);
      toast({ title: `${format === 'excel' ? 'Excel' : format.toUpperCase()} report created`, description: `${filteredOrders.length} filtered order${filteredOrders.length === 1 ? '' : 's'} exported.`, variant: 'success' });
    } catch (error) {
      toast({ title: 'Export failed', description: error?.message || 'Unable to create the report file.', variant: 'destructive' });
    } finally {
      setExporting('');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">Merchant Dashboard</h2>
        <p className="text-sm text-slate-500">Revenue, orders, inventory, and product performance in one view.</p>
      </div>

      <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef3fb] text-[#2954C8]">
                <CalendarRange className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Report filters</p>
                <p className="mt-0.5 text-sm text-slate-500">{filterLabel} · {filteredOrders.length} order{filteredOrders.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            <Button type="button" variant="ghost" className="min-h-11 justify-start gap-2 text-slate-600 sm:justify-center" onClick={() => setFilters(defaultFilters())}>
              <RotateCcw className="h-4 w-4" /> Reset filters
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Date range
              <select value={filters.preset} onChange={(event) => updatePreset(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-[#2954C8]">
                <option value="last_7_days">Last 7 days</option>
                <option value="last_30_days">Last 30 days</option>
                <option value="last_90_days">Last 90 days</option>
                <option value="last_6_months">Last 6 months</option>
                <option value="this_year">This year</option>
                <option value="all">All dates</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              From
              <Input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => updateDate('from', event.target.value)} className="mt-1.5 min-h-11 rounded-xl text-base font-normal normal-case tracking-normal" />
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              To
              <Input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => updateDate('to', event.target.value)} className="mt-1.5 min-h-11 rounded-xl text-base font-normal normal-case tracking-normal" />
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Order status
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-[#2954C8]">
                <option value="all">All statuses</option>
                {ORDER_STATUS_SEQUENCE.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Payment status
              <select value={filters.paymentStatus} onChange={(event) => setFilters((current) => ({ ...current, paymentStatus: event.target.value }))} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-[#2954C8]">
                <option value="all">All payments</option>
                {PAYMENT_STATUS_SEQUENCE.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <label className="relative block flex-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              Search report
              <Search className="pointer-events-none absolute bottom-3.5 left-3.5 h-4 w-4 text-slate-400" />
              <Input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Order, customer, reference, or product" className="mt-1.5 min-h-11 rounded-xl pl-10 text-base font-normal normal-case tracking-normal" />
            </label>
            <div className="grid grid-cols-3 gap-2 xl:w-auto">
              <Button type="button" variant="outline" disabled={Boolean(exporting) || filteredOrders.length === 0} onClick={() => handleExport('csv')} className="min-h-11 gap-2 rounded-xl px-3"><FileText className="h-4 w-4" /><span>CSV</span></Button>
              <Button type="button" variant="outline" disabled={Boolean(exporting) || filteredOrders.length === 0} onClick={() => handleExport('excel')} className="min-h-11 gap-2 rounded-xl border-emerald-200 px-3 text-emerald-700 hover:bg-emerald-50"><FileSpreadsheet className="h-4 w-4" /><span>{exporting === 'excel' ? 'Working…' : 'Excel'}</span></Button>
              <Button type="button" disabled={Boolean(exporting) || filteredOrders.length === 0} onClick={() => handleExport('pdf')} className="min-h-11 gap-2 rounded-xl bg-[#2954C8] px-3"><Download className="h-4 w-4" /><span>{exporting === 'pdf' ? 'Working…' : 'PDF'}</span></Button>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">Date and status filters apply to sales metrics and exports. Product count and inventory value always show current stock.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-5">
        <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-500">Store</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-[#2954C8]" />
              <p className="text-lg font-bold text-slate-800">{store?.name || 'Merchant Store'}</p>
            </div>
            <Badge className={`mt-3 ${store?.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-500 text-white'}`}>
              {store?.status || 'active'}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-500">Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-[#2954C8]" />
              <p className="text-2xl font-bold text-slate-800 sm:text-3xl">{loading ? '--' : products.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-500">Estimated Retail Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-800 sm:text-3xl">{loading ? '--' : formatPeso(inventoryValue)}</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-500">Gross Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#2954C8]" />
              <p className="text-2xl font-bold text-slate-800 sm:text-3xl">{loading ? '--' : formatPeso(grossRevenue)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-500">Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-[#2954C8]" />
              <p className="text-2xl font-bold text-slate-800 sm:text-3xl">{loading ? '--' : orders.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Store Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            {store?.description?.trim() || 'No store description yet. Update it from Merchant Settings.'}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">Revenue and Orders (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] w-full sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(value) => `${Math.round(Number(value || 0) / 1000)}k`}
                  />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}
                    formatter={(value, name) => {
                      if (name === 'Revenue') return [formatPeso(value), 'Revenue'];
                      return [Number(value || 0), 'Orders'];
                    }}
                  />
                  <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#BFDBFE" radius={[6, 6, 0, 0]} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#2954C8"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#2954C8' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gross Revenue</p>
                <p className="mt-1 font-semibold text-slate-800">{formatPeso(grossRevenue)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Orders</p>
                <p className="mt-1 font-semibold text-slate-800">{Number(orders.length || 0).toLocaleString('en-US')}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Order Value</p>
                <p className="mt-1 font-semibold text-slate-800">{formatPeso(averageOrderValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {statusBreakdown.length === 0 ? (
              <p className="py-20 text-center text-sm text-slate-500">No orders yet.</p>
            ) : (
              <>
                <div className="h-[220px] w-full sm:h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={64}
                        outerRadius={92}
                        paddingAngle={3}
                      >
                        {statusBreakdown.map((slice) => (
                          <Cell key={`status-${slice.status}`} fill={slice.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value, name) => [Number(value || 0), name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {statusBreakdown.map((slice) => (
                    <div key={`legend-${slice.status}`} className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                        <p className="text-xs font-semibold text-slate-600">{slice.label}</p>
                      </div>
                      <p className="mt-1 text-sm font-bold text-slate-800">{slice.count}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
        <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {topProductsByRevenue.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">No product sales yet.</p>
            ) : (
              <div className="h-[240px] w-full sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsByRevenue} layout="vertical" margin={{ top: 4, right: 14, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      tickFormatter={(value) => `${Math.round(Number(value || 0) / 1000)}k`}
                    />
                    <YAxis type="category" dataKey="label" width={92} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}
                      formatter={(value, name, context) => {
                        if (name === 'Revenue') return [formatPeso(value), 'Revenue'];
                        return [Number(context?.payload?.units || 0), 'Units Sold'];
                      }}
                    />
                    <Bar dataKey="revenue" name="Revenue" fill="#2954C8" radius={[6, 6, 6, 6]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">Inventory Value by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {inventoryByCategory.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">No inventory data available.</p>
            ) : (
              <div className="h-[240px] w-full sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inventoryByCategory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      tickFormatter={(value) => `${Math.round(Number(value || 0) / 1000)}k`}
                    />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}
                      formatter={(value, _name, context) => [
                        formatPeso(value),
                        `${Number(context?.payload?.quantity || 0)} units`,
                      ]}
                    />
                    <Bar dataKey="value" name="Inventory Value" fill="#2EA7FF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MerchantOverviewPage;
