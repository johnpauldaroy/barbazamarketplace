import React, { useState } from 'react';
import { Check, ExternalLink, ShieldAlert, X } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';
import { openOrderPaymentProof, reviewMerchantOrderPayment } from '../api/EcommerceApi';

const MerchantPaymentReview = ({ order, onUpdated }) => {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState(false);
  const payLater = ['cod', 'cash_pickup'].includes(order.payment_method);
  const submission = order.payment_submission;
  const reviewable = payLater ? order.payment_status !== 'paid' : order.payment_status === 'under_review' && submission;

  const review = async (action) => {
    if (action === 'reject' && !reason.trim()) {
      toast({ title: 'Rejection reason required', variant: 'destructive' });
      return;
    }
    setWorking(true);
    try {
      await reviewMerchantOrderPayment(order.id, action, reason.trim());
      toast({ title: action === 'approve' ? 'Payment approved' : 'Payment rejected', variant: 'success' });
      setReason('');
      await onUpdated?.();
    } catch (error) {
      toast({ title: 'Unable to review payment', description: error?.message, variant: 'destructive' });
    } finally { setWorking(false); }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#2954C8]" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment verification</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{order.payment_method_label || order.payment_method}</p>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : order.payment_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{String(order.payment_status || 'unpaid').replace('_', ' ')}</span>
          </div>
          {submission && <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm"><p className="text-slate-500">Customer reference</p><p className="mt-1 break-all font-mono font-semibold text-slate-900">{submission.reference_number}</p>{submission.proof_available && <Button type="button" variant="outline" className="mt-3 min-h-11 gap-2" onClick={() => openOrderPaymentProof(order.id, submission.id)}><ExternalLink className="h-4 w-4" />Open proof image</Button>}</div>}
          {payLater && order.payment_status !== 'paid' && <p className="mt-3 text-sm text-slate-600">Approve only after cash has actually been collected.</p>}
          {!payLater && !submission && order.payment_status !== 'paid' && <p className="mt-3 text-sm text-slate-600">The customer has not submitted a payment proof yet.</p>}
          {reviewable && (
            <div className="mt-4 space-y-3">
              {!payLater && <textarea value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-20 w-full rounded-lg border border-slate-200 bg-white p-3 text-base outline-none focus:border-[#2954C8]" placeholder="Reason required only when rejecting" />}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" disabled={working} onClick={() => review('approve')} className="min-h-11 flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"><Check className="h-4 w-4" />{payLater ? 'Mark cash collected' : 'Approve payment'}</Button>
                {!payLater && <Button type="button" disabled={working} variant="outline" onClick={() => review('reject')} className="min-h-11 flex-1 gap-2 border-red-200 text-red-700 hover:bg-red-50"><X className="h-4 w-4" />Reject proof</Button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default MerchantPaymentReview;
