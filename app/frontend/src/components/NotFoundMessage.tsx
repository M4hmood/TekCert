import { buttonClass, Icon } from '@tekcert/ui';
import Link from 'next/link';
import { StatusScreen } from './StatusScreen';

/** The 404 message, shared by the page on its own and the one inside the shell. */
export function NotFoundMessage() {
  return (
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
  );
}
