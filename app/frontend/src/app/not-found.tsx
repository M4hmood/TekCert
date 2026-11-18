import { NotFoundMessage } from '@/components/NotFoundMessage';

/** Unknown addresses: a page of its own, with no sidebar. */
export default function NotFound() {
  return (
    <main id="main" className="flex flex-col flex-1 min-h-dvh">
      <NotFoundMessage />
    </main>
  );
}
