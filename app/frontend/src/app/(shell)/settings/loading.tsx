import { Skeleton } from '@tekcert/ui';

/** A section of Settings while it loads; the list of sections stays in place. */
export default function SettingsLoading() {
  return (
    <div
      role="status"
      aria-label="Loading your settings"
      className="flex flex-col gap-6 py-7 px-8 border border-ln rounded-[16px] bg-sf max-md:hidden"
    >
      <Skeleton className="w-44 h-8 rounded-[6px]" />
      <Skeleton className="w-4/5 h-4 rounded-[5px]" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-12 rounded-[10px]" />
        <Skeleton className="h-12 rounded-[10px]" />
      </div>
      <Skeleton className="h-36 rounded-[12px]" />
    </div>
  );
}
