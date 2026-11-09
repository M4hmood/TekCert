import type { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';

export interface PageHeaderProps {
  title: string;
  /** Small line above the title, e.g. the date or a section name. */
  overline?: string;
  /** Line under the title, e.g. "Every certification funded by TEK-UP…". Hidden on phones. */
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, overline, description, actions }: PageHeaderProps) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 gap-y-1.5 max-md:items-center">
      <div className="flex flex-col gap-1.5 min-w-0 max-md:gap-0.5">
        {overline && <span className="text-ink3 text-[14px] max-md:text-[13px]">{overline}</span>}
        <h1 className="font-serif text-[40px] font-medium tracking-heading leading-[1.15] max-md:text-[28px]">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <ThemeToggle />
      </div>
      {description && (
        <p className="col-span-full text-ink2 text-[15px] max-md:hidden">{description}</p>
      )}
    </header>
  );
}
