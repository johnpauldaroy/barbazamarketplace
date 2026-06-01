import React, { useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, Activity, CalendarDays, Package, ShoppingCart,
  Users, AlertTriangle, ArrowRight, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const DATE_RANGE_OPTIONS = [
  { value: 'today',      label: 'Today' },
  { value: 'this_week',  label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_year',  label: 'This Year' },
  { value: 'custom',     label: 'Custom' },
];

const PIE_COLORS = ['#2954C8', '#F6C343', '#12B981', '#2EA7FF', '#FF5A75', '#94A3B8'];

const STATUS_COLOR = {
  pending:    'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped:    'bg-violet-100 text-violet-700',
  delivered:  'bg-emerald-100 text-emerald-700',
  cancelled:  'bg-rose-100 text-rose-600',
  refunded:   'bg-slate-100 text-slate-600',
};

const yAxisFmt = (val) => {
  if (val >= 1000000) return `₱${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000)    return `₱${(val / 1000).toFixed(0)}k`;
  return `₱${val}`;
};

const AdminOverviewPage = () => {
  const {
    summary, statTiles, salesTrend, recentActivities, formatPeso,
    refreshing, lastSync, onRefresh, dashboard,
    dateRange, setDateRange, customFrom, setCustomFrom, customTo, setCustomTo,
    topProducts, lowStockProducts, statusBreakdown, recentOrders,
  } = useOutletContext();

  const PIE_COLORS_LOCAL = PIE_COLORS;

  const categoryData = useMemo(() => {
    const breakdown = dashboard?.category_breakdown;
    if (Array.isArray(breakdown) && breakdown.length > 0) {
      return breakdown.map((item, i) => ({
        name: item.name || item.category || `Category ${i + 1}`,
        value: Number(item.count || item.value || 0),
        color: PIE_COLORS_LOCAL[i % PIE_COLORS_LOCAL.length],
      }));
    }
    return [];
  }, [dashboard, PIE_COLORS_LOCAL]);

  const pieData = useMemo(() => {
    if (statusBreakdown?.length > 0) {
      return statusBreakdown.map((s, i) => ({
        name: s.name,
        value: s.count,
        color: PIE_COLORS_LOCAL[i % PIE_COLORS_LOCAL.length],
      }));
    }
    return categoryData;
  }, [statusBreakdown, categoryData, PIE_COLORS_LOCAL]);

  const pendingCount  = summary?.pending_orders    || 0;
  const lowStockCount = summary?.low_stock_products || 0;
  const outOfStock    = summary?.out_of_stock_products || 0;

  return (
    <div className="space-y-6">
      {/* Header + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Overview</h1>
          {lastSync && (
            <p className="text-xs text-slate-400">
              Last updated {lastSync.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              {' '}· auto-refreshes every 30s
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <CalendarDays className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" onClick={() => setDateRange(opt.value)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  dateRange === opt.value ? 'bg-[#2954C8] text-white shadow' : 'text-slate-500 hover:bg-slate-100'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2954C8]/30" />
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2954C8]/30" />
            </div>
          )}

          <button type="button" onClick={onRefresh} disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50">
            <TrendingUp className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Alert strip — pending + low stock */}
      {(pendingCount > 0 || lowStockCount > 0 || outOfStock > 0) && (
        <div className="flex flex-wrap gap-2">
          {pendingCount > 0 && (
            <Link to="/admin/orders" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100">
              <Clock className="h-3.5 w-3.5" />
              {pendingCount} pending order{pendingCount !== 1 ? 's' : ''} awaiting action
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
          {outOfStock > 0 && (
            <Link to="/admin/products" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">
              <XCircle className="h-3.5 w-3.5" />
              {outOfStock} out-of-stock product{outOfStock !== 1 ? 's' : ''}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
          {lowStockCount > 0 && (
            <Link to="/admin/products" className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100">
              <AlertTriangle className="h-3.5 w-3.5" />
              {lowStockCount} product{lowStockCount !== 1 ? 's' : ''} low on stock
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}

      {/* KPI tiles */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(statTiles || []).map((item, index) => {
          const Icon = item.icon;
          const hasTrend = item.trend !== null && item.trend !== undefined;
          const isPositive = item.trend >= 0;
          return (
            <motion.div key={item.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}>
              <Card className="min-h-[120px] border-none bg-white/70 shadow-lg backdrop-blur-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.iconBg}`}>
                      {item.pesoIcon
                        ? <span className={`text-base font-extrabold ${item.iconColor}`}>₱</span>
                        : <Icon className={`h-4 w-4 ${item.iconColor}`} />}
                    </div>
                    {hasTrend ? (
                      <div className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {isPositive ? '↑' : '↓'} {Math.abs(item.trend).toFixed(1)}%
                      </div>
                    ) : (
                      <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-400">— vs prev</div>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#7488A3]">{item.title}</p>
                    <p className="mt-0.5 text-lg font-bold text-slate-800">{item.value}</p>
                    {item.meta && <p className="mt-0.5 text-[10px] text-slate-400">{item.meta}</p>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </section>

      {/* Sales Trend + Order Status pie */}
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-800">Sales Trend</CardTitle>
            <p className="text-xs text-slate-500">Revenue growth over selected period</p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2954C8" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#2954C8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={yAxisFmt} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                    formatter={(val) => [formatPeso(val), 'Revenue']} />
                  <Area type="monotone" dataKey="sales" stroke="#2954C8" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-800">Order Status</CardTitle>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distribution</p>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">No orders yet</div>
            ) : (
              <>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} innerRadius={52} outerRadius={72} paddingAngle={4} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-1.5">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-slate-600">{d.name}</span>
                      </div>
                      <span className="font-bold text-slate-800">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products + Low Stock */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Top Products */}
        <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-800">Top Products</CardTitle>
              <p className="text-xs text-slate-500">Best sellers by units sold</p>
            </div>
            <Link to="/admin/products" className="flex items-center gap-1 text-[11px] font-semibold text-[#2954C8] hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {(topProducts || []).filter(p => p.units_sold > 0).length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No sales data for this period</p>
            ) : (
              <div className="space-y-2">
                {(topProducts || []).filter(p => p.units_sold > 0).slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50/80">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] text-[10px] font-bold text-[#2954C8]">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">{p.title}</p>
                      <p className="text-[10px] text-slate-400">{p.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-800">{formatPeso(p.revenue)}</p>
                      <p className="text-[10px] text-slate-400">{p.units_sold} units</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-800">Low Stock Alerts</CardTitle>
              <p className="text-xs text-slate-500">Products needing restocking</p>
            </div>
            <Link to="/admin/products" className="flex items-center gap-1 text-[11px] font-semibold text-[#2954C8] hover:underline">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {(lowStockProducts || []).length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2 text-emerald-600">
                <CheckCircle2 className="h-8 w-8 opacity-60" />
                <p className="text-sm font-medium">All products are well-stocked</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(lowStockProducts || []).slice(0, 6).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-2.5">
                    <AlertTriangle className={`h-4 w-4 shrink-0 ${p.stock === 0 ? 'text-rose-500' : 'text-amber-500'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">{p.title}</p>
                      <p className="text-[10px] text-slate-400">{p.category}</p>
                    </div>
                    <Badge className={`shrink-0 text-[10px] font-bold ${p.stock === 0 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>
                      {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders + Quick Actions */}
      <div className="grid gap-5 xl:grid-cols-[1fr_240px]">
        {/* Recent Orders */}
        <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#2954C8]" />
              <CardTitle className="text-base font-bold text-slate-800">Recent Orders</CardTitle>
            </div>
            <Link to="/admin/orders" className="flex items-center gap-1 text-[11px] font-semibold text-[#2954C8] hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {(recentOrders || []).length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {(recentOrders || []).slice(0, 6).map((order) => (
                  <div key={order.id} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50/80">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] text-xs font-bold text-[#2954C8]">
                      #{order.id}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {order.customer?.name || order.customer_name || 'Guest'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {order.customer?.email || order.customer_email || ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <p className="text-xs font-bold text-slate-800">{formatPeso(order.total_amount)}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${STATUS_COLOR[order.status] || 'bg-slate-100 text-slate-600'}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-800">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { to: '/admin/orders',   icon: ShoppingCart, label: 'Manage Orders',   sub: `${summary.pending_orders || 0} pending`, color: 'bg-amber-50 text-amber-600' },
                { to: '/admin/products', icon: Package,      label: 'Add Product',     sub: `${summary.total_products || 0} total`, color: 'bg-blue-50 text-blue-600' },
                { to: '/admin/customers',icon: Users,        label: 'View Customers',  sub: `${summary.unique_customers || 0} customers`, color: 'bg-emerald-50 text-emerald-600' },
                { to: '/admin/stores',   icon: ShoppingCart, label: 'Manage Stores',   sub: `${summary.active_categories || 0} categories`, color: 'bg-violet-50 text-violet-600' },
                { to: '/admin/reports',  icon: TrendingUp,   label: 'View Reports',    sub: 'Analytics & insights', color: 'bg-rose-50 text-rose-600' },
              ].map(({ to, icon: Icon, label, sub, color }) => (
                <Link key={to} to={to}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white/60 p-3 transition hover:border-[#2954C8]/20 hover:bg-[#eef3fb]/60">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{label}</p>
                    <p className="text-[10px] text-slate-400">{sub}</p>
                  </div>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverviewPage;
