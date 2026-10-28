import { TokenSchema } from '@tekcert/types';
import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = { title: 'Choose a new password' };

type Props = { searchParams: Promise<{ token?: string | string[] }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const valid = TokenSchema.safeParse(token);
  return <ResetPasswordForm token={valid.success ? valid.data : null} />;
}
