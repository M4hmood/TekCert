import Image from 'next/image';
import styles from './auth.module.css';

/** The 18 badges of the Connexion design, in three columns (files in public/badges). */
const COLUMNS = [
  [
    'aws-saa-c03.png',
    'cisco-ccna.png',
    'python-pcap.png',
    'ine-ewpt.svg',
    'azure-associate.png',
    'lf-cka.png',
  ],
  [
    'azure-fundamentals.png',
    'oracle-oca-java.png',
    'aws-dop-c02.png',
    'cisco-ccnp.png',
    'ine-ecppt.svg',
    'google-aad.png',
  ],
  [
    'ine-icca.png',
    'aws-clf-c02.png',
    'lf-ckad.png',
    'cisco-ccie.png',
    'python-pcep.png',
    'azure-expert.png',
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
