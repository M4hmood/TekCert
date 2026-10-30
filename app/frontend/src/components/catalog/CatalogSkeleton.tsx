import { cx } from '@tekcert/ui';
import styles from './catalog.module.css';

const block = (width: string, height: number, radius = 5) => (
  <span
    className={styles.skeletonBlock}
    style={{ width, height, borderRadius: radius }}
    aria-hidden
  />
);

/** Catalogue › loading: the toolbar and a few cards as grey shapes. */
export function CatalogSkeleton() {
  return (
    <div className={cx(styles.content, styles.skeleton)} aria-busy="true" aria-label="Loading">
      {block('100%', 48, 10)}
      <div className={styles.mobileOnly} style={{ gap: 8 }}>
        {block('96px', 40, 20)}
        {block('72px', 40, 20)}
        {block('110px', 40, 20)}
      </div>
      <ul className={styles.grid}>
        {['85%', '75%', '80%', '70%', '90%', '65%'].map((width) => (
          <li key={width}>
            <span className={styles.card}>
              {block('64px', 22, 6)}
              {block(width, 20)}
              {block('60%', 12, 4)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
