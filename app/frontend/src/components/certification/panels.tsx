import type { CertificationDetail, MyCertificationStatus } from '@tekcert/types';
import { Icon } from '@tekcert/ui';
import Link from 'next/link';
import styles from './certification.module.css';
import { examDuration, studyTime } from './format';

/** Server-rendered tab panels: Overview and Syllabus. */

export function OverviewPanel({
  cert,
  mine,
}: {
  cert: CertificationDetail;
  /** slug → my status, for the prerequisites. */
  mine: Record<string, MyCertificationStatus>;
}) {
  const weighted = cert.domains.every((d) => d.weightPct !== null);
  const facts: [string, string | null][] = [
    ['Duration', cert.facts.minutes ? examDuration(cert.facts.minutes, true) : null],
    ['Questions', cert.facts.questions ? String(cert.facts.questions) : null],
    ['Passing score', cert.facts.passingScore],
    ['Languages', cert.facts.languages],
    ['Delivery', cert.facts.delivery],
    [
      'Validity',
      cert.facts.validityYears
        ? `${cert.facts.validityYears} ${cert.facts.validityYears === 1 ? 'year' : 'years'}`
        : null,
    ],
  ];
  const shown = facts.filter((f): f is [string, string] => f[1] !== null);

  return (
    <div className={styles.overview}>
      <div className={styles.column}>
        <div className={styles.block}>
          <h2 className={styles.h2}>Description</h2>
          <p className={styles.prose}>{cert.description ?? cert.summary}</p>
        </div>

        <div className={styles.block}>
          <h2 className={styles.h2}>Domains assessed</h2>
          {weighted && (
            <div className={styles.weights} aria-hidden>
              {cert.domains.map((d, i) => (
                <span
                  key={d.order}
                  style={{ width: `${d.weightPct}%`, opacity: 1 - i * (0.7 / cert.domains.length) }}
                />
              ))}
            </div>
          )}
          <ul className={styles.domainList}>
            {cert.domains.map((d) => (
              <li key={d.order}>
                {d.order}. {d.title}
                {d.weightPct !== null && <strong>{d.weightPct}%</strong>}
              </li>
            ))}
          </ul>
        </div>

        {cert.prerequisites.length > 0 && (
          <div className={styles.block}>
            <h2 className={styles.h2}>Prerequisites</h2>
            {cert.prerequisites.map((p) => {
              const status = mine[p.slug];
              const note =
                status === 'unverified'
                  ? 'Recommended · you declared it, proof comes later'
                  : status === 'in_progress'
                    ? 'Recommended · you are preparing it'
                    : 'Recommended first';
              return (
                <Link key={p.slug} href={`/catalog/${p.slug}`} className={styles.prereq}>
                  <Icon
                    name={status ? 'check_circle' : 'info'}
                    size={22}
                    className={status ? styles.ok : styles.muted}
                  />
                  <span className={styles.prereqText}>
                    <span className={styles.prereqName}>
                      {p.name} ({p.code})
                    </span>
                    <span className={styles.small}>{note}</span>
                  </span>
                  <Icon name="chevron_right" size={20} className={styles.muted} />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {shown.length > 0 && (
        <div className={styles.column}>
          <div className={styles.factsCard}>
            <h3 className={styles.h3}>Exam format</h3>
            <dl className={styles.facts}>
              {shown.map(([term, value]) => (
                <div key={term} className={styles.factRow}>
                  <dt>{term}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

export function SyllabusPanel({ cert }: { cert: CertificationDetail }) {
  return (
    <div className={styles.syllabus}>
      <div className={styles.column}>
        <div className={styles.syllabusHead}>
          <h2 className={styles.h2}>Official syllabus</h2>
          <span className={styles.chapterCount}>
            <strong>{cert.chapterCount}</strong> chapters
          </span>
        </div>
        {cert.domains.map((d) => (
          <section key={d.order} className={styles.domain} aria-label={d.title}>
            <div className={styles.domainHead}>
              <span className={styles.domainTitle}>
                <span className={styles.domainLong}>
                  Domain {d.order} · {d.title}
                </span>
                <span className={styles.domainShort}>{d.shortTitle}</span>
              </span>
              <span className={styles.small}>
                {d.chapters.length} {d.chapters.length === 1 ? 'chapter' : 'chapters'}
                {d.weightPct !== null && ` · ${d.weightPct}%`}
              </span>
            </div>
            <ol className={styles.chapters}>
              {d.chapters.map((c) => (
                <li key={c.order} className={styles.chapter}>
                  <span className={styles.chapterNum}>{String(c.order).padStart(2, '0')}</span>
                  <span className={styles.chapterTitle}>{c.title}</span>
                  <span className={styles.small}>{studyTime(c.estimatedMinutes)}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <aside className={styles.sideNote}>
        <span className={styles.sideTitle}>How it works</span>
        <span className={styles.sideBody}>
          This is the official exam outline, split into chapters with a rough study time. Revise
          each one with the recommended resources. Ticking chapters and earning points arrive in the
          next update.
        </span>
      </aside>
    </div>
  );
}
