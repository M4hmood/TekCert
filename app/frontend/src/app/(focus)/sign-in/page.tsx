import type { Metadata } from 'next';
import { Placeholder } from '@/components/Placeholder';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <Placeholder title="Sign in" overline="TekCert · TEK-UP" icon="login" arrives="Sprint 1">
      Sign in with your @tek-up.de email. This screen is built in Sprint 1.
    </Placeholder>
  );
}
