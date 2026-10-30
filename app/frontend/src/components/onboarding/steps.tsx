'use client';

import {
  type CertificationSummary,
  GROUPS,
  type Group,
  type SavedEnrolment,
  type SpecialtyCode,
  type SpecialtyOption,
  type Year,
} from '@tekcert/types';
import { cx, Icon } from '@tekcert/ui';
import { type CSSProperties, useId, useMemo, useState } from 'react';
import { ChoiceCard } from './ChoiceCard';
import { groupLabel, hueColour, providerLabel, SPECIALTY_SHORT_NAMES, YEAR_CARDS } from './copy';
import styles from './onboarding.module.css';

/** "Undecided" in ING-1…3: the student gets the Fundamentals path. */
export type Target = SpecialtyCode | 'undecided';

export function YearStep({
  firstName,
  year,
  onSelect,
}: {
  firstName: string;
  year: Year | null;
  onSelect: (year: Year) => void;
}) {
  return (
    <>
      <div className={styles.intro}>
        <span className={cx(styles.eyebrow, styles.gold)}>Welcome, {firstName}</span>
        <StepHeading>Which year are you in?</StepHeading>
        <p className={styles.lead}>You’ll confirm your year at the start of each academic year.</p>
      </div>
      <div className={styles.yearGrid}>
        {YEAR_CARDS.map((card) => (
          <ChoiceCard
            key={card.year}
            size="year"
            code={`ING-${card.year}`}
            title={card.title}
            description={card.description}
            selected={year === card.year}
            onSelect={() => onSelect(card.year)}
          />
        ))}
      </div>
      <p className={styles.note}>
        <Icon name="info" size={20} />
        Coming from a 3-year bachelor’s? Pick ING-3: you join the common core.
      </p>
    </>
  );
}

export interface EnrolmentStepProps {
  year: Year;
  specialties: SpecialtyOption[];
  specialty: SpecialtyCode | null;
  target: Target | null;
  group: Group | null;
  /** The enrolment saved on the server, for the classmates count. */
  saved: SavedEnrolment | null;
  onSpecialty: (code: SpecialtyCode) => void;
  onTarget: (target: Target) => void;
  onGroup: (group: Group) => void;
}

export function EnrolmentStep(props: EnrolmentStepProps) {
  const { year, specialties, specialty, group, saved } = props;
  const specialtyYear = year >= 4;
  const classCode =
    group &&
    (specialtyYear ? specialty && `ING-${year}-${specialty}-${group}` : `ING-${year}-${group}`);
  const classmates = saved && saved.classCode === classCode ? saved.classmates : null;

  return (
    <>
      {specialtyYear ? (
        <>
          <div className={styles.intro}>
            <StepHeading>What’s your specialty?</StepHeading>
            <p className={styles.lead}>
              You’ll follow its path by default. You can follow others too.
            </p>
          </div>
          <div className={styles.specialtyGrid}>
            {specialties.map((option) => (
              <ChoiceCard
                key={option.code}
                size="specialty"
                code={option.code}
                title={option.name}
                shortTitle={SPECIALTY_SHORT_NAMES[option.code]}
                description={
                  option.pathPreview.length > 0 && `Path: ${option.pathPreview.join(' → ')}`
                }
                colour={hueColour(option.hue)}
                selected={specialty === option.code}
                onSelect={() => props.onSpecialty(option.code)}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className={styles.intro}>
            <StepHeading>Which specialty are you aiming for?</StepHeading>
            <p className={styles.lead}>
              <span className={styles.wide}>
                You’ll choose it officially when you enter ING-4. Until then, we’ll suggest its
                path.
              </span>
              <span className={styles.narrow}>You’ll confirm it when you enter ING-4.</span>
            </p>
          </div>
          <div className={styles.targetGrid}>
            {specialties.map((option) => (
              <ChoiceCard
                key={option.code}
                size="target"
                code={option.code}
                title={option.name}
                shortTitle={SPECIALTY_SHORT_NAMES[option.code]}
                colour={hueColour(option.hue)}
                selected={props.target === option.code}
                onSelect={() => props.onTarget(option.code)}
              />
            ))}
            <ChoiceCard
              size="target"
              code="Undecided"
              title="Not decided yet · Fundamentals path"
              shortTitle="Not decided yet"
              dashed
              selected={props.target === 'undecided'}
              onSelect={() => props.onTarget('undecided')}
            />
          </div>
        </>
      )}

      <GroupPicker year={year} group={group} onGroup={props.onGroup} />

      {classCode && (
        <p className={styles.classBox}>
          <Icon name="groups" size={22} />
          <span>
            Your class: <strong>{classCode}</strong>
          </span>
          {classmates !== null && (
            <span className={styles.classMates}>
              {classmates} {classmates === 1 ? 'student' : 'students'} on TekCert
            </span>
          )}
        </p>
      )}
    </>
  );
}

function GroupPicker({
  year,
  group,
  onGroup,
}: {
  year: Year;
  group: Group | null;
  onGroup: (group: Group) => void;
}) {
  const labelId = useId();
  return (
    <div className={styles.groups} role="group" aria-labelledby={labelId}>
      <span id={labelId} className={styles.groupsLabel}>
        Your group in ING-{year}
      </span>
      <div className={styles.groupChips}>
        {GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={group === g}
            className={styles.chip}
            onClick={() => onGroup(g)}
          >
            {groupLabel(g)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CertificationsStep({
  certifications,
  selected,
  onToggle,
}: {
  certifications: CertificationSummary[];
  selected: ReadonlySet<string>;
  onToggle: (slug: string) => void;
}) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return certifications;
    return certifications.filter((cert) =>
      [cert.name, cert.code, cert.examCode ?? '', cert.provider.name]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [certifications, query]);

  return (
    <>
      <div className={styles.intro}>
        <span className={cx(styles.eyebrow, styles.muted)}>Optional</span>
        <StepHeading>Do you already have certifications?</StepHeading>
        <p className={styles.lead}>They’ll show as “Unverified” until you upload proof.</p>
      </div>
      <div className={styles.certList}>
        <label className={styles.search}>
          <Icon name="search" size={21} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a certification"
            aria-label="Search for a certification"
            className={styles.searchInput}
          />
          {selected.size > 0 && (
            <span className={styles.selectedCount} aria-live="polite">
              {selected.size} selected
            </span>
          )}
        </label>
        <div className={styles.certRows}>
          {visible.map((cert) => {
            const on = selected.has(cert.slug);
            return (
              <button
                key={cert.slug}
                type="button"
                aria-pressed={on}
                className={styles.certRow}
                onClick={() => onToggle(cert.slug)}
              >
                <span className={styles.tickBox} aria-hidden>
                  {on && <Icon name="check" size={17} />}
                </span>
                <span
                  className={styles.providerChip}
                  style={
                    { '--provider': hueColour(cert.provider.hue, 0.66, 0.14) } as CSSProperties
                  }
                >
                  <span className={styles.providerDot} aria-hidden />
                  {providerLabel(cert.provider)}
                </span>
                <span className={styles.certName}>{cert.name}</span>
                <span className={styles.certCode}>{cert.code}</span>
              </button>
            );
          })}
          {visible.length === 0 && (
            <p className={styles.empty}>No certification matches “{query.trim()}”.</p>
          )}
        </div>
      </div>
    </>
  );
}

/** Each step's h1 takes focus when the step changes, so screen readers announce it. */
export function StepHeading({ children }: { children: string }) {
  return (
    <h1 className={styles.title} tabIndex={-1} data-step-heading>
      {children}
    </h1>
  );
}
