import { CertificationListSchema } from '@tekcert/types';
import Image from 'next/image';
import { type ReactNode, Suspense } from 'react';
import { AuthContent } from '@/components/auth/AuthContent';
import { AuthTabs } from '@/components/auth/AuthTabs';
import { BadgeWall } from '@/components/auth/BadgeWall';
import { ThemeToggle } from '@/components/ThemeToggle';
import { apiGet } from '@/lib/api';

/** Until verified certifications exist (Release 2), the hero shows the size of the funded catalog. */
async function catalogSize(): Promise<number | null> {
  try {
    return (await apiGet('/certifications', CertificationListSchema)).total;
  } catch {
    return null;
  }
}

/** design/Connexion.dc.html: hero panel with the badge wall, form column on the right. */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const total = await catalogSize();
  return (
    <div className="grid grid-cols-[minmax(420px,600px)_1fr] min-h-dvh max-lg:grid-cols-1">
      <aside className="flex flex-col justify-between gap-8 px-14 py-12 overflow-hidden bg-hero text-hero-ink max-lg:flex-row max-lg:flex-wrap max-lg:items-center max-lg:gap-5.5 max-lg:px-6 max-lg:pt-7 max-lg:pb-8">
        <span className="flex items-center gap-2.75 text-inherit no-underline">
          <Image
            src="/icons/tekcert.png"
            alt=""
            width={40}
            height={40}
            className="flex-none size-10 object-contain"
            priority
          />
          <span className="font-serif text-[23px] font-semibold">TekCert</span>
        </span>
        <div className="flex flex-col gap-7 max-lg:basis-full">
          <p className="font-serif text-[56px] font-medium tracking-[-0.02em] leading-[1.04] max-lg:text-[36px] max-lg:leading-[1.05] [&_em]:text-[#e2bc66]">
            Your class is moving ahead. <em>Join it.</em>
          </p>
          <BadgeWall />
        </div>
        {total !== null && (
          <span className="text-[14px] opacity-75 max-lg:hidden">
            {total} certifications funded by the institute.
          </span>
        )}
      </aside>
      <main id="main" className="flex flex-col px-12 py-8 max-lg:px-5 max-lg:pt-2 max-lg:pb-8">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-6 max-lg:items-start max-lg:pt-4 max-lg:pb-0">
          <div className="flex flex-col gap-7 w-[min(100%,420px)] max-lg:gap-5">
            {/* Tabs live here, not in the pages, so they stay mounted and the pill can slide. */}
            <Suspense>
              <AuthTabs />
            </Suspense>
            <AuthContent>{children}</AuthContent>
          </div>
        </div>
      </main>
    </div>
  );
}
