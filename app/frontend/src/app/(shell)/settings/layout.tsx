import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { SettingsNav } from '@/components/settings/SettingsNav';

export const metadata: Metadata = { title: 'Settings' };

/** Settings: the list of sections on the left, the open section on the right. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="Settings" overline="My space" />
      <div className="grid grid-cols-[220px_minmax(0,760px)] items-start gap-10 max-lg:grid-cols-[180px_minmax(0,1fr)] max-lg:gap-6 max-md:grid-cols-[minmax(0,1fr)] max-md:gap-0">
        <SettingsNav />
        {children}
      </div>
    </>
  );
}
