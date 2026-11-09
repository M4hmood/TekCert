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
import { cn, Icon } from '@tekcert/ui';
import { type CSSProperties, useId, useMemo, useState } from 'react';
import { ChoiceCard } from './ChoiceCard';
import { groupLabel, hueColour, providerLabel, SPECIALTY_SHORT_NAMES, YEAR_CARDS } from './copy';

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
      <div className="flex flex-col gap-2.5 max-md:gap-1.5">
        <span
          className={cn(
            'text-[12.5px] font-semibold tracking-[0.12em] uppercase max-md:text-[11.5px]',
            'text-gold',
          )}
        >
          Welcome, {firstName}
        </span>
        <StepHeading>Which year are you in?</StepHeading>
        <p className="text-ink2 text-[16.5px] max-md:text-[14.5px]">
          You’ll confirm your year at the start of each academic year.
        </p>
      </div>
      <div className="grid grid-cols-5 gap-3 max-onboarding:grid-cols-3 max-md:grid-cols-1 max-md:gap-2">
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
      <p className="flex items-center gap-2.5 py-3.5 px-4 rounded-[12px] bg-pri-sf text-pri text-[14.5px]">
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
          <div className="flex flex-col gap-2.5 max-md:gap-1.5">
            <StepHeading>What’s your specialty?</StepHeading>
            <p className="text-ink2 text-[16.5px] max-md:text-[14.5px]">
              You’ll follow its path by default. You can follow others too.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3.5 max-md:grid-cols-1 max-md:gap-2">
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
          <div className="flex flex-col gap-2.5 max-md:gap-1.5">
            <StepHeading>Which specialty are you aiming for?</StepHeading>
            <p className="text-ink2 text-[16.5px] max-md:text-[14.5px]">
              <span className="max-md:hidden">
                You’ll choose it officially when you enter ING-4. Until then, we’ll suggest its
                path.
              </span>
              <span className="hidden max-md:inline">You’ll confirm it when you enter ING-4.</span>
            </p>
          </div>
          <div className="grid grid-cols-4 gap-3 max-onboarding:grid-cols-3 max-md:grid-cols-1 max-md:gap-2">
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
        <p className="flex items-center gap-3.5 py-4 px-4.5 border border-ln rounded-[12px] bg-sf text-[15px] [&>:first-child]:text-ink3 max-md:flex-wrap max-md:gap-x-3 max-md:gap-y-2">
          <Icon name="groups" size={22} />
          <span>
            Your class: <strong>{classCode}</strong>
          </span>
          {classmates !== null && (
            <span className="ms-auto text-ink3 text-[13.5px]">
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
    <div className="flex flex-col gap-3" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="text-[14px] font-semibold">
        Your group in ING-{year}
      </span>
      <div className="flex gap-2.5 max-md:grid max-md:grid-cols-4 max-md:gap-2">
        {GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={group === g}
            className="h-(--touch-target) px-4.5 border-[1.5px] border-ln2 rounded-[22px] bg-sf text-ink text-[14.5px] font-semibold cursor-pointer aria-pressed:border-pri aria-pressed:bg-pri aria-pressed:text-pri-ink max-md:p-0 max-md:text-[14px]"
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
      <div className="flex flex-col gap-2.5 max-md:gap-1.5">
        <span
          className={cn(
            'text-[12.5px] font-semibold tracking-[0.12em] uppercase max-md:text-[11.5px]',
            'text-ink3',
          )}
        >
          Optional
        </span>
        <StepHeading>Do you already have certifications?</StepHeading>
        <p className="text-ink2 text-[16.5px] max-md:text-[14.5px]">
          They’ll show as “Unverified” until you upload proof.
        </p>
      </div>
      <div className="flex flex-col overflow-hidden border border-ln rounded-card bg-sf">
        <label className="flex items-center gap-2.5 h-14 px-4.5 border-b border-ln text-ink3 focus-within:shadow-[inset_0_0_0_2px_var(--focus)]">
          <Icon name="search" size={21} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a certification"
            aria-label="Search for a certification"
            className="flex-1 min-w-0 h-full px-0.5 border-none bg-transparent text-ink text-[15.5px] outline-none placeholder:text-ink3"
          />
          {selected.size > 0 && (
            <span
              className="text-pri text-[13.5px] font-semibold whitespace-nowrap"
              aria-live="polite"
            >
              {selected.size} selected
            </span>
          )}
        </label>
        <div className="max-h-[min(58vh,540px)] overflow-y-auto max-md:max-h-none">
          {visible.map((cert) => {
            const on = selected.has(cert.slug);
            return (
              <button
                key={cert.slug}
                type="button"
                aria-pressed={on}
                className="group/cert flex items-center gap-3.5 w-full min-h-14.5 px-4.5 border-b border-ln bg-sf text-ink text-start cursor-pointer last:border-b-0 aria-pressed:bg-pri-sf max-md:grid max-md:grid-cols-[auto_1fr_auto] max-md:gap-x-3 max-md:gap-y-1 max-md:px-3.5 max-md:py-2.5"
                onClick={() => onToggle(cert.slug)}
              >
                <span
                  className="grid place-items-center flex-none size-5.5 border-[1.5px] border-ln2 rounded-[6px] text-pri-ink group-aria-pressed/cert:border-pri group-aria-pressed/cert:bg-pri max-md:row-span-2"
                  aria-hidden
                >
                  {on && <Icon name="check" size={17} />}
                </span>
                <span
                  className="inline-flex flex-none items-center gap-1.75 w-27.5 h-6 px-2.25 overflow-hidden border border-ln2 rounded-[6px] text-ink2 text-[12px] font-semibold whitespace-nowrap max-md:w-auto max-md:justify-self-start"
                  style={
                    { '--provider': hueColour(cert.provider.hue, 0.66, 0.14) } as CSSProperties
                  }
                >
                  <span className="flex-none size-2 rounded-[2px] bg-(--provider)" aria-hidden />
                  {providerLabel(cert.provider)}
                </span>
                <span className="flex-1 text-[15px] font-semibold max-md:col-[2/4] max-md:text-[14.5px]">
                  {cert.name}
                </span>
                <span className="text-ink3 font-mono font-medium text-[12.5px] leading-[normal] max-md:row-1 max-md:col-3">
                  {cert.code}
                </span>
              </button>
            );
          })}
          {visible.length === 0 && (
            <p className="py-6 px-4.5 text-ink2 text-[15px]">
              No certification matches “{query.trim()}”.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/** Each step's h1 takes focus when the step changes, so screen readers announce it. */
export function StepHeading({ children }: { children: string }) {
  return (
    <h1
      className="font-serif text-[48px] font-medium tracking-[-0.02em] leading-[1.1] focus:outline-none max-md:text-[30px]"
      tabIndex={-1}
      data-step-heading
    >
      {children}
    </h1>
  );
}
