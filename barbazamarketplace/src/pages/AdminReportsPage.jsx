import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  AlertTriangle, CalendarDays, Download, Package,
  ShoppingCart, TrendingUp, Users, Store,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { fetchAdminReports } from '../api/EcommerceApi';
import { formatPeso } from '../lib/marketplace';

const PIE_COLORS = ['#2954C8', '#2EA7FF', '#12B981', '#F6C343', '#FF5A75', '#94A3B8', '#A78BFA'];

const DATE_RANGES = [
  { value: 'today',      label: 'Today' },
  { value: 'this_week',  label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_year',  label: 'This Year' },
  { value: 'custom',     label: 'Custom' },
];

const fmt = (d) => d.toISOString().slice(0, 10);

const getDateParams = (dateRange, customFrom, customTo) => {
  const today = new Date();
  const shiftBack = (from, to) => {
    const f = new Date(from), t = new Date(to);
    const diffMs = t - f + 86400000;
    const pTo = new Date(f - 86400000);
    const pFrom = new Date(pTo - diffMs + 86400000);
    return { from: fmt(pFrom), to: fmt(pTo) };
  };
  if (dateRange === 'today')      return { from: fmt(today), to: fmt(today) };
  if (dateRange === 'this_week') {
    const day = today.getDay();
    const mon = new Date(today); mon.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    return { from: fmt(mon), to: fmt(today) };
  }
  if (dateRange === 'this_month') return { from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), to: fmt(today) };
  if (dateRange === 'this_year')  return { from: `${today.getFullYear()}-01-01`, to: fmt(today) };
  if (dateRange === 'custom' && customFrom && customTo) return { from: customFrom, to: customTo };
  return {};
};

const KpiTile = ({ title, value, sub, icon: Icon, iconBg, iconColor, trend }) => {
  const positive = trend >= 0;
  return (
    <Card className="border-none bg-white/70 shadow-lg backdrop-blur-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          {trend !== undefined && (
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {positive ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
        <p className="mt-3 text-[9px] font-bold uppercase tracking-wider text-[#7488A3]">{title}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>}
      </CardContent>
    </Card>
  );
};

