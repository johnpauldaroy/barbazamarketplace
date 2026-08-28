import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowRight, Banknote, CheckCircle2, Clock3, Copy, QrCode, Store, Upload } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/use-toast';
import { submitOrderPaymentProof } from '../api/EcommerceApi';
import { formatPeso, resolveProductImage } from '../lib/marketplace';

const isPayLater = (order) => ['cod', 'cash_pickup'].includes(order.payment_method);

const OrderConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const initialOrders = useMemo(() => {
    const orders = location.state?.orders;
    if (Array.isArray(orders)) return orders.filter(Boolean);
    return location.state?.order ? [location.state.order] : [];
  }, [location.state]);
  const [orders, setOrders] = useState(initialOrders);
  const [proofForms, setProofForms] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const group = location.state?.orderGroup;

  const updateProofForm = (orderId, field, value) => setProofForms((current) => ({
    ...current,
    [orderId]: { ...(current[orderId] || {}), [field]: value },
  }));

  const copyText = async (value, label) => {
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied`, variant: 'success' });
  };

  const submitProof = async (order) => {
    const form = proofForms[order.id] || {};
    if (!form.referenceNumber?.trim() || !(form.proof instanceof File)) {
      toast({ title: 'Payment details required', description: 'Enter the transaction reference and choose a proof image.', variant: 'destructive' });
      return;
    }
    setSubmittingId(order.id);
    try {
      const response = await submitOrderPaymentProof(order.id, form);
      setOrders((current) => current.map((item) => item.id === order.id ? {
        ...item,
        payment_status: 'under_review',
        payment_reference: form.referenceNumber.trim(),
        payment_submission: response?.payment_submission,
      } : item));
      toast({ title: 'Proof submitted', description: `${order.store_name} will verify the payment in their receiving account.`, variant: 'success' });
    } catch (error) {
      toast({ title: 'Unable to submit proof', description: error?.message, variant: 'destructive' });
    } finally { setSubmittingId(null); }
  };

  if (orders.length === 0) {
    return <div className="flex min-h-[60vh] items-center justify-center bg-[#f4f7fd] px-4"><div className="text-center"><p className="mb-4 text-xl text-slate-600">No recent order found</p><Button onClick={() => navigate('/account')}>View my orders</Button></div></div>;
  }

  return (
    <div className="min-h-screen bg-[#f4f7fd] py-8">
      <Helmet><title>Orders placed — e-KoopMart</title></Helmet>
      <main className="mx-auto max-w-4xl px-4 sm:px-6">
        <header className="mb-7 rounded-xl border border-slate-200 bg-white p-6 sm:flex sm:items-center sm:justify-between">
          <div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50"><CheckCircle2 className="h-7 w-7 text-emerald-600" /></div><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Orders created</p><h1 className="mt-1 text-2xl font-bold text-[#0b1739]">Complete any prepaid transfers</h1><p className="mt-1 text-sm text-slate-500">Each merchant receives and verifies their own payment.</p></div></div>
          {group?.reference && <div className="mt-4 border-t border-slate-100 pt-4 text-sm sm:mt-0 sm:border-0 sm:pt-0 sm:text-right"><p className="text-xs text-slate-400">Checkout reference</p><p className="font-mono font-semibold text-slate-700">{group.reference.slice(0, 8).toUpperCase()}</p></div>}
        </header>

        <div className="space-y-5">
          {orders.map((order) => {
            const details = order.payment_details || {};
            const submitted = order.payment_status === 'under_review';
            return (
              <article key={order.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-xs font-bold uppercase tracking-wider text-[#2954C8]">{order.store_name || 'Merchant'}</p><h2 className="mt-1 text-lg font-bold text-[#0b1739]">Order #{order.id}</h2></div>
                  <div className="sm:text-right"><p className="text-xs text-slate-500">Amount for this merchant</p><p className="text-xl font-extrabold text-[#2954C8]">{formatPeso(order.total_amount)}</p></div>
                </div>

                {isPayLater(order) ? (
                  <div className="flex gap-4 p-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50"><Banknote className="h-5 w-5 text-amber-700" /></div><div><h3 className="font-semibold text-slate-900">{order.payment_method_label}</h3><p className="mt-1 text-sm leading-relaxed text-slate-600">{details.instructions || 'Payment will be collected when the order is fulfilled.'}</p><p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"><Clock3 className="h-3.5 w-3.5" /> Payment to collect</p></div></div>
                ) : submitted ? (
                  <div className="flex gap-4 p-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50"><Clock3 className="h-5 w-5 text-[#2954C8]" /></div><div><h3 className="font-semibold text-slate-900">Payment proof under review</h3><p className="mt-1 text-sm text-slate-600">Reference: <span className="font-mono font-semibold">{order.payment_reference}</span>. The merchant must confirm the funds before this order is marked paid.</p></div></div>
                ) : (
                  <div className="grid gap-6 p-5 md:grid-cols-[220px_1fr]">
                    <div>
                      {details.qr_image_url ? <img src={resolveProductImage(details.qr_image_url)} alt={`${order.store_name} payment QR`} className="aspect-square w-full rounded-lg border border-slate-200 object-contain p-2" /> : <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50"><QrCode className="h-14 w-14 text-slate-300" /></div>}
                      {details.qr_image_url && <p className="mt-2 text-center text-xs text-slate-500">Scan using a participating payment app</p>}
                    </div>
                    <div className="space-y-4">
                      <div><h3 className="font-bold text-slate-900">{order.payment_method_label}</h3><p className="mt-1 text-sm text-slate-600">{details.instructions || 'Send the exact order amount, then submit your transaction details below.'}</p></div>
                      <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                        {[['Account name', details.account_name], ['Provider', details.provider], ['Account / mobile', details.account_identifier], ['Exact amount', formatPeso(order.total_amount)]].filter(([, value]) => value).map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"><dt className="text-slate-500">{label}</dt><dd className="flex items-center gap-2 text-right font-semibold text-slate-800">{value}{label !== 'Provider' && <button type="button" onClick={() => copyText(String(value), label)} aria-label={`Copy ${label}`} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-[#2954C8]"><Copy className="h-3.5 w-3.5" /></button>}</dd></div>)}
                      </dl>
                      <label className="block text-sm font-semibold text-slate-700">Transaction reference <span className="text-red-600" aria-hidden="true">*</span><input required aria-required="true" value={proofForms[order.id]?.referenceNumber || ''} onChange={(event) => updateProofForm(order.id, 'referenceNumber', event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-base outline-none focus:border-[#2954C8]" placeholder="Required reference number" /></label>
                      <label className="block text-sm font-semibold text-slate-700">Payment proof image <span className="text-red-600" aria-hidden="true">*</span><input required type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => updateProofForm(order.id, 'proof', event.target.files?.[0] || null)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm" /></label>
                      <Button type="button" onClick={() => submitProof(order)} disabled={submittingId === order.id} className="min-h-11 w-full gap-2 bg-[#2954C8]"><Upload className="h-4 w-4" />{submittingId === order.id ? 'Submitting…' : 'Submit payment for review'}</Button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <footer className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end"><Button variant="outline" className="min-h-11" onClick={() => navigate('/account')}><Store className="mr-2 h-4 w-4" />View my orders</Button><Button className="min-h-11 bg-[#2954C8]" onClick={() => navigate('/products')}>Continue shopping <ArrowRight className="ml-2 h-4 w-4" /></Button></footer>
      </main>
    </div>
  );
};

export default OrderConfirmationPage;
