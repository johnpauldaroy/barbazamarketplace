import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

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
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Items</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECF1FA]">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center text-slate-500">
                      No matching orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
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
                        <div className="flex flex-col gap-1.5">
                          <label className="flex items-center rounded-xl border border-[#d7e2f1] bg-white px-3 shadow-sm focus-within:ring-2 focus-within:ring-[#2954C8]/20">
                            <select 
                              value={order.status} 
                              disabled={updatingOrderId === order.id} 
                              onChange={(event) => handleStatusChange(order.id, event.target.value)} 
                              className="h-8 w-full bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                            >
                              {ORDER_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {statusLabel(status)}
                                </option>
                              ))}
                            </select>
                          </label>
                          {updatingOrderId === order.id && <p className="animate-pulse text-[10px] font-medium text-[#2954C8]">Updating...</p>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrdersPage;
