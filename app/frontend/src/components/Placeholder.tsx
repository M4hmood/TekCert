import { EmptyState } from '@tekcert/ui';
import type { ReactNode } from 'react';
import { PageHeader } from './PageHeader';

export interface PlaceholderProps {
  title: string;
  overline?: string;
  icon: string;
  /** Where the screen gets built, e.g. "Sprint 3" or "Release 2". */
  arrives: string;
  children?: ReactNode;
}

/** Sprint 0 stand-in for a screen: real header and navigation, empty body. */
export function Placeholder({ title, overline, icon, arrives, children }: PlaceholderProps) {
  const later = arrives.startsWith('Release');
  return (
    <>
      <PageHeader title={title} overline={overline} />
      <EmptyState icon={icon} title={later ? `Coming in ${arrives}` : 'Nothing here yet'}>
        {children ?? `This screen is built in ${arrives}.`}
      </EmptyState>
    </>
  );
}
