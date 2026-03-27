import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  CircleCheck,
  CircleX,
  Clock3,
  LockKeyhole,
  Package,
  PackageSearch,
  RotateCcw,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '../components/ui/use-toast';
import { getUserOrders, updateUserPassword } from '../api/EcommerceApi';
import { formatPeso } from '../lib/marketplace';

const ORDER_STATUS_FLOW = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
const ORDER_JOURNEY_STEPS = ['pending', 'processing', 'shipped', 'delivered'];
const TERMINAL_STATUSES = ['cancelled', 'refunded'];

const STATUS_META = {
  pending: {
    label: 'Pending',
    subtitle: 'Order received',
    detail: 'Your order is in queue and waiting to be prepared.',
    icon: Clock3,
  },
  processing: {
    label: 'Processing',
    subtitle: 'Packing items',
    detail: 'The seller is preparing and packing your order.',
    icon: Package,
  },
  shipped: {
    label: 'Shipped',
    subtitle: 'On the way',
    detail: 'Your parcel has been dispatched and is on the way.',
    icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    subtitle: 'Completed',
    detail: 'Your order has been delivered successfully.',
    icon: CircleCheck,
  },
  cancelled: {
    label: 'Cancelled',
    subtitle: 'Order closed',
    detail: 'This order was cancelled and will not be delivered.',
    icon: CircleX,
  },
  refunded: {
    label: 'Refunded',
    subtitle: 'Order closed',
    detail: 'This order has been refunded to your payment source.',
    icon: RotateCcw,
  },
};

const toStatusLabel = (status) => {
  const value = String(status || 'pending');
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const statusVariantClass = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'delivered':
      return 'bg-emerald-50 text-emerald-700';
    case 'cancelled':
    case 'refunded':
      return 'bg-rose-50 text-rose-700';
    case 'shipped':
      return 'bg-blue-50 text-blue-700';
    case 'processing':
      return 'bg-amber-50 text-amber-700';
    case 'pending':
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const getStepState = (currentStatus, stepIndex) => {
  const normalizedStatus = String(currentStatus || 'pending').toLowerCase();
  if (TERMINAL_STATUSES.includes(normalizedStatus)) return 'upcoming';

  const currentIndex = ORDER_JOURNEY_STEPS.indexOf(normalizedStatus);
  if (currentIndex === -1) return stepIndex === 0 ? 'current' : 'upcoming';
  if (stepIndex < currentIndex) return 'complete';
  if (stepIndex === currentIndex) return 'current';
  return 'upcoming';
};

const getJourneyProgressPercent = (status) => {
  const normalizedStatus = String(status || 'pending').toLowerCase();
  if (TERMINAL_STATUSES.includes(normalizedStatus)) return 100;

  const currentIndex = ORDER_JOURNEY_STEPS.indexOf(normalizedStatus);
  if (currentIndex === -1) return 25;

  return ((currentIndex + 1) / ORDER_JOURNEY_STEPS.length) * 100;
};

const formatDateTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
};

const getOrderItems = (order) => (Array.isArray(order?.items) ? order.items : []);

const getOrderPrimaryItem = (order) => getOrderItems(order)[0] || null;

const getOrderStores = (order) => (
  [...new Set(
    getOrderItems(order)
      .map((item) => item?.store_name || (item?.store_id ? `Store #${item.store_id}` : null))
      .filter(Boolean)
  )]
);

const getOrderStoreSummary = (order) => {
  const stores = getOrderStores(order);
  if (stores.length === 0) return 'Store not available';
  if (stores.length === 1) return stores[0];
  return `${stores[0]} +${stores.length - 1} more store${stores.length > 2 ? 's' : ''}`;
};

const getOrderItemSummary = (order) => {
  const items = getOrderItems(order);
  if (items.length === 0) return 'No items';

  const firstItemName = items[0]?.name || 'Item';
  const remainingCount = items.length - 1;
  if (remainingCount <= 0) return firstItemName;
  return `${firstItemName} +${remainingCount} more item${remainingCount > 1 ? 's' : ''}`;
};

