import { Icon } from '@tekcert/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

/** The card every section sits in: its title, one line about it, then the controls. */
export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby="settings-section-title"
      className="flex flex-col gap-6 py-7 px-8 border border-ln rounded-[16px] bg-sf max-md:gap-5 max-md:p-4.5 max-md:rounded-[14px]"
    >
      {/* Phones open a section on its own page: this is the way back to the list. */}
      <Link
        href="/settings"
        className="hidden items-center gap-1.5 -mb-2 text-ink2 text-[14px] font-semibold no-underline max-md:flex"
      >
        <Icon name="arrow_back" size={19} />
        Settings
      </Link>
      <div className="flex flex-col gap-1.5">
        <h2
          id="settings-section-title"
          className="font-serif text-[28px] font-medium leading-[1.2] max-md:text-[24px]"
        >
          {title}
        </h2>
        <p className="text-ink2 text-[14.5px]">{description}</p>
      </div>
      {children}
    </section>
  );
}

/** A row of the Account section: what it is, one line about it, and its button. */
export function ActionRow({
  title,
  meta,
  action,
}: {
  title: string;
  meta: string;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 min-h-17 py-3 border-b border-ln last:border-b-0">
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="text-ink3 text-[13px]">{meta}</span>
      </span>
      {action}
    </div>
  );
}

/** A coloured note at the top of a section, with an optional button on the right. */
export function Notice({
  tone,
  icon,
  children,
  action,
}: {
  tone: 'warn' | 'info';
  icon: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-3 py-3.5 px-4 rounded-[12px] max-md:flex-wrap ${tone === 'warn' ? 'bg-warn-sf' : 'bg-pri-sf'}`}
    >
      <Icon
        name={icon}
        size={22}
        className={`flex-none self-start ${tone === 'warn' ? 'text-warn' : 'text-pri'}`}
      />
      <span className="flex-1 min-w-0 text-[14.5px] leading-[1.5]">{children}</span>
      {action}
    </div>
  );
}
