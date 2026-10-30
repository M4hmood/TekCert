import { CertificationListSchema, OnboardingStateSchema } from '@tekcert/types';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { apiGet } from '@/lib/api';
import { getAsStudent, getCurrentUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Welcome' };

type Props = { searchParams: Promise<{ step?: string | string[] }> };

export default async function OnboardingPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=%2Fonboarding');
  if (user.onboardingCompleted) redirect('/dashboard');

  const [state, catalog] = await Promise.all([
    getAsStudent('/onboarding', OnboardingStateSchema),
    apiGet('/certifications', CertificationListSchema),
  ]);
  // ?step= keeps reloads on the same step, but never past the furthest step saved.
  const { step } = await searchParams;
  const requested = Number(typeof step === 'string' ? step : NaN);
  const initialStep =
    Number.isInteger(requested) && requested >= 1 && requested <= state.step
      ? requested
      : state.step;

  return (
    <OnboardingWizard
      initialState={state}
      initialStep={initialStep}
      certifications={catalog.items}
    />
  );
}
