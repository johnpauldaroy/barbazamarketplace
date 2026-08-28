import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Landmark, Pencil, Plus, QrCode, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { useToast } from './ui/use-toast';
import {
  createMerchantPaymentMethod,
  deleteMerchantPaymentMethod,
  fetchMerchantPaymentMethods,
  updateMerchantPaymentMethod,
} from '../api/EcommerceApi';
import { resolveProductImage } from '../lib/marketplace';

const TYPE_OPTIONS = [
  { value: 'cod', label: 'Cash on Delivery', icon: Banknote, prepaid: false },
  { value: 'qrph', label: 'QR Ph', icon: QrCode, prepaid: true },
  { value: 'gcash', label: 'GCash manual transfer', icon: Smartphone, prepaid: true },
  { value: 'maya', label: 'Maya manual transfer', icon: Smartphone, prepaid: true },
  { value: 'bank_transfer', label: 'Bank transfer', icon: Landmark, prepaid: true },
  { value: 'cash_pickup', label: 'Cash on pickup', icon: Banknote, prepaid: false },
];

const emptyForm = (type = 'cod') => {
  const option = TYPE_OPTIONS.find((item) => item.value === type) || TYPE_OPTIONS[0];
  return {
    id: null,
    type,
    label: option.label,
    provider: '',
    account_name: '',
    account_identifier: '',
    instructions: '',
    is_enabled: true,
    requires_reference: option.prepaid,
    requires_proof: option.prepaid,
    qr_image: null,
    qr_image_url: '',
  };
};

