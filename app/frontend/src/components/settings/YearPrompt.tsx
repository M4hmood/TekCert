'use client';

import {
  type AcademicYearAnswer,
  type Group,
  GROUPS,
  type SavedEnrolment,
  type Settings,
  SettingsSchema,
  type Specialty,
  type SpecialtyCode,
} from '@tekcert/types';
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  RadioGroup,
  RadioGroupItem,
  RadioMark,
  SelectField,
  Toast,
} from '@tekcert/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { postJson, withSessionRefresh } from '@/lib/client-api';
import { snoozeYearPrompt } from '@/lib/preferences';
import { useToast } from '@/lib/use-toast';

type Choice = 'up' | 'repeat' | 'left';

export interface YearPromptProps {
  firstName: string;
  /** Last year's class. */
  enrolment: SavedEnrolment;
  specialties: Specialty[];
  /** "2027-28". */
  yearLabel: string;
  /** The shell opens it by itself when the year is due; Settings opens it from a button. */
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called with the new settings once the answer is saved. */
  onConfirmed?: (settings: Settings) => void;
}

/** How long the confirmation stays before the page reloads its data around it. */
const REFRESH_AFTER_MS = 2600;

/** What a student may answer, which depends on the year they were in. */
export function yearChoices(year: number): { value: Choice; label: string; hint: string }[] {
  const finalYear = year >= 5;
  return [
    finalYear
      ? { value: 'up', label: 'I graduated', hint: 'Your profile switches to alumni mode' }
      : {
          value: 'up',
          label: `I’m moving up to ING-${year + 1}`,
          hint: year + 1 === 4 ? 'Choose your specialty and group' : 'Choose your group',
        },
    { value: 'repeat', label: `I’m repeating ING-${year}`, hint: 'Your path and points are kept' },
    {
      value: 'left',
      label: 'I’m no longer at TEK-UP',
      hint: 'Your profile switches to alumni mode',
    },
  ];
}

/** The body the API expects for a choice; null while a specialty is still missing. */
export function yearAnswer(
  choice: Choice,
  enrolment: Pick<SavedEnrolment, 'year'>,
  group: Group,
  specialty: SpecialtyCode | null,
): AcademicYearAnswer | null {
  if (choice === 'repeat') return { status: 'repeating' };
  // After ING-5 there is no next year: graduating is leaving.
  if (choice === 'left' || enrolment.year >= 5) return { status: 'left' };
  if (enrolment.year + 1 !== 4) return { status: 'moving_up', group };
  return specialty ? { status: 'moving_up', group, specialty } : null;
}

/**
 * "Where are you this year?", asked from 1 September: a dialog on desktop, a sheet at the
 * bottom of the screen on phones (design/Parametres).
 */
