'use client';

import { type CertificationResource, RESOURCE_KINDS, type ResourceKind } from '@tekcert/types';
import { cn, Icon } from '@tekcert/ui';
import { useState } from 'react';
import { RESOURCE_KIND } from './format';

/** External links, filterable by type. TekCert hosts no courses. */
export function ResourcesPanel({ resources }: { resources: CertificationResource[] }) {
  const [kind, setKind] = useState<ResourceKind | 'all'>('all');
  const shown = kind === 'all' ? resources : resources.filter((r) => r.kind === kind);
  const filters: { value: ResourceKind | 'all'; label: string; icon: string }[] = [
    { value: 'all', label: 'All', icon: 'apps' },
    ...RESOURCE_KINDS.map((k) => ({
      value: k,
      label: RESOURCE_KIND[k].filter,
      icon: RESOURCE_KIND[k].icon,
    })),
  ];

  return (
    <div className="flex flex-col gap-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="font-serif text-[28px] font-medium max-md:text-[23px]">
          Recommended resources
        </h2>
        <span className="flex items-center gap-1.5 text-ink3 text-[14px]">
          <Icon name="open_in_new" size={18} />
          External links · TekCert hosts no courses
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={kind === f.value}
            className={cn(
              'inline-flex items-center gap-1.5 h-9.5 px-3.5 border-[1.5px] border-ln2 rounded-[19px] bg-sf text-[13.5px] font-semibold cursor-pointer',
              kind === f.value && 'border-pri bg-pri text-pri-ink',
            )}
            onClick={() => setKind(f.value)}
          >
            <Icon name={f.icon} size={17} />
            {f.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="text-ink3 text-[14px]">No resources of this type yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3.5 max-md:grid-cols-[minmax(0,1fr)]">
          {shown.map((r) => (
            <li key={r.url + r.title}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 h-full py-4 px-4.5 border border-ln rounded-card bg-sf text-ink no-underline hover:border-ln2"
              >
                <span className="grid flex-none place-items-center size-11 rounded-[10px] bg-pri-sf text-pri">
                  <Icon name={RESOURCE_KIND[r.kind].icon} size={22} />
                </span>
                <span className="flex flex-1 flex-col gap-0.75 min-w-0">
                  <span className="text-[15px] font-semibold">{r.title}</span>
                  <span className="text-ink3 text-[13px]">
                    {[RESOURCE_KIND[r.kind].label, r.source, r.duration]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <Icon name="open_in_new" size={20} className="text-ink3" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