const MerchantPaymentMethodsPanel = () => {
  const { toast } = useToast();
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const loadMethods = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchMerchantPaymentMethods();
      setMethods(Array.isArray(response?.payment_methods) ? response.payment_methods : []);
    } catch (error) {
      toast({ title: 'Unable to load payment methods', description: error?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadMethods(); }, [loadMethods]);

  const enabledCount = useMemo(() => methods.filter((method) => method.is_enabled).length, [methods]);

  const beginCreate = () => {
    setForm(emptyForm());
    setOpen(true);
  };

  const beginEdit = (method) => {
    setForm({ ...emptyForm(method.type), ...method, qr_image: null });
    setOpen(true);
  };

  const changeType = (type) => {
    const next = emptyForm(type);
    setForm((current) => ({ ...current, ...next, id: current.id, qr_image_url: current.qr_image_url }));
  };

  const saveMethod = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        label: form.label.trim(),
        provider: form.provider.trim() || undefined,
        account_name: form.account_name.trim() || undefined,
        account_identifier: form.account_identifier.trim() || undefined,
        instructions: form.instructions.trim() || undefined,
        is_enabled: form.is_enabled ? 1 : 0,
        requires_reference: form.requires_reference ? 1 : 0,
        requires_proof: form.requires_proof ? 1 : 0,
        qr_image: form.qr_image || undefined,
      };
      if (form.id) await updateMerchantPaymentMethod(form.id, payload);
      else await createMerchantPaymentMethod(payload);
      setOpen(false);
      await loadMethods();
      toast({ title: form.id ? 'Payment method updated' : 'Payment method added', variant: 'success' });
    } catch (error) {
      toast({ title: 'Unable to save payment method', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleMethod = async (method) => {
    try {
      await updateMerchantPaymentMethod(method.id, { is_enabled: method.is_enabled ? 0 : 1 });
      await loadMethods();
    } catch (error) {
      toast({ title: 'Unable to change availability', description: error?.message, variant: 'destructive' });
    }
  };

  const removeMethod = async (method) => {
    if (!window.confirm(`Remove ${method.label}? Existing orders will keep their payment details.`)) return;
    try {
      await deleteMerchantPaymentMethod(method.id);
      await loadMethods();
      toast({ title: 'Payment method removed', variant: 'success' });
    } catch (error) {
      toast({ title: 'Unable to remove payment method', description: error?.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#2954C8]" />
              <CardTitle className="text-lg">Customer payments</CardTitle>
            </div>
            <CardDescription className="mt-1 max-w-2xl">
              These are the choices customers see for your store. You remain responsible for confirming funds in your receiving account.
            </CardDescription>
          </div>
          <Button type="button" onClick={beginCreate} className="min-h-11 gap-2 bg-[#2954C8]">
            <Plus className="h-4 w-4" /> Add method
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between border-y border-slate-100 py-3 text-sm">
            <span className="text-slate-500">Checkout availability</span>
            <span className="font-semibold text-slate-800">{enabledCount} active</span>
          </div>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading payment methods…</p>
          ) : methods.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <p className="font-semibold text-slate-800">No payment methods configured</p>
              <p className="mt-1 text-sm text-slate-500">Add at least one method before accepting checkout orders.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {methods.map((method) => {
                const option = TYPE_OPTIONS.find((item) => item.value === method.type) || TYPE_OPTIONS[0];
                const Icon = option.icon;
                return (
                  <div key={method.id} className="grid gap-3 py-4 sm:grid-cols-[44px_1fr_auto] sm:items-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                      <Icon className="h-5 w-5 text-[#2954C8]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{method.label}</p>
                        <Badge variant={method.is_enabled ? 'success' : 'outline'}>{method.is_enabled ? 'Active' : 'Hidden'}</Badge>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {[method.provider, method.account_name, method.account_identifier].filter(Boolean).join(' · ') || option.label}
                      </p>
                    </div>
                    <div className="flex gap-2 sm:justify-end">
                      <Button type="button" variant="outline" className="min-h-11 flex-1 sm:flex-none" onClick={() => toggleMethod(method)}>
                        {method.is_enabled ? 'Hide' : 'Enable'}
                      </Button>
                      <Button type="button" variant="outline" size="icon" className="h-11 w-11" aria-label={`Edit ${method.label}`} onClick={() => beginEdit(method)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="icon" className="h-11 w-11 text-red-600" aria-label={`Remove ${method.label}`} onClick={() => removeMethod(method)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <form onSubmit={saveMethod}>
            <DialogHeader>
              <DialogTitle>{form.id ? 'Edit payment method' : 'Add payment method'}</DialogTitle>
              <DialogDescription>Use the exact account details customers should verify before sending funds.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-5">
              <label className="block text-sm font-semibold text-slate-700">
                Type
                <select value={form.type} onChange={(event) => changeType(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#2954C8]">
                  {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Customer-facing label
                <Input required value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} className="mt-1.5 min-h-11 text-base" />
              </label>
              {!['cod', 'cash_pickup'].includes(form.type) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Provider or bank
                    <Input value={form.provider} onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value }))} className="mt-1.5 min-h-11 text-base" placeholder="e.g. GCash" />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Account name
                    <Input value={form.account_name} onChange={(event) => setForm((current) => ({ ...current, account_name: event.target.value }))} className="mt-1.5 min-h-11 text-base" />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
                    Account number or mobile number
                    <Input value={form.account_identifier} onChange={(event) => setForm((current) => ({ ...current, account_identifier: event.target.value }))} className="mt-1.5 min-h-11 text-base" />
                  </label>
                </div>
              )}
              {form.type === 'qrph' && (
                <label className="block text-sm font-semibold text-slate-700">
                  Official QR Ph merchant image
                  <input type="file" accept="image/png,image/jpeg,image/webp" required={!form.qr_image_url} onChange={(event) => setForm((current) => ({ ...current, qr_image: event.target.files?.[0] || null }))} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm" />
                  {form.qr_image_url && <img src={resolveProductImage(form.qr_image_url)} alt="Current merchant QR" className="mt-3 h-28 w-28 rounded-lg border border-slate-200 object-contain p-1" />}
                </label>
              )}
              <label className="block text-sm font-semibold text-slate-700">
                Customer instructions
                <textarea value={form.instructions} onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} className="mt-1.5 min-h-24 w-full rounded-lg border border-slate-200 p-3 text-base outline-none focus:border-[#2954C8]" placeholder="When and how should the customer pay?" />
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={form.is_enabled} onChange={(event) => setForm((current) => ({ ...current, is_enabled: event.target.checked }))} className="h-5 w-5 accent-[#2954C8]" />
                Show this method during checkout
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="min-h-11 bg-[#2954C8]" disabled={saving}>{saving ? 'Saving…' : 'Save payment method'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MerchantPaymentMethodsPanel;
