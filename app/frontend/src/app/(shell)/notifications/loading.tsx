import { Skeleton } from '@tekcert/ui';
import { PageHeader } from '@/components/PageHeader';

const TITLE_WIDTHS = ['72%', '58%', '66%', '48%', '62%'];

/** The notifications while they load: the filters, then one card of rows. */
export default function NotificationsLoading() {
  return (
    <div className="flex flex-col gap-5.5 w-full max-w-215 mx-auto max-md:gap-3.5">
      <PageHeader title="Notifications" />
      <div role="status" aria-label="Loading your notifications" className="flex flex-col gap-5.5">
        <Skeleton className="w-96 max-w-full h-11.5 rounded-[10px]" />
        <ul className="border border-ln rounded-[14px] bg-sf overflow-hidden max-md:-mx-4 max-md:border-x-0 max-md:rounded-none">
          {TITLE_WIDTHS.map((width, i) => (
            <li
              key={i}
              className="flex items-start gap-4 py-4 px-5 border-b border-ln last:border-b-0 max-md:gap-3 max-md:px-4"
            >
              <Skeleton className="flex-none size-11 rounded-full max-md:size-10" />
              <span className="flex flex-1 flex-col gap-2 pt-1">
                <Skeleton className="h-4 rounded-[5px]" style={{ width }} />
                <Skeleton className="w-3/5 h-3.5 rounded-[5px] max-md:hidden" />
                <Skeleton className="w-24 h-3 rounded-[5px]" />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
