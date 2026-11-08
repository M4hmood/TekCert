import { CATALOG_PAGE_SIZE } from '@tekcert/types';
import { cx } from '@tekcert/ui';
import type { CSSProperties, ReactNode } from 'react';
import styles from './catalog.module.css';
import partStyles from './parts.module.css';

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
  return (
    <span
      className={styles.skeletonBlock}
      style={{ flex: 'none', width, height, borderRadius: radius, ...style }}
    />
  );
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
    <div className={styles.checkRow}>
      <Block width={20} height={20} />
      <Block width={8} height={8} radius={2} />
      <span className={styles.checkLabel}>
        <Block width={label} height={14} />
      </span>
      <Block width={16} height={12} radius={4} />
    </div>
  );
}

function FilterGroup({ legend, children }: { legend: number; children: ReactNode }) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>
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
    <div className={styles.card}>
      <span className={styles.cardTop}>
        <Block width={index % 3 === 1 ? 72 : 92} height={24} radius={6} />
        <span className={styles.desktopOnly}>
          <Block width={56} height={12} radius={4} />
        </span>
      </span>
      <span className={styles.cardTitleRow}>
        <span className={cx(styles.cardTitle, styles.skeletonTitle)}>
          {title.map((width, line) => (
            <span
              key={width}
              className={cx(styles.skeletonTitleLine, line === 2 && styles.skeletonDesktopLine)}
              style={{ width }}
            />
          ))}
        </span>
        <Block width={48} height={48} radius={10} />
      </span>
      <span className={cx(styles.meta, styles.desktopOnly)}>
        <TextLine width={88} />
        <TextLine width={68} />
      </span>
      <span className={partStyles.tags}>
        {tags.map((width, tag) => (
          <Block key={tag} width={width} height={24} radius={12} />
        ))}
      </span>
      <span className={cx(styles.cardFoot, styles.desktopOnly)}>
        {/* The count's larger serif figure makes this line 29 px tall. */}
        <Block width={132} height={14} style={{ marginBlock: 7.5 }} />
      </span>
      <span className={cx(styles.mobileMeta, styles.mobileOnly)}>
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
      className={cx(styles.layout, styles.skeleton)}
    >
      <div className={styles.filters}>
        <FilterGroup legend={68}>
          {PROVIDER_LABELS.map((label) => (
            <FilterRow key={label} label={label} />
          ))}
        </FilterGroup>
        <FilterGroup legend={138}>
          <div className={styles.toggles}>
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
          <div className={styles.difficulty}>
            {[1, 2, 3, 4, 5].map((step) => (
              <Block key={step} width={40} height={40} radius={8} />
            ))}
          </div>
          <div className={styles.hint}>
            <TextLine width={92} />
          </div>
        </FilterGroup>
      </div>

      <div className={styles.content}>
        <div className={styles.toolbar}>
          <Block width="auto" height={48} radius={10} style={{ flex: 1 }} />
          <div className={styles.desktopOnly}>
            <Block width={181} height={48} radius={10} />
          </div>
        </div>
        <div className={styles.mobileFilters}>
          {MOBILE_CHIP_WIDTHS.map((width) => (
            <Block key={width} width={width} height={40} radius={20} />
          ))}
        </div>
        <div className={styles.summary}>
          <TextLine width={112} />
        </div>
        <ul className={styles.grid}>
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
