import React, { createContext, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const DialogContext = createContext({
  open: false,
  onOpenChange: () => {},
});

const Dialog = ({ children, open, onOpenChange }) => (
  <DialogContext.Provider value={useMemo(() => ({ open, onOpenChange }), [open, onOpenChange])}>
    {children}
  </DialogContext.Provider>
);

const DialogTrigger = ({ children, asChild = false }) => {
  const { onOpenChange } = useContext(DialogContext);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (event) => {
        children.props.onClick?.(event);
        onOpenChange(true);
      },
    });
  }

  return (
    <button type="button" onClick={() => onOpenChange(true)}>
      {children}
    </button>
  );
};

const DialogContent = ({ children, className = '' }) => {
  const { open, onOpenChange } = useContext(DialogContext);
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl',
          className
        )}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
};

const DialogHeader = ({ className = '', ...props }) => (
  <div className={cn('mb-4 flex flex-col gap-1.5 text-left', className)} {...props} />
);

const DialogTitle = ({ className = '', children, ...props }) => (
  <h2 className={cn('text-lg font-semibold text-slate-900', className)} {...props}>
    {children}
  </h2>
);

const DialogDescription = ({ className = '', ...props }) => (
  <p className={cn('text-sm text-slate-500', className)} {...props} />
);

const DialogFooter = ({ className = '', ...props }) => (
  <div className={cn('mt-4 flex justify-end gap-2', className)} {...props} />
);

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };
