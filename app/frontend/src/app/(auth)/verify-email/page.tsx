import { TokenSchema } from '@tekcert/types';
import type { Metadata } from 'next';
import { VerifyEmail } from '@/components/auth/VerifyEmail';

export const metadata: Metadata = { title: 'Confirm your address' };

type Props = { searchParams: Promise<{ token?: string | string[] }> };

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const valid = TokenSchema.safeParse(token);
  return <VerifyEmail token={valid.success ? valid.data : null} />;
}
