import type { Metadata } from 'next';
import { AuthTabs } from '@/components/auth/AuthTabs';
import { SignUpForm } from '@/components/auth/SignUpForm';

export const metadata: Metadata = { title: 'Create your account' };

export default function SignUpPage() {
  return (
    <>
      <AuthTabs active="sign-up" />
      <SignUpForm />
    </>
  );
}
