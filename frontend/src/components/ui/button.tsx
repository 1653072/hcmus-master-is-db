import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-200 ease-out active:translate-y-px active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-ember text-white rounded-buttons hover:bg-coral-red shadow-none',
        secondary: 'bg-[var(--color-cta-light-bg)] text-midnight rounded-buttons hover:bg-stone-surface',
        outline: 'border border-graphite/25 bg-white text-graphite rounded-buttons hover:border-ember/50 hover:text-charcoal',
        ghost: 'bg-transparent rounded-none text-ember hover:text-ember/80 underline-offset-4 hover:underline',
        link: 'bg-transparent rounded-none text-ember underline-offset-4 hover:underline',
        error: 'bg-coral-red text-white rounded-pill hover:bg-coral-red/90 shadow-none',
        success: 'bg-meadow text-white rounded-pill hover:bg-meadow/90 shadow-none',
      },
      size: {
        sm: 'h-9 px-4 text-[13px]',
        md: 'h-11 px-5 text-[14px]',
        lg: 'h-[52px] px-7 text-[15px] font-medium',
        icon: 'h-10 w-10 rounded-icons',
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
