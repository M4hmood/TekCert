'use client';

import { type DashboardNext, type DashboardPath, MyCertificationSchema } from '@tekcert/types';
import { buttonClass, cn, Icon } from '@tekcert/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LEVEL_LABELS } from '@/components/catalog/parts';
import { putJson, withSessionRefresh } from '@/lib/client-api';
import { prepTime } from './format';

/** Empty dashboard: the first certification of my path, with Start. */
export function StartCard({
  next,
  path,
}: {
  next: DashboardNext | null;
  path: DashboardPath | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pathName = path ? (path.kind === 'fundamentals' ? 'Fundamentals' : path.code) : null;

  const start = async () => {
    if (!next) return;
    setBusy(true);
    setError(null);
    const result = await withSessionRefresh(() =>
      putJson(`/me/preparations/${next.slug}`, {}, MyCertificationSchema),
    );
    if (result.ok) {
      // The dashboard is server-rendered: reload it, now with a current certification.
      router.refresh();
      return;
    }
    setBusy(false);
    setError(result.problem.detail ?? 'It could not be started. Try again.');
  };

  return (
    <section
      aria-label="Get started"
      className="flex flex-col gap-3.5 p-5.5 rounded-[16px] bg-hero text-hero-ink"
    >
      <span className="type-overline opacity-75">
        {pathName ? `Your path · ${pathName}` : 'Get started'}
      </span>
      {next ? (
        <>
          <span className="font-serif text-[26px] font-medium leading-[1.15]">
            Start with <em className="text-[#e2bc66]">{next.name}</em>
          </span>
          <span className="text-[14px] leading-normal opacity-85">
            {LEVEL_LABELS[next.level]} level · {next.chapterCount}{' '}
            {next.chapterCount === 1 ? 'chapter' : 'chapters'} · {prepTime(next.studyMinutes)}
          </span>
          <button
            type="button"
            onClick={start}
            disabled={busy}
            aria-busy={busy}
            className="flex items-center justify-center gap-2 h-12 border-none rounded-[10px] bg-gold-fill text-[#1a1406] text-[15px] font-semibold cursor-pointer disabled:opacity-70 disabled:cursor-progress"
          >
            <Icon name="play_arrow" size={20} />
            {busy ? 'Starting…' : 'Start'}
          </button>
          <Link
            href={`/catalog/${next.slug}`}
            className="self-center text-hero-ink text-[13.5px] font-semibold opacity-85"
          >
            See {next.code} first
          </Link>
        </>
      ) : (
        <>
          <span className="font-serif text-[26px] font-medium leading-[1.15]">
            Pick your first certification
          </span>
          <Link href="/catalog" className={cn(buttonClass('secondary'), 'justify-center')}>
            Browse the catalog
          </Link>
        </>
      )}
      {error && (
        <p role="alert" className="text-err-sf text-[13.5px]">
          {error}
        </p>
      )}
    </section>
  );
}
