import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import {
  createProductVariant,
  deleteProductVariant,
  fetchProductVariants,
  updateProductVariant,
} from '../api/EcommerceApi';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from './ui/use-toast';

const emptyDraft = { name: '', base_unit_quantity: '1', price: '', is_default: false };

/**
 * Manage the ways a product is packaged and priced.
 *
 * Stock lives on the product and is counted in base units; each option records
 * how many base units one sale consumes, so a piece, a pack and a sack all draw
 * from the same pool. That ratio is the field merchants most often get wrong,
 * so every row spells it out in words.
 */
const ProductVariantsEditor = ({ productId, baseUnitCode = 'pc', stock = 0, onVariantsChange }) => {
  const { toast } = useToast();
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyDraft);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      setVariants(await fetchProductVariants(productId));
    } catch (error) {
      toast({
        title: 'Unable to load options',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [productId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const describeRatio = (quantity) => {
    const ratio = Number(quantity || 0);
    if (!ratio) return null;
    const sellable = Math.floor(Number(stock || 0) / ratio);
    return `${ratio} ${baseUnitCode} each · ${sellable} sellable`;
  };

  const handleCreate = async () => {
    if (!draft.name.trim()) {
      toast({ title: 'Name the option', description: 'For example "5kg Pack".', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const response = await createProductVariant(productId, {
        name: draft.name.trim(),
        base_unit_quantity: Number(draft.base_unit_quantity || 1),
        price: Number(draft.price || 0),
        is_default: draft.is_default,
      });
      const next = response?.variants || [];
      setVariants(next);
      onVariantsChange?.(next);
      setDraft(emptyDraft);
      toast({ title: 'Option added' });
    } catch (error) {
      toast({
        title: 'Unable to add option',
        description: error?.message || 'Check the values and try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (variant) => {
    setEditingId(variant.id);
    setEditDraft({
      name: variant.name,
      base_unit_quantity: String(variant.base_unit_quantity),
      price: String(variant.price),
      is_default: variant.is_default,
      is_active: variant.is_active,
    });
  };

  const handleUpdate = async (variantId) => {
    setSaving(true);
    try {
      const response = await updateProductVariant(productId, variantId, {
        name: editDraft.name.trim(),
        base_unit_quantity: Number(editDraft.base_unit_quantity || 1),
        price: Number(editDraft.price || 0),
        is_default: editDraft.is_default,
        is_active: editDraft.is_active,
      });
      const next = response?.variants || [];
      setVariants(next);
      onVariantsChange?.(next);
      setEditingId(null);
      toast({ title: 'Option updated' });
    } catch (error) {
      toast({
        title: 'Unable to update option',
        description: error?.message || 'Check the values and try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (variant) => {
    setSaving(true);
    try {
      const response = await deleteProductVariant(productId, variant.id);
      const next = response?.variants || [];
      setVariants(next);
      onVariantsChange?.(next);
      toast({ title: response?.message || 'Option removed' });
    } catch (error) {
      toast({
        title: 'Unable to remove option',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#dfe7f4] bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-bold text-[#0b1739]">Selling options</h4>
        <p className="text-xs text-slate-500">
          Stock: {Number(stock || 0)} {baseUnitCode}
        </p>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        All options share the same stock. Set how many {baseUnitCode} each one uses.
      </p>

      {loading ? (
        <p className="mt-4 text-xs text-slate-400">Loading options...</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {variants.map((variant) => (
            <li
              key={variant.id}
              className={`rounded-lg border p-3 ${
                variant.is_active ? 'border-[#dfe7f4] bg-[#f8fafd]' : 'border-dashed border-slate-300 bg-slate-50 opacity-70'
              }`}
            >
              {editingId === variant.id ? (
                <div className="space-y-2">
                  <Input
                    value={editDraft.name}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Option name"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-semibold text-slate-500">
                      {baseUnitCode} per option
                      <Input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={editDraft.base_unit_quantity}
                        onChange={(event) =>
                          setEditDraft((prev) => ({ ...prev, base_unit_quantity: event.target.value }))
                        }
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-500">
                      Price
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editDraft.price}
                        onChange={(event) => setEditDraft((prev) => ({ ...prev, price: event.target.value }))}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <label className="flex items-center gap-1.5 font-medium text-slate-600">
                      <input
                        type="checkbox"
                        checked={!!editDraft.is_default}
                        onChange={(event) => setEditDraft((prev) => ({ ...prev, is_default: event.target.checked }))}
                      />
                      Pre-selected
                    </label>
                    <label className="flex items-center gap-1.5 font-medium text-slate-600">
                      <input
                        type="checkbox"
                        checked={!!editDraft.is_active}
                        onChange={(event) => setEditDraft((prev) => ({ ...prev, is_active: event.target.checked }))}
                      />
                      Available
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5 bg-[#2954C8]"
                      disabled={saving}
                      onClick={() => handleUpdate(variant.id)}
                    >
                      <Check className="h-3.5 w-3.5" /> Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-[#0b1739]">{variant.name}</span>
                      {variant.is_default && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#eef3fb] px-2 py-0.5 text-[10px] font-bold text-[#2954C8]">
                          <Star className="h-2.5 w-2.5" /> Pre-selected
                        </span>
                      )}
                      {!variant.is_active && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      PHP {Number(variant.price).toLocaleString('en-US', { minimumFractionDigits: 2 })} ·{' '}
                      {describeRatio(variant.base_unit_quantity)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label={`Edit ${variant.name}`}
                      onClick={() => startEdit(variant)}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-[#eef3fb] hover:text-[#2954C8]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${variant.name}`}
                      disabled={saving}
                      onClick={() => handleDelete(variant)}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div
        className="mt-3 space-y-2 border-t border-[#dfe7f4] pt-3"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault();
            handleCreate();
          }
        }}
      >
        <Input
          value={draft.name}
          onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
          placeholder='New option, e.g. "25kg Sack"'
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-slate-500">
            {baseUnitCode} per option
            <Input
              type="number"
              step="0.001"
              min="0.001"
              value={draft.base_unit_quantity}
              onChange={(event) => setDraft((prev) => ({ ...prev, base_unit_quantity: event.target.value }))}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Price
            <Input
              type="number"
              step="0.01"
              min="0"
              value={draft.price}
              onChange={(event) => setDraft((prev) => ({ ...prev, price: event.target.value }))}
              placeholder="0.00"
            />
          </label>
        </div>
        {draft.base_unit_quantity && (
          <p className="text-xs text-slate-500">{describeRatio(draft.base_unit_quantity)}</p>
        )}
        <Button
          type="button"
          size="sm"
          className="w-full gap-1.5 bg-[#2954C8]"
          disabled={saving}
          onClick={handleCreate}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add option
        </Button>
      </div>
    </div>
  );
};

export default ProductVariantsEditor;
