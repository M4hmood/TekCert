import type { ReactNode } from 'react';
import { Icon } from './Icon';

export interface EmptyStateProps {
  icon: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

/** Dashed card used when a screen or list has nothing to show (Catalogue "No certification matches"). */
export function EmptyState({ icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 px-6 border border-dashed border-ln2 rounded-card bg-sf text-center">
      <span className="grid place-items-center size-16 border-[1.5px] border-dashed border-ln2 rounded-full text-ink3">
        <Icon name={icon} size={30} />
      </span>
      <h2 className="font-serif text-[24px] font-semibold leading-[1.25]">{title}</h2>
      {children && <p className="max-w-95 text-ink2 text-[14.5px] leading-[1.55]">{children}</p>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}
