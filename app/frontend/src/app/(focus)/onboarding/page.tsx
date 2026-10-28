import type { Metadata } from 'next';
import { Placeholder } from '@/components/Placeholder';

export const metadata: Metadata = { title: 'Onboarding' };

export default function OnboardingPage() {
  return (
    <Placeholder title="Welcome to TekCert" icon="school" arrives="Sprint 2">
      Tell us your year and specialty to get your recommended path. This screen is built in Sprint
      2.
    </Placeholder>
  );
}
