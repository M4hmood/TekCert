import { cn, Skeleton } from '@tekcert/ui';
import { CARD } from './cards';

/**
 * Dashboard › loading (design: Mobile 390 · loading), drawn with the real grid so nothing jumps
 * when the page arrives. The whole screen shimmers as one.
 */
export function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading your dashboard"
      className="flex flex-col gap-7 animate-shimmer max-md:gap-4"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="w-60 h-3.5 max-md:w-30" />
        <Skeleton className="w-80 h-10 max-md:w-55 max-md:h-7" />
      </div>
      <Skeleton className="hidden h-19 rounded-[14px] max-md:block" />
      <div className="grid grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] gap-6 items-start max-lg:grid-cols-[minmax(0,1fr)] max-md:gap-4">
        <div className={cn(CARD, 'gap-6 p-7 max-md:gap-3.5 max-md:p-4.5')}>
          <Skeleton className="w-44 h-3 max-md:hidden" />
          <div className="flex items-center gap-7 max-md:gap-4">
            <span className="flex-none size-32 border-10 border-sf2 rounded-full max-md:size-18 max-md:border-7" />
            <div className="flex flex-1 flex-col gap-2.5">
              <Skeleton className="w-3/5 h-3" />
              <Skeleton className="w-11/12 h-7 max-md:h-5" />
              <Skeleton className="w-2/3 h-3.5 max-md:hidden" />
            </div>
          </div>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className={cn('h-3.5', i === 3 && 'max-md:hidden')}
              style={{ width: `${90 - i * 8}%` }}
            />
          ))}
          <Skeleton className="w-48 h-11 rounded-[8px] max-md:w-full" />
        </div>
        <div className="flex flex-col gap-6 max-md:gap-4">
          <Skeleton className="h-80 rounded-[16px] max-md:hidden" />
          <Skeleton className="h-50 rounded-[16px] max-md:h-16 max-md:rounded-[12px]" />
        </div>
      </div>
      <Skeleton className="h-36 rounded-[16px] max-md:hidden" />
      <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-[minmax(0,1fr)] max-md:gap-4">
        <Skeleton className="h-70 rounded-[16px] max-md:h-16 max-md:rounded-[12px]" />
        <Skeleton className="h-70 rounded-[16px] max-md:hidden" />
      </div>
    </div>
  );
}
