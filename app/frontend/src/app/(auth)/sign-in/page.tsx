import type { Metadata } from 'next';
import { AuthTabs } from '@/components/auth/AuthTabs';
import { SignInForm } from '@/components/auth/SignInForm';

export const metadata: Metadata = { title: 'Sign in' };

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function SignInPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const target = typeof next === 'string' ? next : undefined;
  return (
    <>
      <AuthTabs active="sign-in" next={target} />
      <SignInForm next={target} />
    </>
  );
}
