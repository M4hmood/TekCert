import { Skeleton } from '@tekcert/ui';
import { PageHeader } from '@/components/PageHeader';

const NAME_WIDTHS = ['44%', '36%', '52%', '40%', '48%', '34%', '46%', '38%'];

/** The leaderboard while it loads: the table card and the two side cards. */
export default function LeaderboardLoading() {
  return (
    <>
      <PageHeader title="Leaderboard" description="Points come from finished chapters." />
      <div
        role="status"
        aria-label="Loading the leaderboard"
        className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-6 max-lg:grid-cols-[minmax(0,1fr)] max-md:gap-3.5"
      >
        <div className="flex flex-col border border-ln rounded-[16px] bg-sf overflow-hidden max-md:border-none max-md:bg-transparent">
          <div className="flex items-center justify-between gap-3 py-4 px-5 border-b border-ln max-md:flex-col max-md:items-stretch max-md:p-0 max-md:pb-3.5 max-md:border-none">
            <Skeleton className="w-90 h-11.5 rounded-[10px] max-md:w-full" />
            <Skeleton className="w-44 h-10.5 rounded-[10px] max-md:self-end" />
          </div>
          <ul className="max-md:border max-md:border-ln max-md:rounded-[14px] max-md:bg-sf">
            {NAME_WIDTHS.map((width, i) => (
              <li
                key={i}
                className="flex items-center gap-3 min-h-15 px-5 border-b border-ln last:border-b-0 max-md:min-h-14 max-md:px-3.5"
              >
                <Skeleton className="flex-none size-8 rounded-full max-md:size-6" />
                <Skeleton className="flex-none size-9.5 rounded-full max-md:size-9" />
                <span className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 rounded-[5px]" style={{ width }} />
                  <Skeleton className="w-1/4 h-3 rounded-[5px]" />
                </span>
                <Skeleton className="flex-none w-12 h-5 rounded-[5px]" />
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4 max-md:hidden">
          <Skeleton className="h-56 rounded-[16px]" />
          <Skeleton className="h-44 rounded-[16px]" />
        </div>
      </div>
    </>
  );
}
