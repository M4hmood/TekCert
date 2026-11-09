import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'w-full min-w-0 h-12 px-3.5 border-[1.5px] border-ln2 rounded-field bg-sf text-[15.5px] outline-none focus:border-pri focus:shadow-[0_0_0_3px_var(--pri-sf)] aria-invalid:border-err placeholder:text-ink3',
        className,
      )}
      {...props}
    />
  );
}
