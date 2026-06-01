import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Filter, Download, Package, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import Pagination from '../components/ui/Pagination';

const PAGE_SIZE = 10;

const AdminOrdersPage = () => {
  const { 
    filteredOrders, 
    searchQuery, 
    setSearchQuery, 
    statusFilter, 
    setStatusFilter, 
    formatPeso, 
    formatOrderDate, 
    statusLabel, 
    STATUS_VARIANTS, 
    ORDER_STATUS_OPTIONS, 
    handleStatusChange, 
    updatingOrderId 
  } = useOutletContext();

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const lastPage = Math.max(1, Math.ceil((filteredOrders?.length || 0) / PAGE_SIZE));
  const safePage = Math.min(currentPage, lastPage);
  const pagedOrders = useMemo(
    () => (filteredOrders || []).slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredOrders, safePage]
  );

  return (
    <div className="space-y-6">
      <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">Order Management</CardTitle>
            <p className="text-sm text-slate-500">Track and fulfill marketplace orders</p>
          </div>
          <Button variant="outline" className="gap-2 text-xs font-bold rounded-xl border-slate-200">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by order ID or customer name..."
                className="h-11 rounded-2xl border-slate-200 pl-11 focus:ring-2 focus:ring-[#2954C8]/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <label className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                <Filter className="mr-2 h-4 w-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#ECF1FA] bg-white shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#ECF1FA] bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Order</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Store</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Items</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECF1FA]">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-20 text-center text-slate-500">
                      No matching orders found.
                    </td>
                  </tr>
                ) : (
                  pagedOrders.map((order) => (
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
                        <p className="text-xs font-medium text-slate-600">{order.store_name || 'Platform Store'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-medium text-slate-600">{order.item_count || 0} items</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={STATUS_VARIANTS[order.status] || 'outline'} className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider">
                          {statusLabel(order.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">{formatPeso(order.total_amount)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-[#2954C8] hover:bg-blue-50"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <div className="flex flex-col">
                            <label className="flex h-8 items-center rounded-xl border border-[#d7e2f1] bg-white px-2 shadow-sm focus-within:ring-2 focus-within:ring-[#2954C8]/20">
                              <select 
                                value={order.status} 
                                disabled={updatingOrderId === order.id} 
                                onChange={(event) => handleStatusChange(order.id, event.target.value)} 
                                className="bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                              >
                                {ORDER_STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>
                                    {statusLabel(status)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {updatingOrderId === order.id && <p className="animate-pulse text-[9px] font-medium text-[#2954C8] text-center">Updating...</p>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={safePage} lastPage={lastPage} hasMore={safePage < lastPage} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedOrder ? `Order #${selectedOrder.id}` : 'Order Details'}</DialogTitle>
            <DialogDescription>Review full customer info and items for this order.</DialogDescription>
          </DialogHeader>

          {!selectedOrder ? (
            <p className="text-sm text-slate-500">Order details are unavailable.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant={STATUS_VARIANTS[selectedOrder.status] || 'outline'} className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider">
                  {statusLabel(selectedOrder.status)}
                </Badge>
                <p className="text-xs font-medium text-slate-500">{formatOrderDate(selectedOrder.created_at)}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Customer</p>
                  <p className="mt-1 font-medium text-slate-800">{selectedOrder.customer?.name || 'Guest'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="mt-1 font-medium text-slate-800">{selectedOrder.customer?.email || 'No email'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="mt-1 font-medium text-slate-800">{selectedOrder.customer?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Payment</p>
                  <p className="mt-1 font-medium text-slate-800">{selectedOrder.payment_method || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Reference Code</p>
                  <p className="mt-1 font-medium text-slate-800 uppercase">{selectedOrder.payment_reference || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Shipping City</p>
                  <p className="mt-1 font-medium text-slate-800">{selectedOrder.shipping_city || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Amount</p>
                  <p className="mt-1 font-semibold text-[#2954C8]">{formatPeso(selectedOrder.total_amount)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-500">Shipping Address</p>
                  <p className="mt-1 font-medium text-slate-800">{selectedOrder.shipping_address || 'N/A'}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ordered Items</p>
                {(!selectedOrder.items || selectedOrder.items.length === 0) ? (
                  <p className="mt-3 text-sm text-slate-500">No item details available for this order summary.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-2.5 text-sm">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name || 'Item'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">{item.name || 'Item'}</p>
                            <p className="truncate text-xs text-slate-500">
                              {formatPeso(Number(item.price || 0))} x {item.quantity}
                            </p>
                            {item.store_name && (
                              <p className="text-[10px] text-blue-600 font-medium">Store: {item.store_name}</p>
                            )}
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
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrdersPage;
