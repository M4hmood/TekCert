import { buttonClass, Icon } from '@tekcert/ui';
import Link from 'next/link';
import { StatusScreen } from '@/components/StatusScreen';

/** Unknown addresses, and pages that call notFound() (inside the shell, next to the sidebar). */
export default function NotFound() {
  return (
    <main id="main" className="flex flex-col flex-1 min-h-dvh">
      <StatusScreen
        icon="link_off"
        eyebrow="Error 404"
        title="This page doesn’t exist"
        actions={
          <>
            <Link href="/dashboard" className={buttonClass('primary')}>
              Back to the dashboard
            </Link>
            <Link href="/catalog" className={buttonClass('secondary')}>
              <Icon name="menu_book" size={18} />
              Browse the catalog
            </Link>
          </>
        }
      >
        The link may be wrong, or the page has moved. Check the address, or pick up where you left
        off.
      </StatusScreen>
    </main>
  );
}
