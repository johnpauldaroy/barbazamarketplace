import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from './use-toast';

const toastVariantClasses = {
  default: 'border-slate-200 bg-white text-slate-900',
  destructive: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const Toaster = () => {
  const { toasts } = useToast();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={cn(
            'pointer-events-auto rounded-lg border p-4 shadow-md backdrop-blur-sm transition-all',
            toastVariantClasses[item.variant] || toastVariantClasses.default
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              {item.title ? <p className="text-sm font-semibold">{item.title}</p> : null}
              {item.description ? <p className="mt-1 text-sm opacity-90">{item.description}</p> : null}
            </div>
            <button
              type="button"
              className="rounded p-1 opacity-70 transition-opacity hover:opacity-100"
              onClick={item.dismiss}
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export { Toaster };
