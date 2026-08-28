import React, { useMemo, useState } from 'react';
import { ArrowRightLeft, History, Loader2, PackagePlus } from 'lucide-react';
import {
  adjustProductInventory,
  convertProductUnit,
  fetchInventoryMovements,
  previewProductUnitConversion,
} from '../api/EcommerceApi';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from './ui/use-toast';

const quantity = (value) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 3 });

const InventoryManager = ({ product, units, onProductChange }) => {
  const { toast } = useToast();
  const [panel, setPanel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [adjustment, setAdjustment] = useState({ operation: 'add', quantity: '', reason: '' });
  const [conversion, setConversion] = useState({ base_unit_id: '', conversion_factor: '', reason: '' });
  const [preview, setPreview] = useState(null);
  const [movements, setMovements] = useState([]);
  const currentUnit = product?.base_unit;
  const targetUnit = useMemo(() => units.find((unit) => String(unit.id) === String(conversion.base_unit_id)), [conversion.base_unit_id, units]);
  const crossDimension = targetUnit && currentUnit && targetUnit.dimension !== currentUnit.dimension;
  const step = currentUnit?.is_fractional ? '0.001' : '1';

  const toggleHistory = async () => {
    if (panel === 'history') return setPanel(null);
    setPanel('history'); setBusy(true);
    try { setMovements(await fetchInventoryMovements(product.id)); }
    catch (error) { toast({ title: 'Unable to load inventory history', description: error.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const submitAdjustment = async () => {
    setBusy(true);
    try {
      const response = await adjustProductInventory(product.id, { ...adjustment, quantity: Number(adjustment.quantity) });
      onProductChange?.({ ...product, stock: response.stock });
      setAdjustment({ operation: 'add', quantity: '', reason: '' });
      toast({ title: 'Inventory updated', description: `New balance: ${quantity(response.stock)} ${currentUnit?.code || ''}` });
    } catch (error) { toast({ title: 'Inventory update failed', description: error.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const requestPreview = async () => {
    setBusy(true); setPreview(null);
    try {
      const response = await previewProductUnitConversion(product.id, {
        base_unit_id: Number(conversion.base_unit_id),
        conversion_factor: crossDimension ? Number(conversion.conversion_factor) : undefined,
      });
      setPreview(response.preview);
    } catch (error) { toast({ title: 'Cannot preview conversion', description: error.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const commitConversion = async () => {
    setBusy(true);
    try {
      const response = await convertProductUnit(product.id, {
        base_unit_id: Number(conversion.base_unit_id),
        conversion_factor: crossDimension ? Number(conversion.conversion_factor) : undefined,
        version: preview.version,
        reason: conversion.reason,
      });
      onProductChange?.({
        ...product,
        stock: preview.stock.after,
        low_stock_threshold: preview.low_stock_threshold.after,
        base_unit: response.product.base_unit || preview.to_unit,
        variants: preview.variants.map((item) => ({
          ...product.variants.find((variant) => variant.id === item.id), base_unit_quantity: item.after,
        })),
      });
      setPreview(null); setConversion({ base_unit_id: '', conversion_factor: '', reason: '' }); setPanel(null);
      toast({ title: 'Inventory unit converted' });
    } catch (error) { toast({ title: 'Conversion failed', description: error.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-xl border border-[#dfe7f4] bg-[#f8fafd] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h4 className="text-sm font-bold text-[#0b1739]">Inventory controls</h4><p className="mt-1 text-xs text-slate-500">{quantity(product.stock)} {currentUnit?.code || 'pc'} on hand</p></div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" className="min-h-11 gap-1.5" onClick={() => { setPanel(panel === 'adjust' ? null : 'adjust'); setPreview(null); }}><PackagePlus className="h-4 w-4" /> Adjust</Button>
          <Button type="button" size="sm" variant="outline" className="min-h-11 gap-1.5" onClick={() => { setPanel(panel === 'convert' ? null : 'convert'); setPreview(null); }}><ArrowRightLeft className="h-4 w-4" /> Change unit</Button>
          <Button type="button" size="sm" variant="outline" className="min-h-11 gap-1.5" onClick={toggleHistory}><History className="h-4 w-4" /> History</Button>
        </div>
      </div>

      {panel === 'adjust' && <div className="mt-4 space-y-3 border-t border-[#dfe7f4] pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">Adjustment type<select value={adjustment.operation} onChange={(event) => setAdjustment((value) => ({ ...value, operation: event.target.value }))} className="mt-1 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-base sm:text-sm"><option value="add">Restock (+)</option><option value="remove">Remove (-)</option><option value="set">Set corrected balance</option></select></label>
          <label className="text-xs font-semibold text-slate-600">Quantity ({currentUnit?.code})<Input className="mt-1 text-base sm:text-sm" type="number" min="0" step={step} value={adjustment.quantity} onChange={(event) => setAdjustment((value) => ({ ...value, quantity: event.target.value }))} /></label>
        </div>
        <label className="text-xs font-semibold text-slate-600">Reason<Input className="mt-1 text-base sm:text-sm" value={adjustment.reason} onChange={(event) => setAdjustment((value) => ({ ...value, reason: event.target.value }))} placeholder="Delivery, damage, physical count…" /></label>
        <p className="text-xs text-slate-500">Result: {quantity(adjustment.operation === 'set' ? adjustment.quantity : Number(product.stock) + (adjustment.operation === 'remove' ? -1 : 1) * Number(adjustment.quantity || 0))} {currentUnit?.code}</p>
        <Button type="button" className="min-h-11 bg-[#2954C8]" disabled={busy || !adjustment.quantity || adjustment.reason.trim().length < 3} onClick={submitAdjustment}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save adjustment</Button>
      </div>}

      {panel === 'convert' && <div className="mt-4 space-y-3 border-t border-[#dfe7f4] pt-4">
        <label className="text-xs font-semibold text-slate-600">New inventory unit<select value={conversion.base_unit_id} onChange={(event) => { setConversion((value) => ({ ...value, base_unit_id: event.target.value })); setPreview(null); }} className="mt-1 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-base sm:text-sm"><option value="">Choose a measured unit</option>{units.filter((unit) => unit.is_active && unit.id !== currentUnit?.id).map((unit) => <option key={unit.id} value={unit.id}>{unit.label} ({unit.code})</option>)}</select></label>
        {crossDimension && <label className="text-xs font-semibold text-slate-600">1 {currentUnit.code} equals how many {targetUnit.code}?<Input className="mt-1 text-base sm:text-sm" type="number" min="0.000001" step="0.000001" value={conversion.conversion_factor} onChange={(event) => { setConversion((value) => ({ ...value, conversion_factor: event.target.value })); setPreview(null); }} /></label>}
        <label className="text-xs font-semibold text-slate-600">Reason<Input className="mt-1 text-base sm:text-sm" value={conversion.reason} onChange={(event) => setConversion((value) => ({ ...value, reason: event.target.value }))} placeholder="Correcting legacy unit setup…" /></label>
        {!preview ? <Button type="button" variant="outline" className="min-h-11" disabled={busy || !targetUnit || (crossDimension && !conversion.conversion_factor)} onClick={requestPreview}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Preview conversion</Button> : <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"><p className="font-bold">Review every converted value</p><p>Stock: {quantity(preview.stock.before)} {preview.from_unit.code} → {quantity(preview.stock.after)} {preview.to_unit.code}</p><p>Low-stock alert: {quantity(preview.low_stock_threshold.before)} → {quantity(preview.low_stock_threshold.after)} {preview.to_unit.code}</p>{preview.variants.map((variant) => <p key={variant.id}>{variant.name}: {quantity(variant.before)} → {quantity(variant.after)} {preview.to_unit.code}</p>)}<Button type="button" className="min-h-11 bg-amber-700 hover:bg-amber-800" disabled={busy || conversion.reason.trim().length < 3} onClick={commitConversion}>Confirm conversion</Button></div>}
      </div>}

      {panel === 'history' && <div className="mt-4 max-h-64 space-y-2 overflow-y-auto border-t border-[#dfe7f4] pt-4">{busy ? <p className="text-xs text-slate-500">Loading history…</p> : movements.length === 0 ? <p className="text-xs text-slate-500">No movements recorded yet.</p> : movements.map((movement) => <div key={movement.id} className="flex items-start justify-between gap-3 rounded-lg bg-white p-3 text-xs"><div><p className="font-bold capitalize text-[#0b1739]">{movement.type.replaceAll('_', ' ')}</p><p className="mt-1 text-slate-500">{movement.reason || 'No reason'}{movement.order_id ? ` · Order #${movement.order_id}` : ''}</p><p className="mt-1 text-slate-400">{new Date(movement.created_at).toLocaleString()}</p></div><p className={`shrink-0 font-bold ${movement.quantity_delta < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{movement.quantity_delta > 0 ? '+' : ''}{quantity(movement.quantity_delta)} {movement.unit?.code}<br /><span className="font-normal text-slate-400">Balance {quantity(movement.balance_after)}</span></p></div>)}</div>}
    </section>
  );
};

export default InventoryManager;
