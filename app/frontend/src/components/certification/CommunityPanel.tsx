'use client';

import {
  type CertificationCommunity,
  CertificationCommunitySchema,
  type CommunityList,
  type CommunityPerson,
  type CommunityQuery,
  type CommunityScope,
  SPECIALTY_CODES,
  YEARS,
} from '@tekcert/types';
import { cx, Icon } from '@tekcert/ui';
import { useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { StatusPill } from '@/components/catalog/parts';
import { getJson, withSessionRefresh } from '@/lib/client-api';
import styles from './certification.module.css';
import { monthYear } from './format';
import { communitySearch } from './tabs';

const SCOPES: { value: CommunityScope; label: string }[] = [
  { value: 'class', label: 'My class' },
  { value: 'specialty', label: 'My specialty' },
  { value: 'year', label: 'My level' },
  { value: 'institute', label: 'Whole institute' },
];

/** "Who to ask?": students who hold the certification and students preparing it. */
export function CommunityPanel({
  slug,
  initialQuery,
  initialData,
}: {
  slug: string;
  initialQuery: CommunityQuery;
  /** Null when the server could not load it; the panel then loads on its own. */
  initialData: CertificationCommunity | null;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(initialData === null);
  const latest = useRef(0);

  const load = async (next: CommunityQuery) => {
    setQuery(next);
    const url = new URL(window.location.href);
    for (const key of ['scope', 'specialty', 'year']) url.searchParams.delete(key);
    for (const [key, value] of new URLSearchParams(communitySearch(next))) {
      url.searchParams.set(key, value);
    }
    window.history.replaceState(null, '', url);

    const request = ++latest.current;
    setLoading(true);
    const search = communitySearch(next);
    const result = await withSessionRefresh(() =>
      getJson(
        `/certifications/${slug}/community${search ? `?${search}` : ''}`,
        CertificationCommunitySchema,
      ),
    );
    // A slower earlier answer must not replace a newer one.
    if (request !== latest.current) return;
    setLoading(false);
    setFailed(!result.ok);
    if (result.ok) setData(result.data);
  };

  const filtered = query.scope !== 'institute' || !!query.specialty || !!query.year;

  return (
    <div className={styles.column}>
      <div className={styles.block}>
        <h2 className={styles.h2}>Who to ask?</h2>
        <p className={styles.lead}>
          Students who hold it or are preparing it. Write to them at their institute email.
        </p>
      </div>
      <div className={styles.communityFilters}>
        <div role="radiogroup" aria-label="Scope" className={styles.segmented}>
          {SCOPES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={query.scope === s.value}
              className={cx(styles.segment, query.scope === s.value && styles.segmentOn)}
              onClick={() => load({ ...query, scope: s.value })}
            >
              {s.label}
            </button>
          ))}
        </div>
        <label className={styles.selectField}>
          <span className={styles.muted}>Specialty</span>
          <select
            value={query.specialty ?? ''}
            onChange={(e) => {
              const value = e.target.value as CommunityQuery['specialty'] | '';
              load({ ...query, specialty: value || undefined });
            }}
          >
            <option value="">All</option>
            {SPECIALTY_CODES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
            <option value="none">Not yet (ING-1 to 3)</option>
          </select>
        </label>
        <label className={styles.selectField}>
          <span className={styles.muted}>Level</span>
          <select
            value={query.year ?? ''}
            onChange={(e) => {
              const year = YEARS.find((y) => String(y) === e.target.value);
              load({ ...query, year });
            }}
          >
            <option value="">All</option>
            {YEARS.map((year) => (
              <option key={year} value={year}>
                ING-{year}
              </option>
            ))}
          </select>
        </label>
        {filtered && (
          <button
            type="button"
            className={styles.reset}
            onClick={() => load({ scope: 'institute' })}
          >
            Reset
          </button>
        )}
      </div>

      {failed && (
        <p role="alert" className={styles.statusError}>
          The list could not be loaded.{' '}
          <button type="button" className={styles.inlineButton} onClick={() => load(query)}>
            Try again
          </button>
        </p>
      )}

      {data && (
        <div className={cx(styles.lists, loading && styles.loading)} aria-busy={loading}>
          <PeopleList title="Earned it" list={data.earned} kind="earned" />
          <PeopleList title="Preparing it" list={data.preparing} kind="preparing" />
        </div>
      )}
    </div>
  );
}

function PeopleList({
  title,
  list,
  kind,
}: {
  title: string;
  list: CommunityList;
  kind: 'earned' | 'preparing';
}) {
  return (
    <section className={styles.people} aria-label={title}>
      <div className={styles.peopleHead}>
        <h3 className={styles.peopleTitle}>{title}</h3>
        <span className={styles.peopleCount}>{list.total}</span>
      </div>
      {list.items.length === 0 ? (
        <p className={styles.nobody}>Nobody for this filter yet.</p>
      ) : (
        <ul className={styles.peopleList}>
          {list.items.map((person) => (
            <PersonRow key={person.id} person={person} kind={kind} />
          ))}
        </ul>
      )}
      {list.total > list.items.length && (
        <p className={styles.small}>
          Showing the {list.items.length} most recent of {list.total}.
        </p>
      )}
    </section>
  );
}

function PersonRow({ person, kind }: { person: CommunityPerson; kind: 'earned' | 'preparing' }) {
  const name = `${person.firstName} ${person.lastName}`;
  return (
    <li className={styles.person}>
      <Avatar
        firstName={person.firstName}
        lastName={person.lastName}
        avatarPath={person.avatarPath}
        className={styles.personAvatar}
      />
      <span className={styles.personText}>
        <span className={styles.personName}>{name}</span>
        <span className={styles.small}>
          {person.classCode} ·{' '}
          {kind === 'earned' ? monthYear(person.since) : `started ${monthYear(person.since)}`}
        </span>
      </span>
      {kind === 'earned' && <StatusPill status="unverified" small />}
      <a
        href={`mailto:${person.email}`}
        className={styles.mail}
        aria-label={`Email ${name}`}
        title={person.email}
      >
        <Icon name="mail" size={20} />
      </a>
    </li>
  );
}
