import React from 'react';
import { Plus, Star, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const ProductOptionsDraftEditor = ({ options, onChange, unitCode = 'pc', stock = 0, fractional = false }) => {
  const update = (index, field, value) => {
    onChange(options.map((option, optionIndex) => {
      if (field === 'is_default') return { ...option, is_default: optionIndex === index };
      return optionIndex === index ? { ...option, [field]: value } : option;
    }));
  };

  const add = () => onChange([...options, { name: '', base_unit_quantity: '1', price: '', is_default: false }]);
  const remove = (index) => {
    if (options.length === 1) return;
    const next = options.filter((_, optionIndex) => optionIndex !== index);
    if (!next.some((option) => option.is_default)) next[0] = { ...next[0], is_default: true };
    onChange(next);
  };

  return (
    <section className="space-y-3 rounded-xl border border-[#dfe7f4] bg-white p-4">
      <div>
        <h4 className="text-sm font-bold text-[#0b1739]">Selling options</h4>
        <p className="mt-1 text-xs text-slate-500">Each sale consumes a quantity from the shared {unitCode} stock pool.</p>
      </div>
      {options.map((option, index) => {
        const ratio = Number(option.base_unit_quantity || 0);
        const sellable = ratio > 0 ? Math.floor(Number(stock || 0) / ratio) : 0;
        return (
          <div key={index} className="space-y-2 rounded-xl border border-[#dfe7f4] bg-[#f8fafd] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-500">Option {index + 1}</span>
              <button type="button" disabled={options.length === 1} onClick={() => remove(index)} aria-label={`Remove option ${index + 1}`} className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <Input className="text-base sm:text-sm" value={option.name} onChange={(event) => update(index, 'name', event.target.value)} placeholder='Option name, e.g. "25kg Sack"' required />
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-500">{unitCode} consumed per sale
                <Input className="mt-1 text-base sm:text-sm" type="number" min={fractional ? '0.001' : '1'} step={fractional ? '0.001' : '1'} value={option.base_unit_quantity} onChange={(event) => update(index, 'base_unit_quantity', event.target.value)} required />
              </label>
              <label className="text-xs font-semibold text-slate-500">Selling price
                <Input className="mt-1 text-base sm:text-sm" type="number" min="0" step="0.01" value={option.price} onChange={(event) => update(index, 'price', event.target.value)} placeholder="0.00" required />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex min-h-11 items-center gap-2 text-xs font-semibold text-slate-600">
                <input type="radio" name="default-product-option" checked={!!option.is_default} onChange={() => update(index, 'is_default', true)} />
                <Star className="h-3.5 w-3.5 text-[#2954C8]" /> Default price
              </label>
              <span className="text-xs text-slate-500">{sellable} currently sellable</span>
            </div>
          </div>
        );
      })}
      <Button type="button" variant="outline" className="min-h-11 w-full gap-2" onClick={add}><Plus className="h-4 w-4" /> Add selling option</Button>
    </section>
  );
};

export default ProductOptionsDraftEditor;
