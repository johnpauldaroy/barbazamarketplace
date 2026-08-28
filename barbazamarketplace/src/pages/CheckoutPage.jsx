import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { AlertCircle, ArrowLeft, Banknote, ChevronRight, Landmark, Loader2, QrCode, ShieldCheck, Smartphone, Store } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/use-toast';
import { useCart } from '../hooks/useCart';
import ProductThumbnail from '../components/ProductThumbnail';
import { useAuth } from '../hooks/useAuth';
import { createOrder, fetchCheckoutQuote } from '../api/EcommerceApi';
import { formatPeso } from '../lib/marketplace';

const METHOD_ICONS = { cod: Banknote, cash_pickup: Store, qrph: QrCode, gcash: Smartphone, maya: Smartphone, bank_transfer: Landmark };
const inputClass = 'mt-1.5 min-h-11 w-full rounded-lg border border-[#dfe7f4] bg-[#f8fafd] px-4 text-base text-slate-700 outline-none transition focus:border-[#2954C8] focus:bg-white focus:ring-2 focus:ring-[#2954C8]/10';

const CheckoutPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [quote, setQuote] = useState({ groups: [], grand_total: 0 });
  const [selectedMethods, setSelectedMethods] = useState({});
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', address: '', city: '' });

  // A null product_variant_id (a cart saved before variants shipped) is sent as
  // undefined so the server applies the product's default variant.
  const orderItems = useMemo(() => cartItems.map((item) => ({
    product_id: item.product.id,
    product_variant_id: item.variant?.product_variant_id ?? undefined,
    quantity: item.quantity,
  })), [cartItems]);

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({ ...current, fullName: current.fullName || user.name || '', email: current.email || user.email || '' }));
  }, [user]);

  useEffect(() => {
    let active = true;
    if (orderItems.length === 0) { setLoadingQuote(false); return () => { active = false; }; }
    setLoadingQuote(true);
    fetchCheckoutQuote(orderItems)
      .then((response) => {
        if (!active) return;
        const groups = Array.isArray(response?.groups) ? response.groups : [];
        setQuote({ groups, grand_total: Number(response?.grand_total || 0) });
        setSelectedMethods(Object.fromEntries(groups.map((group) => [group.store_id, group.payment_methods?.[0]?.id || ''])));
      })
      .catch((error) => active && toast({ title: 'Unable to prepare checkout', description: error?.message, variant: 'destructive' }))
      .finally(() => { if (active) setLoadingQuote(false); });
    return () => { active = false; };
  }, [orderItems, toast]);

  const itemsForGroup = (group) => {
    const ids = new Set((group.product_ids || []).map(Number));
    return cartItems.filter((item) => ids.has(Number(item.product.id)));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (Object.values(form).some((value) => !String(value).trim())) {
      toast({ title: 'Missing information', description: 'Complete all customer and delivery fields.', variant: 'destructive' });
      return;
    }
    const unavailable = quote.groups.find((group) => !selectedMethods[group.store_id]);
    if (unavailable) {
      toast({ title: 'Payment method required', description: `Choose an available payment method for ${unavailable.store_name}.`, variant: 'destructive' });
      return;
    }
    if (authLoading || cartItems.length === 0) return;

    setSubmitting(true);
    try {
      const created = await createOrder({
        items: orderItems,
        shipping_address: form.address.trim(),
        shipping_city: form.city.trim(),
        customer_name: form.fullName.trim(),
        customer_email: form.email.trim(),
        customer_phone: form.phone.trim(),
        payments: quote.groups.map((group) => ({ store_id: group.store_id, payment_method_id: Number(selectedMethods[group.store_id]) })),
        customer: { fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim() },
      });
      clearCart();
      navigate('/order-confirmation', { state: { orders: created?.orders || [created?.order], orderGroup: created?.order_group } });
    } catch (error) {
      toast({ title: 'Checkout failed', description: error?.message || 'Unable to place your orders.', variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  if (cartItems.length === 0) {
    return <div className="section flex min-h-[55vh] flex-col items-center justify-center gap-5 text-center"><Helmet><title>Checkout — e-KoopMart</title></Helmet><p className="text-lg font-bold text-[#0b1739]">Your cart is empty</p><Link to="/products" className="rounded-lg bg-[#2954C8] px-5 py-3 text-sm font-semibold text-white">Browse marketplace</Link></div>;
  }

  return (
    <>
      <Helmet><title>Checkout — e-KoopMart</title></Helmet>
      <div className="border-b border-[#dfe7f4] bg-white"><div className="section py-6">
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-400"><Link to="/cart" className="hover:text-[#2954C8]">Cart</Link><ChevronRight className="h-3 w-3" /><span>Checkout</span></nav>
        <div className="flex items-center gap-3"><Link to="/cart" aria-label="Back to cart" className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#dfe7f4] text-slate-500 hover:text-[#2954C8]"><ArrowLeft className="h-4 w-4" /></Link><div><h1 className="text-2xl font-bold text-[#0b1739]">Checkout</h1><p className="text-sm text-slate-500">One checkout, separate orders for each merchant.</p></div></div>
      </div></div>

      <form onSubmit={handleSubmit} className="section py-8">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <section className="rounded-xl border border-[#dfe7f4] bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2954C8] text-xs font-bold text-white">1</span><h2 className="font-bold text-[#0b1739]">Contact and delivery</h2></div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['fullName', 'Full name', 'Juan dela Cruz'], ['email', 'Email', 'juan@example.com'],
                  ['phone', 'Mobile number', '09XX XXX XXXX'], ['city', 'City / Municipality', 'Barbaza, Antique'],
                ].map(([name, label, placeholder]) => <label key={name} className="text-sm font-semibold text-[#0b1739]">{label}<input required name={name} value={form[name]} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} placeholder={placeholder} className={inputClass} /></label>)}
                <label className="text-sm font-semibold text-[#0b1739] sm:col-span-2">Street address<input required value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="House no., street, barangay" className={inputClass} /></label>
              </div>
            </section>

            <section className="rounded-xl border border-[#dfe7f4] bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2954C8] text-xs font-bold text-white">2</span><h2 className="font-bold text-[#0b1739]">Merchant payments</h2></div>
              {loadingQuote ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Preparing store options…</div> : (
                <div className="space-y-6">{quote.groups.map((group) => (
                  <div key={group.store_id} className="border-t border-slate-200 pt-5 first:border-t-0 first:pt-0">
                    <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#2954C8]">Merchant order</p><h3 className="mt-1 font-bold text-[#0b1739]">{group.store_name}</h3></div><p className="font-bold text-[#0b1739]">{formatPeso(group.total_amount)}</p></div>
                    <div className="mb-4 space-y-2 rounded-lg bg-[#f8fafd] p-3">{itemsForGroup(group).map((item) => <div key={item.variant.id} className="flex items-center gap-3 text-sm"><ProductThumbnail src={item.product.thumbnail_url} alt={item.product.title} className="h-10 w-10 rounded-md bg-white" /><span className="min-w-0 flex-1 truncate text-slate-700">{item.product.title}</span><span className="text-slate-500">× {item.quantity}</span></div>)}</div>
                    {group.payment_methods.length === 0 ? <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><p>This merchant has no active payment method. Remove these items or contact the merchant.</p></div> : (
                      <div className="grid gap-2 sm:grid-cols-2">{group.payment_methods.map((method) => {
                        const Icon = METHOD_ICONS[method.type] || Banknote;
                        const checked = Number(selectedMethods[group.store_id]) === Number(method.id);
                        return <label key={method.id} className={`flex min-h-[68px] cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${checked ? 'border-[#2954C8] bg-[#eef3fb]' : 'border-slate-200 hover:border-[#2954C8]/50'}`}><input type="radio" name={`payment-${group.store_id}`} value={method.id} checked={checked} onChange={() => setSelectedMethods((current) => ({ ...current, [group.store_id]: method.id }))} className="mt-1 accent-[#2954C8]" /><Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#2954C8]" /><span><span className="block text-sm font-semibold text-[#0b1739]">{method.label}</span><span className="mt-0.5 block text-xs text-slate-500">{['cod', 'cash_pickup'].includes(method.type) ? 'Pay when fulfilled' : 'Proof required after placing order'}</span></span></label>;
                      })}</div>
                    )}
                  </div>
                ))}</div>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-[110px]">
            <div className="rounded-xl border border-[#dfe7f4] bg-white p-5"><div className="flex items-center gap-2 border-b border-slate-100 pb-4"><ShieldCheck className="h-5 w-5 text-[#2954C8]" /><h2 className="font-bold text-[#0b1739]">Order summary</h2></div><div className="divide-y divide-slate-100">{quote.groups.map((group) => <div key={group.store_id} className="flex justify-between gap-3 py-3 text-sm"><span className="text-slate-600">{group.store_name}</span><span className="font-semibold text-slate-800">{formatPeso(group.total_amount)}</span></div>)}</div><div className="flex items-end justify-between border-t border-slate-200 pt-4"><span className="font-bold text-[#0b1739]">Grand total</span><span className="text-xl font-extrabold text-[#2954C8]">{formatPeso(quote.grand_total)}</span></div></div>
            <button type="submit" disabled={submitting || loadingQuote || quote.groups.some((group) => !selectedMethods[group.store_id])} className="min-h-12 w-full rounded-lg bg-[#2954C8] px-5 font-semibold text-white transition hover:bg-[#1f44a5] disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Creating merchant orders…' : `Place ${quote.groups.length || ''} order${quote.groups.length === 1 ? '' : 's'}`}</button>
            <p className="text-center text-xs leading-relaxed text-slate-500">Prepaid transfers are reviewed manually by each merchant. Uploading proof does not automatically mark an order as paid.</p>
          </aside>
        </div>
      </form>
    </>
  );
};

export default CheckoutPage;
