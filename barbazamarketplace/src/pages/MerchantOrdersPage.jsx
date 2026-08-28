import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Filter, Package, Search, Eye } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/use-toast';
import { fetchMerchantOrders, updateMerchantOrderStatus } from '../api/EcommerceApi';
import { formatPeso } from '../lib/marketplace';
import Pagination from '../components/ui/Pagination';

const PAGE_SIZE = 10;

const ORDER_STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
const STATUS_VARIANTS = {
  pending: 'warning',
  processing: 'info',
  shipped: 'secondary',
  delivered: 'success',
  cancelled: 'destructive',
  refunded: 'outline',
};

const statusLabel = (status) => String(status || 'pending').replace(/^\w/, (char) => char.toUpperCase());

const formatOrderDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'No timestamp';
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const MerchantOrdersPage = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [detailOrderId, setDetailOrderId] = useState(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const response = await fetchMerchantOrders({
        search: searchQuery.trim() || undefined,
        status: statusFilter,
        page: 1,
        per_page: 100,
      });
      setOrders(Array.isArray(response?.orders) ? response.orders : []);
    } catch (error) {
      toast({
        title: 'Unable to load orders',
        description: error?.message || 'Failed to fetch store orders.',
        variant: 'destructive',
      });
    } finally {
      setLoadingOrders(false);
    }
  }, [searchQuery, statusFilter, toast]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadOrders();
    }, 220);

    return () => clearTimeout(timeoutId);
  }, [loadOrders]);

  const [currentPage, setCurrentPage] = useState(1);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return [order.id, order.customer?.name, order.customer?.email, order.status]
        .filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }, [orders, searchQuery, statusFilter]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

  const lastPage = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, lastPage);
  const pagedOrders = filteredOrders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleStatusChange = async (orderId, status) => {
    setUpdatingOrderId(orderId);
    try {
      const response = await updateMerchantOrderStatus(orderId, status);
      const updatedOrder = response?.order;
      if (updatedOrder?.id) {
        setOrders((previous) =>
          previous.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
        );
      } else {
        await loadOrders();
      }

      toast({
        title: 'Order updated',
        description: `Order #${orderId} is now ${statusLabel(status)}.`,
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Unable to update order',
        description: error?.message || 'Status update failed.',
        variant: 'destructive',
      });
      await loadOrders();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleViewDetails = (orderId) => {
    setDetailOrderId(orderId);
    setIsOrderDetailsOpen(true);
  };

  const detailOrder = useMemo(
    () => orders.find((order) => order.id === detailOrderId) || null,
    [orders, detailOrderId]
  );

  const detailItems = useMemo(() => {
    if (!detailOrder) return [];
    if (Array.isArray(detailOrder.store_items) && detailOrder.store_items.length > 0) return detailOrder.store_items;
    if (Array.isArray(detailOrder.items) && detailOrder.items.length > 0) return detailOrder.items;
    return [];
  }, [detailOrder]);

  return (
    <div className="space-y-6">
      <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
        <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-lg font-bold text-slate-800 sm:text-xl">Store Orders</CardTitle>
            <p className="text-sm text-slate-500">Track and process orders assigned to your store.</p>
          </div>
          <Button variant="outline" className="w-full gap-2 text-xs font-bold rounded-xl border-slate-200 sm:w-auto" disabled>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <div className="relative min-w-0 flex-1 sm:min-w-[280px]">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by order ID or customer name..."
                className="h-11 rounded-2xl border-slate-200 pl-11 focus:ring-2 focus:ring-[#2954C8]/20"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <label className="flex w-full items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm sm:w-auto">
                <Filter className="mr-2 h-4 w-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-10 w-full bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer sm:w-auto"
                >
                  <option value="all">All Statuses</option>
                  {ORDER_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-[#ECF1FA] bg-white shadow-sm lg:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#ECF1FA] bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Order</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Store</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Store Items</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECF1FA]">
                {loadingOrders ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500">
                      Loading orders...
                    </td>
                  </tr>
                ) : pagedOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-20 text-center text-slate-500">
                      No matching orders found.
                    </td>
                  </tr>
                ) : (
                  pagedOrders.map((order) => {
                    const storeSubtotal = Number(order.store_subtotal_amount || 0);
                    const fullTotal = Number(order.total_amount || 0);
                    const showFullTotal = Math.abs(storeSubtotal - fullTotal) > 0.009;

                    return (
                      <tr key={order.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-800">#{order.id}</p>
                          <p className="text-[10px] font-medium text-slate-400">{formatOrderDate(order.created_at)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-slate-700">{order.customer?.name || 'Guest'}</p>
                          <p className="truncate text-[10px] font-medium text-slate-400 max-w-[200px]">{order.customer?.email || 'No email'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-medium text-slate-600">{order.store_name || 'My Store'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-medium text-slate-600">{Number(order.store_item_count || 0)} items</p>
                          {order.has_other_store_items && (
                            <p className="text-[10px] font-medium text-amber-600">Includes other-store items</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={STATUS_VARIANTS[order.status] || 'outline'} className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider">
                            {statusLabel(order.status)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-800">{formatPeso(storeSubtotal)}</p>
                          {showFullTotal && (
                            <p className="text-[10px] font-medium text-slate-400">Full order: {formatPeso(fullTotal)}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-[#2954C8] hover:bg-blue-50"
                              onClick={() => handleViewDetails(order.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <div className="flex flex-col">
                              <label className="flex h-8 items-center rounded-xl border border-[#d7e2f1] bg-white px-2 shadow-sm focus-within:ring-2 focus-within:ring-[#2954C8]/20">
                                <select
                                  value={order.status}
                                  disabled={updatingOrderId === order.id || !order.merchant_can_update_status}
                                  onChange={(event) => handleStatusChange(order.id, event.target.value)}
                                  className="bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer disabled:cursor-not-allowed disabled:text-slate-400"
                                >
                                  {ORDER_STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                      {statusLabel(status)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              {updatingOrderId === order.id && <p className="animate-pulse text-[9px] font-medium text-[#2954C8] text-center">Updating...</p>}
                              {!order.merchant_can_update_status && (
                                <p className="text-[9px] font-medium text-amber-600 text-center">
                                  Status locked.
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: the same orders as stacked cards, since a 7-column table cannot shrink */}
          <div className="space-y-3 lg:hidden">
            {loadingOrders ? (
              <p className="py-12 text-center text-sm text-slate-500">Loading orders...</p>
            ) : pagedOrders.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">No matching orders found.</p>
            ) : (
              pagedOrders.map((order) => {
                const storeSubtotal = Number(order.store_subtotal_amount || 0);
                const fullTotal = Number(order.total_amount || 0);
                const showFullTotal = Math.abs(storeSubtotal - fullTotal) > 0.009;

                return (
                  <div key={order.id} className="rounded-2xl border border-[#ECF1FA] bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800">#{order.id}</p>
                        <p className="text-[10px] font-medium text-slate-400">{formatOrderDate(order.created_at)}</p>
                      </div>
                      <Badge variant={STATUS_VARIANTS[order.status] || 'outline'} className="shrink-0 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider">
                        {statusLabel(order.status)}
                      </Badge>
                    </div>

                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="truncate text-xs font-bold text-slate-700">{order.customer?.name || 'Guest'}</p>
                      <p className="truncate text-[10px] font-medium text-slate-400">{order.customer?.email || 'No email'}</p>
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-600">{Number(order.store_item_count || 0)} items</p>
                        {order.has_other_store_items && (
                          <p className="text-[10px] font-medium text-amber-600">Includes other-store items</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-slate-800">{formatPeso(storeSubtotal)}</p>
                        {showFullTotal && (
                          <p className="text-[10px] font-medium text-slate-400">Full order: {formatPeso(fullTotal)}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 flex-1 gap-2 rounded-xl border-slate-200 text-xs font-bold"
                        onClick={() => handleViewDetails(order.id)}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <label className="flex h-9 min-w-0 flex-1 items-center rounded-xl border border-[#d7e2f1] bg-white px-2 shadow-sm focus-within:ring-2 focus-within:ring-[#2954C8]/20">
                        <select
                          value={order.status}
                          disabled={updatingOrderId === order.id || !order.merchant_can_update_status}
                          onChange={(event) => handleStatusChange(order.id, event.target.value)}
                          className="w-full bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer disabled:cursor-not-allowed disabled:text-slate-400"
                        >
                          {ORDER_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {statusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {updatingOrderId === order.id && <p className="mt-1.5 animate-pulse text-center text-[9px] font-medium text-[#2954C8]">Updating...</p>}
                    {!order.merchant_can_update_status && (
                      <p className="mt-1.5 text-center text-[9px] font-medium text-amber-600">Status locked.</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <Pagination currentPage={safePage} lastPage={lastPage} hasMore={safePage < lastPage} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>

      <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailOrder ? `Order #${detailOrder.id}` : 'Order Details'}</DialogTitle>
            <DialogDescription>Review customer info and the items assigned to your store.</DialogDescription>
          </DialogHeader>

          {!detailOrder ? (
            <p className="text-sm text-slate-500">Order details are unavailable.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant={STATUS_VARIANTS[detailOrder.status] || 'outline'} className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider">
                  {statusLabel(detailOrder.status)}
                </Badge>
                <p className="text-xs font-medium text-slate-500">{formatOrderDate(detailOrder.created_at)}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Customer</p>
                  <p className="mt-1 font-medium text-slate-800">{detailOrder.customer?.name || detailOrder.customer?.fullName || 'Guest'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="mt-1 font-medium text-slate-800">{detailOrder.customer?.email || 'No email'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="mt-1 font-medium text-slate-800">{detailOrder.customer?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Payment</p>
                  <p className="mt-1 font-medium text-slate-800">{detailOrder.payment_method || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Reference Code</p>
                  <p className="mt-1 font-medium text-slate-800 uppercase">{detailOrder.payment_reference || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Store Subtotal</p>
                  <p className="mt-1 font-semibold text-[#2954C8]">{formatPeso(Number(detailOrder.store_subtotal_amount || 0))}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Full Order Total</p>
                  <p className="mt-1 font-semibold text-slate-800">{formatPeso(Number(detailOrder.total_amount || 0))}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Shipping City</p>
                  <p className="mt-1 font-medium text-slate-800">{detailOrder.shipping_city || 'N/A'}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-500">Shipping Address</p>
                  <p className="mt-1 font-medium text-slate-800">{detailOrder.shipping_address || 'N/A'}</p>
                </div>
              </div>

              {detailOrder.has_other_store_items && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  This order includes items from other stores. The list below shows your store items only.
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Store Items</p>
                {detailItems.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No item details available for this order.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {detailItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-2.5 text-sm">
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
                              {formatPeso(Number(item.price || 0))} x {Number(item.quantity || 0)}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold text-slate-800">{formatPeso(Number(item.total_price || 0))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantOrdersPage;
