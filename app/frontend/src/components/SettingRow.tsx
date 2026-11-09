import type { ReactNode } from 'react';

export function SettingRow({
  title,
  meta,
  action,
}: {
  title: string;
  meta: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 px-5 py-4.5 border border-ln rounded-card bg-sf">
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="text-ink3 text-[13.5px]">{meta}</span>
      </span>
      {action}
    </div>
  );
}
