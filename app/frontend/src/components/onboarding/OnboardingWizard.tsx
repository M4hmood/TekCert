'use client';

import {
  type CertificationSummary,
  type EnrolmentInput,
  type Group,
  ONBOARDING_STEP,
  type OnboardingState,
  OnboardingStateSchema,
  type ProblemDetails,
  type RecommendedPath,
  RecommendedPathSchema,
  type SpecialtyCode,
  type Year,
} from '@tekcert/types';
import { Alert, Button, cx, Icon, IconButton } from '@tekcert/ui';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { type ApiResult, getJson, postJson, putJson, withSessionRefresh } from '@/lib/client-api';
import { groupLabel, stepLabel } from './copy';
import styles from './onboarding.module.css';
import { PhotoStep } from './PhotoStep';
import { ResultStep } from './ResultStep';
import { CertificationsStep, EnrolmentStep, type Target, YearStep } from './steps';

export interface OnboardingWizardProps {
  initialState: OnboardingState;
  /** Clamped by the page to a step the student has reached. */
  initialStep: number;
  certifications: CertificationSummary[];
}

const LAST_STEP = ONBOARDING_STEP.result;

/** design/Onboarding.dc.html: four steps, then the recommended path. */
export function OnboardingWizard({
  initialState,
  initialStep,
  certifications,
}: OnboardingWizardProps) {
  const router = useRouter();
  const saved = initialState.enrolment;

  const [state, setState] = useState(initialState);
  const [step, setStep] = useState(initialStep);
  const [year, setYear] = useState<Year | null>(saved?.year ?? null);
  const [specialty, setSpecialty] = useState<SpecialtyCode | null>(saved?.specialty ?? null);
  const [target, setTarget] = useState<Target | null>(
    saved && saved.year < 4 ? (saved.targetSpecialty ?? 'undecided') : null,
  );
  const [group, setGroup] = useState<Group | null>(saved?.group ?? null);
  const [slugs, setSlugs] = useState(() => new Set(initialState.certificationSlugs));
  const [leaderboardVisible, setLeaderboardVisible] = useState(initialState.leaderboardVisible);
  const [path, setPath] = useState<RecommendedPath | null>(null);
  const [pathFailed, setPathFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const main = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const specialtyYear = (year ?? 0) >= 4;
  const enrolment = enrolmentFrom(year, specialty, target, group);

  /** Moves to a step and records it in the URL, so Back and reload land on the same step. */
  const goTo = useCallback((next: number, push = true) => {
    setStep(next);
    setProblem(null);
    if (push) window.history.pushState(null, '', `/onboarding?step=${next}`);
  }, []);

  // The browser's Back and Forward buttons move between steps.
  useEffect(() => {
    const onPop = () => {
      const requested = Number(new URLSearchParams(window.location.search).get('step'));
      if (Number.isInteger(requested) && requested >= 1)
        goTo(Math.min(requested, LAST_STEP), false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [goTo]);

  // Focus the new step's heading (not on first load) so screen readers announce it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    main.current?.scrollTo?.({ top: 0 });
    main.current?.querySelector<HTMLElement>('[data-step-heading]')?.focus();
  }, [step]);

  // The result needs the saved answers; load it when the student reaches it.
  useEffect(() => {
    if (step !== LAST_STEP || path) return;
    let cancelled = false;
    withSessionRefresh(() => getJson('/me/recommended-path', RecommendedPathSchema))
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setPath(result.data);
        else setPathFailed(true);
      })
      // A response that doesn't match the contract.
      .catch(() => !cancelled && setPathFailed(true));
    return () => {
      cancelled = true;
    };
  }, [step, path]);

  /** Runs a save; on success keeps the returned state and moves on. */
  const save = async (request: () => Promise<ApiResult<OnboardingState>>, next: number) => {
    setSaving(true);
    setProblem(null);
    const result = await withSessionRefresh(request);
    setSaving(false);
    if (!result.ok) {
      setProblem(result.problem);
      return false;
    }
    setState(result.data);
    goTo(next);
    return true;
  };

  const saveCertifications = (picked: string[]) =>
    save(
      () => putJson('/onboarding/certifications', { slugs: picked }, OnboardingStateSchema),
      ONBOARDING_STEP.photo,
    );

  const savePrivacy = () => {
    setPath(null);
    setPathFailed(false);
    return save(
      () => putJson('/onboarding/privacy', { leaderboardVisible }, OnboardingStateSchema),
      ONBOARDING_STEP.result,
    );
  };

  const next = async () => {
    switch (step) {
      case ONBOARDING_STEP.year:
        goTo(ONBOARDING_STEP.enrolment);
        return;
      case ONBOARDING_STEP.enrolment:
        if (enrolment) {
          await save(
            () => putJson('/onboarding/enrolment', enrolment, OnboardingStateSchema),
            ONBOARDING_STEP.certifications,
          );
        }
        return;
      case ONBOARDING_STEP.certifications:
        await saveCertifications([...slugs]);
        return;
      case ONBOARDING_STEP.photo:
        await savePrivacy();
        return;
    }
  };

  const finish = async () => {
    setSaving(true);
    const result = await withSessionRefresh(() =>
      postJson('/onboarding/complete', {}, OnboardingStateSchema),
    );
    if (!result.ok) {
      setSaving(false);
      setProblem(result.problem);
      return;
    }
    router.replace('/dashboard');
    router.refresh();
  };

  const canContinue =
    step === ONBOARDING_STEP.year
      ? year !== null
      : step === ONBOARDING_STEP.enrolment
        ? !!enrolment
        : true;

  const continueLabel =
    step === ONBOARDING_STEP.enrolment && year && group
      ? { full: 'Continue', mobile: `Continue · ING-${year} ${groupLabel(group)}` }
      : { full: 'Continue', mobile: 'Continue' };

  return (
    <div className={styles.wizard}>
      <header className={styles.header}>
        <span className={styles.brand}>
          <Image src="/icons/tekcert.png" alt="" width={32} height={32} className={styles.logo} />
          <span className={styles.brandName}>TekCert</span>
        </span>
        <div className={styles.progress}>
          {step > 1 && (
            <IconButton
              icon="arrow_back"
              label="Back"
              className={styles.mobileBack}
              onClick={() => goTo(step - 1)}
              disabled={saving}
            />
          )}
          <span className={styles.stepLabel}>{stepLabel(step, specialtyYear)}</span>
          <span
            className={styles.segments}
            role="progressbar"
            aria-label="Onboarding progress"
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuenow={Math.min(step, 4)}
          >
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={cx(
                  styles.segment,
                  i <= step && styles.segmentOn,
                  step === LAST_STEP && styles.segmentDone,
                )}
              />
            ))}
          </span>
          {step < LAST_STEP && <span className={styles.stepCount}>{step}/4</span>}
        </div>
        <div className={styles.headerEnd}>
          <ThemeToggle />
        </div>
      </header>

      <div className={styles.body} ref={main}>
        <div className={styles.content}>
          {problem && (
            <Alert tone="error">
              <strong>{problem.title}.</strong> {problem.detail ?? 'Please try again.'}
            </Alert>
          )}

          {step === ONBOARDING_STEP.year && (
            <YearStep firstName={state.firstName} year={year} onSelect={setYear} />
          )}
          {step === ONBOARDING_STEP.enrolment && year && (
            <EnrolmentStep
              year={year}
              specialties={state.specialties}
              specialty={specialty}
              target={target}
              group={group}
              saved={state.enrolment}
              onSpecialty={setSpecialty}
              onTarget={setTarget}
              onGroup={setGroup}
            />
          )}
          {step === ONBOARDING_STEP.certifications && (
            <CertificationsStep
              certifications={certifications}
              selected={slugs}
              onToggle={(slug) =>
                setSlugs((current) => {
                  const updated = new Set(current);
                  if (!updated.delete(slug)) updated.add(slug);
                  return updated;
                })
              }
            />
          )}
          {step === ONBOARDING_STEP.photo && (
            <PhotoStep
              firstName={state.firstName}
              lastName={state.lastName}
              avatarPath={state.avatarPath}
              onAvatarChange={(avatarPath) => setState((s) => ({ ...s, avatarPath }))}
              leaderboardVisible={leaderboardVisible}
              onLeaderboardChange={setLeaderboardVisible}
              onLater={() => void savePrivacy()}
            />
          )}
          {step === LAST_STEP && <ResultStep path={path} failed={pathFailed} />}
        </div>
      </div>

      <footer className={styles.footer}>
        {step > 1 ? (
          <Button
            variant="ghost"
            icon="arrow_back"
            className={styles.back}
            onClick={() => goTo(step - 1)}
            disabled={saving}
          >
            Back
          </Button>
        ) : (
          <span />
        )}
        <div className={styles.footerEnd}>
          {step === ONBOARDING_STEP.certifications && (
            <Button
              variant="ghost"
              className={styles.skip}
              onClick={() => {
                setSlugs(new Set());
                void saveCertifications([]);
              }}
              disabled={saving}
            >
              Skip this step
            </Button>
          )}
          {step < LAST_STEP ? (
            <Button
              className={styles.primary}
              onClick={() => void next()}
              disabled={!canContinue || saving}
            >
              <span className={styles.wide}>{saving ? 'Saving…' : continueLabel.full}</span>
              <span className={styles.narrow}>{saving ? 'Saving…' : continueLabel.mobile}</span>
              <Icon name="arrow_forward" size={20} className={styles.wide} />
            </Button>
          ) : (
            <Button className={styles.primary} onClick={() => void finish()} disabled={saving}>
              Go to my dashboard
              <Icon name="arrow_forward" size={20} className={styles.wide} />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

function enrolmentFrom(
  year: Year | null,
  specialty: SpecialtyCode | null,
  target: Target | null,
  group: Group | null,
): EnrolmentInput | null {
  if (!year || !group) return null;
  if (year === 4 || year === 5) return specialty ? { year, specialty, group } : null;
  if (!target) return null;
  return { year, targetSpecialty: target === 'undecided' ? null : target, group };
}
