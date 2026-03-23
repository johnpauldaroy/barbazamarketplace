import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#2954C8] text-white shadow-[0_10px_24px_rgba(41,84,200,0.28)] hover:-translate-y-0.5 hover:bg-[#1F43B0] focus-visible:ring-[#2954C8]',
        destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
        outline: 'border border-[#d7e2f1] bg-white text-slate-800 shadow-sm hover:border-[#2954C8] hover:bg-[#f6f9ff] focus-visible:ring-[#2954C8]',
        secondary: 'bg-[#eef5ff] text-[#2954C8] hover:bg-[#dbe9ff] focus-visible:ring-[#2954C8]',
        ghost: 'text-slate-700 hover:bg-[#eef5ff] focus-visible:ring-[#2954C8]',
        link: 'text-[#2954C8] underline-offset-4 hover:underline focus-visible:ring-[#2954C8]',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-12 rounded-xl px-8',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      {...props}
    />
  )
);

Button.displayName = 'Button';

export { Button, buttonVariants };

