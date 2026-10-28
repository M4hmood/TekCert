'use client';

import { Button } from '@tekcert/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { postJson } from '@/lib/client-api';

/** Ends the session on this device and returns to the sign-in page. */
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const signOut = async () => {
    setPending(true);
    await postJson('/auth/sign-out');
    router.replace('/sign-in');
    router.refresh();
  };

  return (
    <Button variant="secondary" icon="logout" onClick={signOut} disabled={pending}>
      {pending ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}
