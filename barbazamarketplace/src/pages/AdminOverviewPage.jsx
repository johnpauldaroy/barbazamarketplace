import React, { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  Activity,
  CalendarDays,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const DATE_RANGE_OPTIONS = [
  { value: 'today',      label: 'Today' },
  { value: 'this_week',  label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_year',  label: 'This Year' },
  { value: 'custom',     label: 'Custom' },
];

const AdminOverviewPage = () => {
  const {
    summary, statTiles, salesTrend, recentActivities, formatPeso, refreshing, lastSync, onRefresh, dashboard,
    dateRange, setDateRange, customFrom, setCustomFrom, customTo, setCustomTo,
  } = useOutletContext();
  const PIE_COLORS = ['#2954C8', '#2EA7FF', '#12B981', '#F6C343', '#FF5A75', '#94A3B8'];
  const categoryData = useMemo(() => {
    const breakdown = dashboard?.category_breakdown;
    if (Array.isArray(breakdown) && breakdown.length > 0) {
      return breakdown.map((item, i) => ({
        name: item.name || item.category || `Category ${i + 1}`,
        value: Number(item.count || item.value || 0),
        color: PIE_COLORS[i % PIE_COLORS.length],
      }));
    }
    return [];
  }, [dashboard]);


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
          {/* Date range pills */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <CalendarDays className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDateRange(opt.value)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  dateRange === opt.value
                    ? 'bg-[#2954C8] text-white shadow'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
          {dateRange === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2954C8]/30"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2954C8]/30"
              />
            </div>
          )}

          {/* Refresh */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <TrendingUp className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <section id="stats" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statTiles.map((item, index) => {
          const Icon = item.icon;
          const hasTrend = item.trend !== null && item.trend !== undefined;
          const isPositive = item.trend >= 0;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
            >
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
                      <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-400">
                        — vs prev
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#7488A3]">{item.title}</p>
                    <p className="mt-0.5 text-lg font-bold text-slate-800">{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_350px]">
        <section className="space-y-5">
          <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">Sales Trend</CardTitle>
                <p className="text-xs text-slate-500">Revenue growth over time</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2954C8" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2954C8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(val) => `₱${val/1000}k`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      formatter={(val) => [formatPeso(val), 'Revenue']}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#2954C8" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#2954C8]" />
                <CardTitle className="text-lg font-bold text-slate-800">Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className={`mt-1 h-2 w-2 rounded-full ${activity.type === 'order' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-700">{activity.title}</p>
                      <p className="text-[10px] text-slate-400">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-5">
          <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">Top Category Orders</CardTitle>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sales Distribution</p>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {categoryData.map((cat) => (
                  <div key={cat.name} className="rounded-xl border border-slate-100 bg-white/50 p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      <p className="text-[10px] font-bold text-slate-500">{cat.name}</p>
                    </div>
                    <p className="mt-1 text-sm font-bold text-slate-800">{cat.value}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default AdminOverviewPage;