export function YearPrompt({
  firstName,
  enrolment,
  specialties,
  yearLabel,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  onConfirmed,
}: YearPromptProps) {
  const router = useRouter();
  const { toast, show } = useToast();
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const open = controlledOpen ?? ownOpen;
  const setOpen = (next: boolean) => {
    setOwnOpen(next);
    onOpenChange?.(next);
  };
  const [choice, setChoice] = useState<Choice>('up');
  const [group, setGroup] = useState<Group>(enrolment.group);
  const [specialty, setSpecialty] = useState<SpecialtyCode | null>(
    enrolment.specialty ?? enrolment.targetSpecialty,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(refresh.current), []);

  const movingUp = choice === 'up' && enrolment.year < 5;
  const pickingSpecialty = movingUp && enrolment.year + 1 === 4;
  const answer = yearAnswer(choice, enrolment, group, specialty);
  const lastYear = `ING-${enrolment.year}${enrolment.specialty ? ` ${enrolment.specialty}` : ''}, group ${enrolment.group}`;

  const confirm = async () => {
    if (!answer) {
      setError('Choose your specialty to move up to ING-4.');
      return;
    }
    setError(null);
    setSaving(true);
    const result = await withSessionRefresh(() =>
      postJson('/me/academic-year', answer, SettingsSchema),
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.problem.detail ?? result.problem.title);
      return;
    }
    setOpen(false);
    show('Academic year confirmed');
    onConfirmed?.(result.data);
    // The class in the sidebar and on every screen comes from the server. Reloading it at once
    // would also remove this prompt, and the confirmation with it.
    refresh.current = setTimeout(() => router.refresh(), REFRESH_AFTER_MS);
  };

  const remindTomorrow = () => {
    snoozeYearPrompt();
    setOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="w-140 p-0 border-0 rounded-[18px] overflow-hidden max-md:top-auto max-md:w-full max-md:max-w-full max-md:mb-0 max-md:rounded-b-none max-md:rounded-t-[20px] max-md:data-[state=open]:slide-in-from-bottom"
        >
          <div className="flex flex-col gap-2 py-7 px-8 bg-hero text-hero-ink max-md:pt-3.5 max-md:px-5 max-md:pb-5.5">
            <span
              aria-hidden
              className="hidden self-center w-10 h-1 mb-2 rounded-[2px] bg-white/35 max-md:block"
            />
            <span className="font-mono text-[12px] font-medium tracking-[0.12em] uppercase text-gold-fill">
              {yearLabel} academic year
            </span>
            <DialogTitle className="font-serif text-[32px] font-medium leading-[1.1] max-md:text-[26px] max-md:leading-[1.15]">
              <span className="max-md:hidden">Welcome back, {firstName}</span>
              <span className="hidden max-md:inline">Where are you this year?</span>
            </DialogTitle>
            <p className="text-[15px] leading-[1.55] opacity-90 max-md:text-[14px]">
              Last year you were in {lastYear}.
              <span className="max-md:hidden"> Where are you this year?</span>
            </p>
          </div>

          <div className="flex flex-col gap-4.5 py-6 px-8 max-md:gap-3.5 max-md:pt-4.5 max-md:px-4 max-md:pb-6">
            <RadioGroup
              aria-label="Where you are this year"
              value={choice}
              onValueChange={(value) => {
                setChoice(value as Choice);
                setError(null);
              }}
              className="flex flex-col gap-2"
            >
              {yearChoices(enrolment.year).map((option) => (
                <RadioGroupItem
                  key={option.value}
                  value={option.value}
                  className="flex items-center gap-3.5 min-h-15 py-2.5 px-4 border-[1.5px] border-ln2 rounded-[12px] bg-sf text-ink data-[state=checked]:py-2.25 data-[state=checked]:px-3.75 data-[state=checked]:border-2 data-[state=checked]:border-pri data-[state=checked]:bg-pri-sf"
                >
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{option.label}</span>
                    <span className="text-ink3 text-[13px]">{option.hint}</span>
                  </span>
                  <RadioMark />
                </RadioGroupItem>
              ))}
            </RadioGroup>

            {movingUp && (
              <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                {pickingSpecialty && (
                  <SelectField
                    label="Specialty"
                    value={specialty ?? ''}
                    options={specialties.map((option) => ({
                      value: option.code,
                      label: `${option.code} · ${option.name}`,
                    }))}
                    onChange={(code) => {
                      setSpecialty(code as SpecialtyCode);
                      setError(null);
                    }}
                  />
                )}
                <SelectField
                  label={`Group in ING-${enrolment.year + 1}`}
                  value={group}
                  options={GROUPS.map((value) => ({ value, label: `Group ${value}` }))}
                  onChange={setGroup}
                />
              </div>
            )}

            {error && <Alert tone="error">{error}</Alert>}

            <div className="flex items-center justify-between gap-2 max-md:flex-col-reverse max-md:items-stretch">
              <Button variant="ghost" onClick={remindTomorrow} className="-ms-3 max-md:ms-0">
                Remind me tomorrow
              </Button>
              <Button disabled={saving} onClick={() => void confirm()} className="max-md:h-13">
                {saving ? 'Saving…' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {toast && <Toast key={toast.id} message={toast.message} tone={toast.tone} />}
    </>
  );
}