const SectionCard = ({ title, sub, children }) => (
  <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
    <CardHeader className="pb-2">
      <CardTitle className="text-base font-bold text-slate-800">{title}</CardTitle>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const exportCsv = (rows, filename) => {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const AdminReportsPage = () => {
  const [dateRange, setDateRange]   = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [storeId, setStoreId]       = useState('');
  const [status, setStatus]         = useState('all');
  const [category, setCategory]     = useState('');
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const params = useMemo(() => ({
    ...getDateParams(dateRange, customFrom, customTo),
    ...(storeId   ? { store_id: storeId }   : {}),
    ...(status && status !== 'all' ? { status } : {}),
    ...(category  ? { category }             : {}),
  }), [dateRange, customFrom, customTo, storeId, status, category]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetchAdminReports(params);
      setData(res);
    } catch (e) {
      setError(e?.message || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const summary          = data?.summary          || {};
  const salesTrend       = (data?.sales_trend      || []).map(m => ({ name: m.label, revenue: m.revenue, orders: m.orders }));
  const revenueByStore   = data?.revenue_by_store   || [];
  const topProducts      = data?.top_products       || [];
  const categoryPerf     = data?.category_performance || [];
  const statusBreakdown  = data?.status_breakdown   || [];
  const newCustomers     = (data?.new_customers     || []).map(c => ({ name: c.date, count: c.count }));
  const lowStock         = data?.low_stock          || [];
  const filterOpts       = data?.filter_options     || {};

  const handleExport = () => {
    const rows = [
      { section: 'Summary', key: 'Total Revenue',    value: summary.total_revenue },
      { section: 'Summary', key: 'Total Orders',     value: summary.total_orders },
      { section: 'Summary', key: 'Avg Order Value',  value: summary.avg_order_value },
      { section: 'Summary', key: 'Unique Customers', value: summary.unique_customers },
      ...topProducts.map(p => ({ section: 'Top Products', key: p.title, value: p.revenue, units: p.units_sold })),
      ...revenueByStore.map(s => ({ section: 'Revenue by Store', key: s.store, value: s.revenue, orders: s.orders })),
    ];
    exportCsv(rows, `ekoopmart-report-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Analytics & Reports</h2>
          <p className="text-sm text-slate-500">Comprehensive view of your marketplace performance</p>
        </div>
        <Button className="gap-2 rounded-xl bg-[#2954C8] text-xs font-bold" onClick={handleExport} disabled={loading || !data}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date range */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <CalendarDays className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
          {DATE_RANGES.map(opt => (
            <button key={opt.value} type="button" onClick={() => setDateRange(opt.value)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${dateRange === opt.value ? 'bg-[#2954C8] text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Custom dates */}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-1.5">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2954C8]/30" />
            <span className="text-xs text-slate-400">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2954C8]/30" />
          </div>
        )}

        {/* Store filter */}
        <select value={storeId} onChange={e => setStoreId(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2954C8]/30">
          <option value="">All Stores</option>
          {(filterOpts.stores || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {/* Status filter */}
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2954C8]/30">
          <option value="all">All Statuses</option>
          {(filterOpts.statuses || []).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>

        {/* Category filter */}
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2954C8]/30">
          <option value="">All Categories</option>
          {(filterOpts.categories || []).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* KPI Tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile title="Total Revenue"    value={formatPeso(summary.total_revenue)}    icon={TrendingUp}    iconBg="bg-blue-50"    iconColor="text-blue-600" />
        <KpiTile title="Total Orders"     value={summary.total_orders ?? 0}            icon={ShoppingCart}  iconBg="bg-amber-50"   iconColor="text-amber-600" />
        <KpiTile title="Avg. Order Value" value={formatPeso(summary.avg_order_value)}  icon={Package}       iconBg="bg-violet-50"  iconColor="text-violet-600" />
        <KpiTile title="Unique Customers" value={summary.unique_customers ?? 0}        icon={Users}         iconBg="bg-emerald-50" iconColor="text-emerald-600" />
      </div>

      {/* Sales Trend + Order Status */}
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <SectionCard title="Sales Trend" sub="Revenue over selected period">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2954C8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2954C8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                  formatter={v => [formatPeso(v), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#2954C8" strokeWidth={2.5} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Order Status" sub="Breakdown by status">
          {statusBreakdown.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No data</p>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="count" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={3}>
                    {statusBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Revenue by Store + Category Performance */}
      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Revenue by Store" sub="Merchant performance comparison">
          {revenueByStore.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No data</p>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByStore} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="store" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} width={120} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                    formatter={v => [formatPeso(v), 'Revenue']} />
                  <Bar dataKey="revenue" fill="#2954C8" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Category Performance" sub="Revenue share per category">
          {categoryPerf.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No data</p>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryPerf.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                    formatter={v => [formatPeso(v), 'Revenue']} />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {categoryPerf.slice(0, 6).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Customer Growth */}
      <SectionCard title="Customer Growth" sub="New customer registrations over selected period">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={newCustomers}>
              <defs>
                <linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#12B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#12B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                formatter={v => [v, 'New Customers']} />
              <Area type="monotone" dataKey="count" stroke="#12B981" strokeWidth={2.5} fill="url(#custGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Top Products + Low Stock */}
      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Top Products" sub="Best sellers by units sold">
          {topProducts.filter(p => p.units_sold > 0).length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No sales data</p>
          ) : (
            <div className="space-y-2">
              {topProducts.filter(p => p.units_sold > 0).slice(0, 8).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white/50 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] text-[10px] font-bold text-[#2954C8]">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{p.title}</p>
                    <p className="text-[10px] text-slate-400">{p.store} · {p.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-800">{formatPeso(p.revenue)}</p>
                    <p className="text-[10px] text-slate-400">{p.units_sold} units</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Low Stock Alerts" sub="Products with 10 or fewer units remaining">
          {lowStock.length === 0 ? (
            <div className="py-10 text-center text-sm text-emerald-600">
              ✓ All products are well-stocked
            </div>
          ) : (
            <div className="space-y-2">
              {lowStock.map(p => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{p.title}</p>
                    <p className="text-[10px] text-slate-400">{p.store} · {p.category}</p>
                  </div>
                  <Badge className={`shrink-0 text-[10px] font-bold ${p.stock === 0 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>
                    {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-xl">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2954C8] border-t-transparent" />
            <span className="text-sm font-semibold text-slate-700">Loading report…</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReportsPage;
