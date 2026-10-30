import { cx } from '@tekcert/ui';
import catalogStyles from '@/components/catalog/catalog.module.css';
import styles from './certification.module.css';

const block = (width: string, height: number, radius = 5) => (
  <span
    className={catalogStyles.skeletonBlock}
    style={{ width, height, borderRadius: radius }}
    aria-hidden
  />
);

/** The certification page's shape while it loads. */
export function CertificationSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <section className={cx(styles.band, catalogStyles.skeleton)}>
        {block('220px', 20)}
        <div className={styles.hero}>
          <div className={styles.identity}>
            {block('260px', 24, 6)}
            {block('80%', 48, 8)}
            {block('60%', 18)}
          </div>
          {block('100%', 160, 16)}
        </div>
        <div className={styles.tabs}>{block('360px', 40, 6)}</div>
      </section>
      <div className={cx(styles.column, catalogStyles.skeleton)} style={{ marginTop: 28 }}>
        {block('200px', 28)}
        {block('100%', 16)}
        {block('90%', 16)}
        {block('70%', 16)}
      </div>
    </div>
  );
}
