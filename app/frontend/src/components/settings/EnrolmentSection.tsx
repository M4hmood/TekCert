'use client';

import {
  type EnrolmentInput,
  type Group,
  GROUPS,
  type SavedEnrolment,
  type Settings,
  SettingsSchema,
  type SpecialtyCode,
  type Year,
  YEARS,
} from '@tekcert/types';
import { Button, RadioGroup, RadioGroupItem, SelectField, Toast } from '@tekcert/ui';
import { useRouter } from 'next/navigation';
import { type CSSProperties, useState } from 'react';
import { specialtyColor } from '@/components/catalog/parts';
import { putJson, withSessionRefresh } from '@/lib/client-api';
import { useToast } from '@/lib/use-toast';
import { Notice, SectionCard } from './parts';
import { YearPrompt } from './YearPrompt';

type EnrolmentProps = Pick<Settings, 'alumni' | 'academicYear' | 'specialties'> & {
  enrolment: SavedEnrolment;
  firstName: string;
};

/** "Undecided" in ING-1 to 3: the student follows the Fundamentals path. */
const UNDECIDED = 'undecided';
const CARD =
  'flex items-center gap-3 min-h-14 py-2.5 px-3.5 border-[1.5px] border-ln2 rounded-[12px] bg-sf text-ink data-[state=checked]:py-2.25 data-[state=checked]:px-3.25 data-[state=checked]:border-2 data-[state=checked]:border-pri data-[state=checked]:bg-pri-sf';

/** What Save sends; null while an ING-4/5 student hasn't picked a specialty. */
export function enrolmentInput(
  year: Year,
  group: Group,
  specialty: SpecialtyCode | null,
): EnrolmentInput | null {
  if (year >= 4) return specialty ? { year: year as 4 | 5, specialty, group } : null;
  return { year: year as 1 | 2 | 3, targetSpecialty: specialty, group };
}

/** "ING-4 CIM · group A", "ING-2 · group B". */
export function enrolmentLine(year: Year, group: Group, specialty: SpecialtyCode | null): string {
  return `ING-${year}${year >= 4 && specialty ? ` ${specialty}` : ''} · group ${group}`;
}

/** Year, group and specialty: they decide the recommended path, the class and the boards. */
export function EnrolmentSection(props: EnrolmentProps) {
  const router = useRouter();
  const { toast, show } = useToast();
  const [saved, setSaved] = useState(props.enrolment);
  const [alumni, setAlumni] = useState(props.alumni);
  const [due, setDue] = useState(props.academicYear.due);
  const [year, setYear] = useState<Year>(saved.year);
  const [group, setGroup] = useState<Group>(saved.group);
  const [specialty, setSpecialty] = useState<SpecialtyCode | null>(
    saved.specialty ?? saved.targetSpecialty,
  );
  const [saving, setSaving] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const specialtyYear = year >= 4;
  const input = enrolmentInput(year, group, specialty);

  /** After a save or the year prompt: the form shows what the server now holds. */
  const adopt = (settings: Settings) => {
    if (!settings.enrolment) return;
    setSaved(settings.enrolment);
    setAlumni(settings.alumni);
    setDue(settings.academicYear.due);
    setYear(settings.enrolment.year);
    setGroup(settings.enrolment.group);
    setSpecialty(settings.enrolment.specialty ?? settings.enrolment.targetSpecialty);
  };

  const save = async () => {
    if (!input) {
      show('Choose your specialty first.', { tone: 'error' });
      return;
    }
    setSaving(true);
    const result = await withSessionRefresh(() => putJson('/me/enrolment', input, SettingsSchema));
    setSaving(false);
    if (!result.ok) {
      show(result.problem.detail ?? 'Couldn’t save. Try again.', { tone: 'error' });
      return;
    }
    adopt(result.data);
    show('Enrolment saved');
    // The sidebar shows the class and is rendered on the server.
    router.refresh();
  };

  return (
    <SectionCard
      title="Enrolment"
      description="Sets your recommended path, and your class and specialty in the community and leaderboard."
    >
      {due && (
        <Notice
          tone="warn"
          icon="event_repeat"
          action={
            <Button size="sm" onClick={() => setPrompting(true)} className="bg-warn text-sf">
              Confirm
            </Button>
          }
        >
          <strong className="text-warn">
            {props.academicYear.label} academic year not confirmed
          </strong>
          <br />
          Check your year and group to stay in the right class.
        </Notice>
      )}
      {alumni && (
        <Notice tone="info" icon="school">
          <strong>You’re in alumni mode.</strong> You keep your profile and points, and you’re off
          the leaderboards. Save a class below if you’re back at TEK-UP.
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <SelectField
          label="Year"
          value={String(year)}
          options={YEARS.map((value) => ({ value: String(value), label: `ING-${value}` }))}
          onChange={(value) => setYear(Number(value) as Year)}
        />
        <SelectField
          label="Group"
          value={group}
          options={GROUPS.map((value) => ({ value, label: `Group ${value}` }))}
          onChange={setGroup}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span id="settings-specialty" className="text-[14px] font-semibold">
          {specialtyYear ? 'Specialty' : 'Specialty you’re aiming for'}
        </span>
        <RadioGroup
          aria-labelledby="settings-specialty"
          value={specialty ?? (specialtyYear ? '' : UNDECIDED)}
          onValueChange={(value) =>
            setSpecialty(value === UNDECIDED ? null : (value as SpecialtyCode))
          }
          className="grid grid-cols-2 gap-2 max-md:grid-cols-1"
        >
          {props.specialties.map((option) => (
            <RadioGroupItem
              key={option.code}
              value={option.code}
              style={{ '--spec': specialtyColor(option.code) } as CSSProperties}
              className={CARD}
            >
              <span aria-hidden className="flex-none size-3 rounded-full bg-(--spec)" />
              <span className="flex flex-col gap-px">
                <span className="text-[14.5px] font-semibold">{option.code}</span>
                <span className="text-ink3 text-[12.5px]">{option.name}</span>
              </span>
            </RadioGroupItem>
          ))}
          {!specialtyYear && (
            <RadioGroupItem value={UNDECIDED} className={`${CARD} border-dashed`}>
              <span
                aria-hidden
                className="flex-none size-3 border-[1.5px] border-dashed border-ink3 rounded-full"
              />
              <span className="flex flex-col gap-px">
                <span className="text-[14.5px] font-semibold">Undecided</span>
                <span className="text-ink3 text-[12.5px]">Fundamentals path</span>
              </span>
            </RadioGroupItem>
          )}
        </RadioGroup>
      </div>
      {!specialtyYear && (
        <Notice tone="info" icon="info">
          You choose your specialty in ING-4. Until then, your recommended path is{' '}
          <strong>{specialty ? `the ${specialty} path` : 'Fundamentals'}</strong>.
        </Notice>
      )}

      <div className="flex items-center justify-between gap-4 pt-4 border-t border-ln max-md:flex-col max-md:items-stretch">
        <span className="text-ink3 text-[13.5px]">{enrolmentLine(year, group, specialty)}</span>
        <Button disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      <YearPrompt
        firstName={props.firstName}
        // Last year's class, as it was when the page loaded: once answered, the prompt is over.
        enrolment={props.enrolment}
        specialties={props.specialties}
        yearLabel={props.academicYear.label}
        open={prompting}
        onOpenChange={setPrompting}
        onConfirmed={adopt}
      />
      {toast && <Toast key={toast.id} message={toast.message} tone={toast.tone} />}
    </SectionCard>
  );
}
