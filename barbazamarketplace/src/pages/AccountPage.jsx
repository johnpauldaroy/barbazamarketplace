import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { LockKeyhole, PackageSearch, Search, ShieldCheck } from 'lucide-react';
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
        order.total_amount,
        order.shipping_address,
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
    <div className="min-h-screen bg-[#F4F7FD] py-8">
      <Helmet>
        <title>My Account - Barbaza MPC Marketplace</title>
      </Helmet>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#0B1739]">My Account</h1>
          <p className="mt-2 text-slate-600">View your orders, track status, and update account security.</p>
        </div>

        <Tabs defaultValue="orders" className="space-y-5">
          <TabsList className="h-11 rounded-2xl bg-white p-1 shadow-sm">
            <TabsTrigger value="orders" className="rounded-xl px-4 py-2">Orders</TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl px-4 py-2">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-5">
            <Card className="border-none bg-white/80 shadow-lg">
              <CardContent className="p-5">
                <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                      placeholder="Search by order ID, status, payment, or address"
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
                <CardHeader>
                  <CardTitle className="text-xl">Order History</CardTitle>
                </CardHeader>
                <CardContent>
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
                      {filteredOrders.map((order) => (
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
                            <div>
                              <p className="text-sm font-bold text-slate-800">Order #{order.id}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {new Date(order.created_at).toLocaleString()}
                              </p>
                            </div>
                            <Badge className={`border-none text-[10px] uppercase tracking-wider ${statusVariantClass(order.status)}`}>
                              {toStatusLabel(order.status)}
                            </Badge>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-[#2954C8]">
                            {formatPeso(order.total_amount)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none bg-white/80 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Order Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {!selectedOrder ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
                      Select an order to view details.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-800">Order #{selectedOrder.id}</p>
                        <Badge className={`border-none text-[10px] uppercase tracking-wider ${statusVariantClass(selectedOrder.status)}`}>
                          {toStatusLabel(selectedOrder.status)}
                        </Badge>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status Flow</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {ORDER_STATUS_FLOW.map((status) => (
                            <span
                              key={status}
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                status === selectedOrder.status ? 'bg-[#2954C8] text-white' : 'bg-white text-slate-500'
                              }`}
                            >
                              {toStatusLabel(status)}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Placed</p>
                          <p className="mt-1 font-medium text-slate-800">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Payment</p>
                          <p className="mt-1 font-medium text-slate-800">{selectedOrder.payment_method || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Shipping City</p>
                          <p className="mt-1 font-medium text-slate-800">{selectedOrder.shipping_city || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Total</p>
                          <p className="mt-1 font-semibold text-[#2954C8]">{formatPeso(selectedOrder.total_amount)}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Items</p>
                        <div className="mt-3 space-y-2">
                          {(selectedOrder.items || []).map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <span className="text-slate-700">{item.name} x {item.quantity}</span>
                              <span className="font-medium text-slate-800">{formatPeso(item.total_price)}</span>
                            </div>
                          ))}
                        </div>
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
