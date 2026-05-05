import type { ReactNode } from 'react';


import { cn } from '@/lib/utils';

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

export function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn('mx-auto w-full max-w-[1440px] px-6 md:px-12 lg:px-[6rem]', className)}>
      {children}
    </div>
  );
}
