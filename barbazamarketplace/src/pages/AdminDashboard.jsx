import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import AdminOverviewPage from './AdminOverviewPage';
import AdminOrdersPage from './AdminOrdersPage';
import AdminProductsPage from './AdminProductsPage';
import AdminCustomersPage from './AdminCustomersPage';
import AdminReportsPage from './AdminReportsPage';
import AdminSettingsPage from './AdminSettingsPage';
import {
  AlertTriangle,
  Boxes,
  ChartColumn,
  Clock3,
  LayoutDashboard,
  Package,
  RefreshCcw,
  Search,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LinearGradient,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity } from 'lucide-react';
import { getAdminDashboard, updateOrderStatus } from '../api/EcommerceApi';
import { useAuth } from '../hooks/useAuth';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { formatPeso, resolveProductImage } from '../lib/marketplace';

const ORDER_STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
const STATUS_VARIANTS = {
  pending: 'warning',
  processing: 'info',
  shipped: 'secondary',
  delivered: 'success',
  cancelled: 'destructive',
  refunded: 'outline',
};
const PIE_COLORS = ['#2954C8', '#2EA7FF', '#12B981', '#F6C343', '#FF5A75', '#94A3B8'];
const EMPTY_ITEMS = [];

const statusLabel = (status) => String(status || 'pending').replace(/^\w/, (char) => char.toUpperCase());

const formatOrderDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'No timestamp'
    : date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [prevDashboard, setPrevDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [activeSidebarItem, setActiveSidebarItem] = useState('dashboard');
  const [dateRange, setDateRange] = useState('this_year');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const hasLoadedRef = useRef(false);

  const { dateRangeParams, prevPeriodParams } = useMemo(() => {
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);

    const shiftBack = (from, to) => {
      const f = new Date(from), t = new Date(to);
      const diffMs = t - f + 86400000; // inclusive days in ms
      const pTo = new Date(f - 86400000);
      const pFrom = new Date(pTo - diffMs + 86400000);
      return { from: fmt(pFrom), to: fmt(pTo) };
    };

    if (dateRange === 'today') {
      const s = fmt(today);
      const yesterday = fmt(new Date(today - 86400000));
      return { dateRangeParams: { from: s, to: s }, prevPeriodParams: { from: yesterday, to: yesterday } };
    }
    if (dateRange === 'this_week') {
      const day = today.getDay();
      const mon = new Date(today); mon.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
      const cur = { from: fmt(mon), to: fmt(today) };
      return { dateRangeParams: cur, prevPeriodParams: shiftBack(cur.from, cur.to) };
    }
    if (dateRange === 'this_month') {
      const cur = { from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), to: fmt(today) };
      return { dateRangeParams: cur, prevPeriodParams: shiftBack(cur.from, cur.to) };
    }
    if (dateRange === 'this_year') {
      const cur = { from: `${today.getFullYear()}-01-01`, to: fmt(today) };
      return { dateRangeParams: cur, prevPeriodParams: { from: `${today.getFullYear() - 1}-01-01`, to: `${today.getFullYear() - 1}-12-31` } };
    }
    if (dateRange === 'custom' && customFrom && customTo) {
      const cur = { from: customFrom, to: customTo };
      return { dateRangeParams: cur, prevPeriodParams: shiftBack(cur.from, cur.to) };
    }
    return { dateRangeParams: {}, prevPeriodParams: {} };
  }, [dateRange, customFrom, customTo]);

  const loadDashboard = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    if (!manual && !hasLoadedRef.current) setLoading(true);

    try {
      const [data, prev] = await Promise.all([
        getAdminDashboard(dateRangeParams),
        Object.keys(prevPeriodParams).length ? getAdminDashboard(prevPeriodParams) : Promise.resolve(null),
      ]);
      setDashboard(data);
      setPrevDashboard(prev);
      setError('');
      setLastSync(new Date());
      hasLoadedRef.current = true;
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load admin dashboard.');
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, [dateRangeParams, prevPeriodParams]);

  useEffect(() => {
    loadDashboard();
    const intervalId = setInterval(() => loadDashboard(true), 30000);
    return () => clearInterval(intervalId);
  }, [loadDashboard]);

  const summary = dashboard?.summary || {};
  const monthlySales = dashboard?.monthly_sales || EMPTY_ITEMS;
  const statusBreakdown = dashboard?.status_breakdown || EMPTY_ITEMS;
  const recentOrders = dashboard?.recent_orders || EMPTY_ITEMS;
  const topProducts = dashboard?.top_products || EMPTY_ITEMS;
  const lowStockProducts = dashboard?.low_stock_products || EMPTY_ITEMS;
  const displayName = user?.name || user?.username || 'Admin';

  const pctChange = useCallback((current, previous) => {
    const cur = Number(current || 0);
    const prev = Number(previous || 0);
    if (prev <= 0) return null; // no previous data — show "—" instead of inflated %
    return ((cur - prev) / prev) * 100;
  }, []);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return recentOrders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (!query) return true;

      return [
        order.id,
        order.customer?.name,
        order.customer?.email,
        order.payment_method,
        order.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [recentOrders, searchQuery, statusFilter]);

  const prevSummary = prevDashboard?.summary || {};
  const statTiles = [
    { title: 'Gross Revenue', value: formatPeso(summary.total_revenue), meta: `${summary.delivered_orders || 0} delivered`, pesoIcon: true, iconBg: 'bg-[#EAF5FF]', iconColor: 'text-[#2D9CFF]', trend: pctChange(summary.total_revenue, prevSummary.total_revenue) },
    { title: 'Total Orders', value: Number(summary.total_orders || 0).toLocaleString('en-US'), meta: `${summary.pending_orders || 0} pending`, icon: ShoppingCart, iconBg: 'bg-[#FFF7E7]', iconColor: 'text-[#E7B329]', trend: pctChange(summary.total_orders, prevSummary.total_orders) },
    { title: 'Customers', value: Number(summary.unique_customers || 0).toLocaleString('en-US'), meta: `${summary.active_categories || 0} categories`, icon: Users, iconBg: 'bg-[#EAFBF5]', iconColor: 'text-[#12B981]', trend: pctChange(summary.unique_customers, prevSummary.unique_customers) },
    { title: 'Avg. Order Value', value: formatPeso(summary.average_order_value), meta: `${summary.refunded_orders || 0} refunded`, icon: Truck, iconBg: 'bg-[#FDEFF2]', iconColor: 'text-[#FF5A75]', trend: pctChange(summary.average_order_value, prevSummary.average_order_value) },
  ];

  const recentActivities = useMemo(() => {
    // Derived from recent orders for demonstration
    return recentOrders.slice(0, 5).map(order => ({
      id: `act-${order.id}`,
      type: 'order',
      title: `Order #${order.id} - ${order.customer?.name || 'Guest'}`,
      description: `${order.customer?.name || 'Guest'} placed an order for ${formatPeso(order.total_amount)}`,
      time: formatOrderDate(order.created_at),
      icon: ShoppingCart,
      color: 'text-blue-500'
    }));
  }, [recentOrders]);

  const sidebarLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, sectionId: 'overview' },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, sectionId: 'orders' },
    { id: 'products', label: 'Products', icon: Package, sectionId: 'inventory' },
    { id: 'customers', label: 'Customers', icon: Users, sectionId: 'customers' },
    { id: 'reports', label: 'Reports', icon: ChartColumn, sectionId: 'performance' },
    { id: 'settings', label: 'Settings', icon: Settings, sectionId: 'settings' },
  ];

  const scrollToSection = useCallback((sectionId) => {
    const element = document.getElementById(sectionId);
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleSidebarNavigation = useCallback((item) => {
    setActiveSidebarItem(item.id);
    scrollToSection(item.sectionId);
  }, [scrollToSection]);

  const handleStatusChange = async (orderId, status) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, status);
      await loadDashboard(true);
    } catch (updateError) {
      setError(updateError?.message || 'Unable to update order status.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const context = {
    summary,
    statTiles,
    salesTrend: monthlySales.map(m => ({ name: m.label, sales: m.revenue })),
    recentActivities,
    formatPeso,
    filteredOrders,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    formatOrderDate,
    statusLabel,
    STATUS_VARIANTS,
    ORDER_STATUS_OPTIONS,
    handleStatusChange,
    updatingOrderId,
    loading,
    refreshing,
    lastSync,
    onRefresh: () => loadDashboard(true),
    dashboard,
    topProducts,
    lowStockProducts,
    statusBreakdown,
    recentOrders,
  };

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - Barbaza MPC</title>
      </Helmet>
      
      <AdminLayout 
        outletContext={context}
      />
    </>
  );
};

export default AdminDashboard;
