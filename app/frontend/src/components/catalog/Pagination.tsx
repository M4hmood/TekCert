'use client';

import { cx, Icon } from '@tekcert/ui';
import styles from './catalog.module.css';

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
    <nav aria-label="Pagination" className={styles.pagination}>
      <span className={styles.pageRange}>
        {first}–{last} of {total}
      </span>
      <div className={styles.pageControls}>
        <button
          type="button"
          className={styles.pageButton}
          aria-label="Previous page"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          <Icon name="chevron_left" size={20} />
        </button>
        <div className={styles.pageNumbers}>
          {pageItems(page, pageCount).map((item, index) =>
            item === 'gap' ? (
              <span key={`gap-${index}`} className={styles.pageGap} aria-hidden>
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={cx(styles.pageButton, item === page && styles.pageButtonOn)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => item !== page && onChange(item)}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <span className={styles.pageLabel}>
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          className={styles.pageButton}
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
