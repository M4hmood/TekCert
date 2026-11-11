import { Skeleton } from '@tekcert/ui';

const NAME_WIDTHS = ['62%', '48%', '70%', '54%', '66%', '44%', '58%', '72%', '50%'];

/** The directory while its first page loads: the filter bar and nine cards (rows on phones). */
export function DirectorySkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading the directory"
      className="flex flex-col gap-5.5 max-md:gap-3.5"
    >
      <Skeleton className="hidden h-11.5 rounded-[10px] max-lg:block" />
      <div className="flex gap-3 max-md:gap-2">
        <Skeleton className="flex-1 h-11.5 rounded-[10px]" />
        <Skeleton className="w-55 h-11.5 rounded-[10px] max-md:hidden" />
        <Skeleton className="w-44 h-11.5 rounded-[10px] max-md:hidden" />
        <Skeleton className="hidden size-11.5 rounded-[10px] max-md:block" />
      </div>
      <Skeleton className="w-32 h-4 my-2.5 rounded-[5px] max-md:my-0" />
      <ul className="grid grid-cols-3 gap-4 max-xl:grid-cols-2 max-md:flex max-md:flex-col max-md:gap-0 max-md:border max-md:border-ln max-md:rounded-[14px] max-md:bg-sf">
        {NAME_WIDTHS.map((width, i) => (
          <li
            key={i}
            className="flex flex-col gap-3.5 p-4.5 border border-ln rounded-[14px] bg-sf max-md:py-3 max-md:px-3.5 max-md:border-0 max-md:border-b max-md:rounded-none max-md:bg-transparent max-md:last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="flex-none size-12 rounded-full max-md:size-10" />
              <span className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 rounded-[5px]" style={{ width }} />
                <Skeleton className="w-2/5 h-3 rounded-[5px]" />
              </span>
            </div>
            <div className="flex gap-1.5 max-md:hidden">
              <Skeleton className="w-18 h-6.5 rounded-[6px]" />
              <Skeleton className="w-16 h-6.5 rounded-[6px]" />
            </div>
            <div className="flex justify-between pt-3 border-t border-ln max-md:hidden">
              <Skeleton className="w-36 h-3.5 rounded-[5px]" />
              <Skeleton className="w-12 h-3.5 rounded-[5px]" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A profile while it loads: the header band, then the two columns. */
export function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading the profile" className="contents">
      <div className="flex flex-col gap-6 -mx-10 -mt-8 px-10 pt-7 pb-8 border-b border-ln bg-sf max-md:-mx-4 max-md:-mt-5 max-md:px-4 max-md:pt-3 max-md:pb-2 max-md:border-none max-md:bg-transparent">
        <Skeleton className="w-64 h-7 my-2 rounded-[14px] max-md:w-40" />
        <div className="flex items-center gap-8 max-md:flex-col max-md:gap-3">
          <Skeleton className="flex-none size-33 rounded-full max-md:size-24" />
          <span className="flex flex-1 flex-col gap-3.5 max-md:items-center max-md:w-full">
            <Skeleton className="w-3/5 h-11 rounded-[8px] max-md:h-8" />
            <Skeleton className="w-2/5 h-5 rounded-[5px]" />
            <Skeleton className="w-1/3 h-4 rounded-[5px]" />
          </span>
          <Skeleton className="flex-none w-60 h-11.5 rounded-[10px] max-md:w-full max-md:h-12" />
        </div>
        <Skeleton className="h-21 rounded-[14px] max-md:hidden" />
      </div>
      <div className="grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-8 max-lg:grid-cols-[minmax(0,1fr)] max-md:gap-3">
        <div className="flex flex-col gap-4 max-md:gap-3">
          <Skeleton className="w-64 h-8 rounded-[6px] max-md:w-36 max-md:h-6" />
          <div className="grid grid-cols-2 gap-4 max-xl:grid-cols-[minmax(0,1fr)] max-md:gap-3">
            <Skeleton className="h-29 rounded-[14px] max-md:h-17" />
            <Skeleton className="h-29 rounded-[14px] max-md:h-17" />
          </div>
          <Skeleton className="w-40 h-8 mt-4 rounded-[6px] max-md:w-28 max-md:h-6 max-md:mt-3" />
          <Skeleton className="h-19 rounded-[14px]" />
        </div>
        <div className="flex flex-col gap-5 max-md:gap-3">
          <Skeleton className="h-42 rounded-[16px] max-md:hidden" />
          <Skeleton className="h-28 rounded-[16px]" />
          <Skeleton className="h-40 rounded-[16px]" />
        </div>
      </div>
    </div>
  );
}
