import type { ReactNode } from 'react';

/**
 * A template mounts again on every navigation, unlike the layout: each screen of the app rises
 * in when it opens while the sidebar and the bottom bar stay put. It repeats the main column's
 * flex and gaps, since it now holds the page's blocks.
 */
export default function ShellTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-7 min-w-0 animate-page-enter max-md:gap-4">
      {children}
    </div>
  );
}
