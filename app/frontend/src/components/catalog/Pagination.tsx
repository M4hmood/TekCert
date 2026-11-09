'use client';

import { Icon } from '@tekcert/ui';

type PageItem = number | 'gap';

/** The first page, the last page and the current page's neighbours, with gaps between. */
export function pageItems(page: number, pageCount: number): PageItem[] {
  const items: PageItem[] = [];
  for (let n = 1; n <= pageCount; n += 1) {
    if (n === 1 || n === pageCount || Math.abs(n - page) <= 1) items.push(n);
    else if (items.at(-1) !== 'gap') items.push('gap');
  }
  return items;
}

export function Pagination({
  page,
  pageCount,
  first,
  last,
  total,
  onChange,
}: {
  page: number;
  pageCount: number;
  first: number;
  last: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 pt-1.5 max-md:justify-center"
    >
      <span className="text-ink2 text-[14px] max-md:hidden">
        {first}–{last} of {total}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="grid place-items-center min-w-10 h-10 px-1.5 border-[1.5px] border-ln2 rounded-[8px] bg-sf text-ink text-[14px] font-semibold cursor-pointer enabled:hover:border-pri disabled:bg-transparent disabled:text-ink3 disabled:opacity-55 disabled:cursor-default aria-[current=page]:border-pri aria-[current=page]:bg-pri aria-[current=page]:text-pri-ink aria-[current=page]:cursor-default max-md:min-w-11 max-md:h-11"
          aria-label="Previous page"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          <Icon name="chevron_left" size={20} />
        </button>
        <div className="flex items-center gap-1.5 max-md:hidden">
          {pageItems(page, pageCount).map((item, index) =>
            item === 'gap' ? (
              <span key={`gap-${index}`} className="min-w-6 text-ink3 text-center" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className="grid place-items-center min-w-10 h-10 px-1.5 border-[1.5px] border-ln2 rounded-[8px] bg-sf text-ink text-[14px] font-semibold cursor-pointer enabled:hover:border-pri disabled:bg-transparent disabled:text-ink3 disabled:opacity-55 disabled:cursor-default aria-[current=page]:border-pri aria-[current=page]:bg-pri aria-[current=page]:text-pri-ink aria-[current=page]:cursor-default max-md:min-w-11 max-md:h-11"
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => item !== page && onChange(item)}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <span className="hidden min-w-24 text-ink2 text-[14px] font-semibold text-center max-md:block">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          className="grid place-items-center min-w-10 h-10 px-1.5 border-[1.5px] border-ln2 rounded-[8px] bg-sf text-ink text-[14px] font-semibold cursor-pointer enabled:hover:border-pri disabled:bg-transparent disabled:text-ink3 disabled:opacity-55 disabled:cursor-default aria-[current=page]:border-pri aria-[current=page]:bg-pri aria-[current=page]:text-pri-ink aria-[current=page]:cursor-default max-md:min-w-11 max-md:h-11"
          aria-label="Next page"
          disabled={page === pageCount}
          onClick={() => onChange(page + 1)}
        >
          <Icon name="chevron_right" size={20} />
        </button>
      </div>
    </nav>
  );
}