const AccountPage = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  useEffect(() => {
    const loadOrders = async () => {
      setLoadingOrders(true);
      try {
        const data = await getUserOrders();
        const normalized = Array.isArray(data) ? data : [];
        setOrders(normalized);
        if (normalized.length > 0) {
          setSelectedOrderId(normalized[0].id);
        }
      } catch (error) {
        toast({
          title: 'Unable to load orders',
          description: error?.message || 'Could not fetch your order history.',
          variant: 'destructive',
        });
      } finally {
        setLoadingOrders(false);
      }
    };

    loadOrders();
  }, [toast]);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (!query) return true;

      return [
        order.id,
        order.status,
        order.payment_method,
        order.payment_reference,
        order.total_amount,
        order.shipping_address,
        order.shipping_city,
        order.customer?.fullName,
        order.customer?.email,
        ...getOrderItems(order).flatMap((item) => [item?.name, item?.store_name, item?.store_slug]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [orders, orderSearch, statusFilter]);

  const selectedOrder = useMemo(
    () => filteredOrders.find((order) => order.id === selectedOrderId) || filteredOrders[0] || null,
    [filteredOrders, selectedOrderId]
  );

  const selectedOrderItems = useMemo(() => getOrderItems(selectedOrder), [selectedOrder]);
  const selectedOrderStores = useMemo(() => getOrderStores(selectedOrder), [selectedOrder]);

  useEffect(() => {
    if (!selectedOrder && filteredOrders.length > 0) {
      setSelectedOrderId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedOrder]);

  const handlePasswordFieldChange = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (passwordForm.password !== passwordForm.password_confirmation) {
      toast({
        title: 'Password mismatch',
        description: 'New password and confirmation do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.password.length < 8) {
      toast({
        title: 'Weak password',
        description: 'New password must be at least 8 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateUserPassword(passwordForm);
      setPasswordForm({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Password update failed',
        description: error?.message || 'Unable to update password.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FD] py-6 sm:py-8">
      <Helmet>
        <title>My Account - Barbaza MPC Marketplace</title>
      </Helmet>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0B1739] sm:text-3xl">My Account</h1>
          <p className="mt-2 text-slate-600">View your orders, track status, and update account security.</p>
        </div>

        <Tabs defaultValue="orders" className="space-y-5">
          <TabsList className="h-11 w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-sm">
            <TabsTrigger value="orders" className="rounded-xl px-4 py-2 whitespace-nowrap">Orders</TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl px-4 py-2 whitespace-nowrap">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-5">
            <Card className="border-none bg-white/80 shadow-lg">
              <CardContent className="p-4 sm:p-5">
                <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                      placeholder="Search by order ID, item, store, payment, or address"
                      className="h-11 rounded-2xl pl-10"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#2954C8] focus:ring-2 focus:ring-[#2954C8]/20"
                  >
                    <option value="all">All statuses</option>
                    {ORDER_STATUS_FLOW.map((status) => (
                      <option key={status} value={status}>{toStatusLabel(status)}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <Card className="border-none bg-white/80 shadow-lg">
                <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-3">
                  <CardTitle className="text-xl">Order History</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                  {loadingOrders ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
                      Loading your orders...
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
                      <PackageSearch className="mx-auto mb-2 h-6 w-6 text-slate-400" />
                      No orders matched your search.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredOrders.map((order) => {
                        const primaryItem = getOrderPrimaryItem(order);
                        const storeSummary = getOrderStoreSummary(order);
                        const itemSummary = getOrderItemSummary(order);

                        return (
                          <button
                            key={order.id}
                            type="button"
                            onClick={() => setSelectedOrderId(order.id)}
                            className={`w-full rounded-2xl border p-4 text-left transition ${
                              selectedOrder?.id === order.id
                                ? 'border-[#2954C8]/30 bg-[#eef5ff]'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                                  {primaryItem?.image_url ? (
                                    <img
                                      src={primaryItem.image_url}
                                      alt={primaryItem?.name || 'Ordered item'}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <Package className="h-5 w-5 text-slate-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-800">Order #{order.id}</p>
                                  <p className="mt-0.5 truncate text-xs font-medium text-slate-700">{itemSummary}</p>
                                  <p className="mt-0.5 truncate text-xs text-slate-500">{storeSummary}</p>
                                  <p className="mt-0.5 break-words text-[11px] text-slate-500">{formatDateTime(order.created_at)}</p>
                                </div>
                              </div>
                              <Badge className={`shrink-0 border-none text-[10px] uppercase tracking-wider ${statusVariantClass(order.status)}`}>
                                {toStatusLabel(order.status)}
                              </Badge>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-[#2954C8]">{formatPeso(order.total_amount)}</p>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                                {order.payment_method || 'N/A'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none bg-white/80 shadow-lg">
                <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-3">
                  <CardTitle className="text-xl">Order Details</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                  {!selectedOrder ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
                      Select an order to view details.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        const normalizedStatus = String(selectedOrder.status || 'pending').toLowerCase();
                        const statusMeta = STATUS_META[normalizedStatus] || STATUS_META.pending;
                        const StatusIcon = statusMeta.icon;
                        const isTerminalStatus = TERMINAL_STATUSES.includes(normalizedStatus);
                        const progress = getJourneyProgressPercent(normalizedStatus);

                        return (
                          <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 sm:p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Order Journey</p>
                              <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusVariantClass(normalizedStatus)}`}>
                                <StatusIcon className="h-3.5 w-3.5" />
                                {statusMeta.label}
                              </div>
                            </div>

                            <p className="mt-2 text-sm text-slate-600">{statusMeta.detail}</p>

                            <div className="mt-4 h-2 rounded-full bg-slate-200">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${isTerminalStatus ? 'bg-rose-500' : 'bg-[#2954C8]'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-2 min-[520px]:grid-cols-2">
                              {ORDER_JOURNEY_STEPS.map((step, index) => {
                                const stepMeta = STATUS_META[step];
                                const StepIcon = stepMeta.icon;
                                const stepState = getStepState(normalizedStatus, index);

                                const stateClass =
                                  stepState === 'complete'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : stepState === 'current'
                                      ? 'border-[#2954C8]/35 bg-[#eef5ff] text-[#2954C8]'
                                      : 'border-slate-200 bg-white text-slate-500';

                                return (
                                  <div key={step} className={`min-w-0 rounded-xl border p-2.5 ${stateClass}`}>
                                    <div className="flex items-start gap-2">
                                      <div
                                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                                          stepState === 'complete'
                                            ? 'bg-emerald-600 text-white'
                                            : stepState === 'current'
                                              ? 'bg-[#2954C8] text-white'
                                              : 'bg-slate-100 text-slate-500'
                                        }`}
                                      >
                                        <StepIcon className="h-4 w-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="break-words text-[11px] font-semibold uppercase leading-tight">{stepMeta.label}</p>
                                        <p className="mt-0.5 break-words text-[11px] leading-tight opacity-80">{stepMeta.subtitle}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {isTerminalStatus && (
                              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                                This order has reached a closed status: <span className="font-semibold">{statusMeta.label}</span>.
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-800">Order #{selectedOrder.id}</p>
                        <Badge className={`border-none text-[10px] uppercase tracking-wider ${statusVariantClass(selectedOrder.status)}`}>
                          {toStatusLabel(selectedOrder.status)}
                        </Badge>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Store(s)</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedOrderStores.length > 0 ? (
                            selectedOrderStores.map((storeName) => (
                              <span
                                key={storeName}
                                className="rounded-full border border-[#d7e2f1] bg-[#f6f9ff] px-2.5 py-1 text-[11px] font-medium text-slate-700"
                              >
                                {storeName}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-slate-500">Store not available</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-slate-500">Placed</p>
                          <p className="mt-1 break-words font-medium text-slate-800">{formatDateTime(selectedOrder.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Payment</p>
                          <p className="mt-1 break-words font-medium text-slate-800">{selectedOrder.payment_method || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Payment Ref</p>
                          <p className="mt-1 break-words font-medium text-slate-800">{selectedOrder.payment_reference || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Customer</p>
                          <p className="mt-1 break-words font-medium text-slate-800">
                            {selectedOrder.customer?.fullName || selectedOrder.customer?.name || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Email</p>
                          <p className="mt-1 break-all font-medium text-slate-800">{selectedOrder.customer?.email || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Phone</p>
                          <p className="mt-1 break-words font-medium text-slate-800">{selectedOrder.customer?.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Shipping City</p>
                          <p className="mt-1 break-words font-medium text-slate-800">{selectedOrder.shipping_city || 'N/A'}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-xs text-slate-500">Shipping Address</p>
                          <p className="mt-1 break-words font-medium text-slate-800">{selectedOrder.shipping_address || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Total</p>
                          <p className="mt-1 font-semibold text-[#2954C8]">{formatPeso(selectedOrder.total_amount)}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Items</p>
                        {selectedOrderItems.length === 0 ? (
                          <p className="mt-3 text-sm text-slate-500">No items available for this order.</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {selectedOrderItems.map((item) => (
                              <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                                    {item.image_url ? (
                                      <img
                                        src={item.image_url}
                                        alt={item.name || 'Ordered item'}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <Package className="h-4 w-4 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-slate-800">{item.name || 'Item'}</p>
                                    <p className="truncate text-xs text-slate-500">
                                      {item.store_name || (item.store_id ? `Store #${item.store_id}` : 'Store not available')}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {formatPeso(item.price)} x {item.quantity}
                                    </p>
                                  </div>
                                </div>
                                <span className="self-end font-semibold text-slate-800 sm:self-auto">{formatPeso(item.total_price)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-none bg-white/80 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ShieldCheck className="h-5 w-5 text-[#2954C8]" />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="max-w-xl space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(event) => handlePasswordFieldChange('current_password', event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordForm.password}
                      onChange={(event) => handlePasswordFieldChange('password', event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.password_confirmation}
                      onChange={(event) => handlePasswordFieldChange('password_confirmation', event.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="mt-2 bg-[#2954C8]" disabled={isUpdatingPassword}>
                    <LockKeyhole className="mr-2 h-4 w-4" />
                    {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AccountPage;
