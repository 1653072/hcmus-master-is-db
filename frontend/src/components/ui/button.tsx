import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-[#c88f42] text-white hover:bg-[#9b6a2d] shadow-sm',
        secondary: 'bg-[#f1ede5] text-[#201913] hover:bg-[#ece5d8]',
        outline: 'border border-[#e6dccd] bg-white hover:border-[#c88f42] hover:text-[#c88f42] text-zinc-800',
        ghost: 'hover:bg-[#ece5d8] text-zinc-700 hover:text-[#201913]',
        link: 'text-[#c88f42] underline-offset-4 hover:underline',
        error: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
        success: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm',
      },
      size: {
        sm: 'h-9 px-4 text-xs',
        md: 'h-11 px-6 text-sm',
        lg: 'h-14 px-8 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
