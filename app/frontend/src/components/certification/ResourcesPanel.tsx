'use client';

import { type CertificationResource, RESOURCE_KINDS, type ResourceKind } from '@tekcert/types';
import { cx, Icon } from '@tekcert/ui';
import { useState } from 'react';
import styles from './certification.module.css';
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
    <div className={styles.column}>
      <div className={styles.resourcesHead}>
        <h2 className={styles.h2}>Recommended resources</h2>
        <span className={styles.external}>
          <Icon name="open_in_new" size={18} />
          External links · TekCert hosts no courses
        </span>
      </div>
      <div className={styles.kindFilters}>
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={kind === f.value}
            className={cx(styles.kindFilter, kind === f.value && styles.kindFilterOn)}
            onClick={() => setKind(f.value)}
          >
            <Icon name={f.icon} size={17} />
            {f.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className={styles.emptyLine}>No resources of this type yet.</p>
      ) : (
        <ul className={styles.resources}>
          {shown.map((r) => (
            <li key={r.url + r.title}>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className={styles.resource}>
                <span className={styles.resourceIcon}>
                  <Icon name={RESOURCE_KIND[r.kind].icon} size={22} />
                </span>
                <span className={styles.resourceText}>
                  <span className={styles.resourceTitle}>{r.title}</span>
                  <span className={styles.small}>
                    {[RESOURCE_KIND[r.kind].label, r.source, r.duration]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <Icon name="open_in_new" size={20} className={styles.muted} />
                <span className="visually-hidden">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
