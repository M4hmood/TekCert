import Image from 'next/image';
import styles from './auth.module.css';

/** Badges in three columns (files in public/badges). Only files that exist there are listed. */
const COLUMNS = [
  [
    'aws-saa-c03.webp',
    'cisco-ccna.webp',
    'ine-ewpt.svg',
    'azure-associate.webp',
    'lf-cka.webp',
    'pi-pcap.png',
  ],
  [
    'azure-fundamentals.webp',
    'aws-dva-c02.webp',
    'cisco-ccnp.webp',
    'ine-ecppt.svg',
    'aws-sap-c02.webp',
    'pi-pcep.png',
  ],
  [
    'ine-ejpt.svg',
    'aws-clf-c02.webp',
    'lf-ckad.png',
    'cisco-ccie.webp',
    'azure-expert.webp',
    'pi-pcpp.png',
  ],
];

/** Decorative: hidden from assistive technology, paused for reduced motion. */
export function BadgeWall() {
  return (
    <div className={styles.wall} aria-hidden>
      {COLUMNS.map((column, i) => (
        <div key={i} className={styles.wallColumn}>
          {/* Each column is listed twice so the scroll loops seamlessly. */}
          {[...column, ...column].map((file, j) => (
            <div key={j} className={styles.tile}>
              <Image src={`/badges/${file}`} alt="" width={76} height={76} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
