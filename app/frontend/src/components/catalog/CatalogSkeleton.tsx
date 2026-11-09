import { CATALOG_PAGE_SIZE } from '@tekcert/types';
import { cn, Skeleton } from '@tekcert/ui';
import type { CSSProperties, ReactNode } from 'react';

function Block({
  width,
  height,
  radius = 5,
  style,
}: {
  width: number | string;
  height: number;
  radius?: number;
  style?: CSSProperties;
}) {
  return <Skeleton style={{ flex: 'none', width, height, borderRadius: radius, ...style }} />;
}

/** A short block centred in the 26 px line a real line of small text takes. */
const TextLine = ({ width }: { width: number | string }) => (
  <Block width={width} height={14} style={{ marginBlock: 6 }} />
);

const PROVIDER_LABELS = ['78%', '36%', '58%', '42%', '56%', '66%', '40%', '70%', '46%', '82%'];
const SPECIALTY_LABELS = ['34%', '26%', '40%', '32%', '34%', '42%'];
const LEVEL_WIDTHS = [110, 88, 105, 69];
const MOBILE_CHIP_WIDTHS = [96, 72, 82, 110, 92];

/** Title widths per line; the third line only shows on the narrower desktop cards. */
const TITLES = [
  ['82%', '64%', '48%'],
  ['90%', '56%'],
  ['76%', '88%', '38%'],
  ['84%', '70%', '52%'],
  ['72%', '92%'],
  ['88%', '60%', '44%'],
];
const TAG_WIDTHS = [[58, 66], [100], [58, 66, 56], [60, 72]];

function FilterRow({ label }: { label: string }) {
  return (
    <div className="relative flex items-center gap-2.5 min-h-10 text-[14.5px] cursor-pointer">
      <Block width={20} height={20} />
      <Block width={8} height={8} radius={2} />
      <span className="flex-1">
        <Block width={label} height={14} />
      </span>
      <Block width={16} height={12} radius={4} />
    </div>
  );
}

function FilterGroup({ legend, children }: { legend: number; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1 min-w-0">
      <legend className="pb-2 text-ink3 type-overline">
        <Block width={legend} height={12} radius={4} style={{ marginBlock: 2 }} />
      </legend>
      {children}
    </fieldset>
  );
}

function CardSkeleton({ index }: { index: number }) {
  const title = TITLES[index % TITLES.length] ?? [];
  const tags = TAG_WIDTHS[index % TAG_WIDTHS.length] ?? [];
  return (
    <div className="flex flex-1 flex-col gap-3.5 p-5 border border-ln rounded-card bg-sf text-ink no-underline transition-[border-color,box-shadow] duration-150 hover:border-ln2 hover:shadow-[0_10px_28px_-14px_rgba(19,26,44,0.3)] max-md:gap-2.5 max-md:p-4">
      <span className="flex items-center justify-between gap-2">
        <Block width={index % 3 === 1 ? 72 : 92} height={24} radius={6} />
        <span className="max-md:hidden">
          <Block width={56} height={12} radius={4} />
        </span>
      </span>
      <span className="flex items-start justify-between gap-3 min-h-12.5 max-md:min-h-0">
        <span
          className={cn(
            'font-serif text-[21px] font-semibold leading-[1.2] max-md:text-[19px]',
            'flex flex-1 flex-col min-w-0',
          )}
        >
          {title.map((width, line) => (
            <span
              key={width}
              className={cn(
                'block h-[0.84em] my-[0.18em] rounded-[5px] bg-sf2',
                line === 2 && 'max-md:hidden',
              )}
              style={{ width }}
            />
          ))}
        </span>
        <Block width={48} height={48} radius={10} />
      </span>
      <span
        className={cn('flex flex-wrap items-center gap-3.5 text-ink2 text-[13px]', 'max-md:hidden')}
      >
        <TextLine width={88} />
        <TextLine width={68} />
      </span>
      <span className="flex flex-wrap gap-1.5">
        {tags.map((width, tag) => (
          <Block key={tag} width={width} height={24} radius={12} />
        ))}
      </span>
      <span
        className={cn(
          'flex items-center justify-between gap-2 mt-auto pt-3.5 border-t border-ln',
          'max-md:hidden',
        )}
      >
        {/* The count's larger serif figure makes this line 29 px tall. */}
        <Block width={132} height={14} style={{ marginBlock: 7.5 }} />
      </span>
      <span
        className={cn(
          'flex-wrap items-center gap-3 text-ink2 text-[12.5px] [&_strong]:text-ink',
          'hidden max-md:flex',
        )}
      >
        <TextLine width={58} />
        <TextLine width={60} />
        <TextLine width={82} />
        <TextLine width={52} />
      </span>
    </div>
  );
}

/**
 * Catalogue › loading: built from the real layout classes, so the filter column and the cards
 * take the same space as the page they stand in for.
 */
export function CatalogSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_248px] gap-8 items-start max-lg:grid-cols-[minmax(0,1fr)_220px] max-lg:gap-6 max-md:block',
        'animate-shimmer',
      )}
    >
      <div className="flex flex-col row-1 col-2 gap-6.5 max-md:hidden">
        <FilterGroup legend={68}>
          {PROVIDER_LABELS.map((label) => (
            <FilterRow key={label} label={label} />
          ))}
        </FilterGroup>
        <FilterGroup legend={138}>
          <div className="flex flex-wrap gap-1.5">
            {LEVEL_WIDTHS.map((width) => (
              <Block key={width} width={width} height={36} radius={18} />
            ))}
          </div>
        </FilterGroup>
        <FilterGroup legend={70}>
          {SPECIALTY_LABELS.map((label) => (
            <FilterRow key={label} label={label} />
          ))}
        </FilterGroup>
        <FilterGroup legend={138}>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((step) => (
              <Block key={step} width={40} height={40} radius={8} />
            ))}
          </div>
          <div className="mt-1.5 text-ink3 text-[13px]">
            <TextLine width={92} />
          </div>
        </FilterGroup>
      </div>

      <div className="flex flex-col gap-4.5 min-w-0 max-md:gap-3">
        <div className="flex gap-3">
          <Block width="auto" height={48} radius={10} style={{ flex: 1 }} />
          <div className="max-md:hidden">
            <Block width={181} height={48} radius={10} />
          </div>
        </div>
        <div className="hidden gap-2 -me-4 pe-4 overflow-x-auto [scrollbar-width:none] max-md:flex">
          {MOBILE_CHIP_WIDTHS.map((width) => (
            <Block key={width} width={width} height={40} radius={20} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2.5 min-h-9 max-md:min-h-0">
          <TextLine width={112} />
        </div>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4.5 focus:outline-none *:flex max-md:grid-cols-[minmax(0,1fr)] max-md:gap-2.5">
          {Array.from({ length: CATALOG_PAGE_SIZE }, (_, index) => (
            <li key={index}>
              <CardSkeleton index={index} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
