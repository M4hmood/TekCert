import { buttonClass, EmptyState } from '@tekcert/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Student not found' };

/** An unknown id, or a student who hasn't finished signing up: the same screen for both. */
export default function StudentNotFound() {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <EmptyState
        icon="person_off"
        title="This student can’t be found"
        action={
          <Link href="/community" className={buttonClass('secondary')}>
            Back to community
          </Link>
        }
      >
        The link may be wrong, or this student hasn&apos;t finished setting up their account.
      </EmptyState>
    </div>
  );
}
