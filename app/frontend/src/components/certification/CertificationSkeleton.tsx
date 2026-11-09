import { cn, Skeleton } from '@tekcert/ui';

const block = (width: string, height: number, radius = 5) => (
  <Skeleton style={{ width, height, borderRadius: radius }} aria-hidden />
);

/** The certification page's shape while it loads. */
export function CertificationSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <section
        className={cn(
          'flex flex-col gap-5.5 -mt-8 -mx-10 px-10 pt-7 border-b border-ln bg-sf max-md:gap-3.5 max-md:-mt-5 max-md:-mx-4 max-md:px-4 max-md:pt-3',
          'animate-shimmer',
        )}
      >
        {block('220px', 20)}
        <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-12 items-start max-cert:grid-cols-[minmax(0,1fr)] max-cert:gap-7 max-md:gap-4">
          <div className="flex flex-col gap-4 min-w-0 max-md:gap-2.5">
            {block('260px', 24, 6)}
            {block('80%', 48, 8)}
            {block('60%', 18)}
          </div>
          {block('100%', 160, 16)}
        </div>
        <div className="flex gap-1 mt-1 overflow-x-auto [scrollbar-width:none]">
          {block('360px', 40, 6)}
        </div>
      </section>
      <div
        className={cn('flex flex-col gap-5 min-w-0', 'animate-shimmer')}
        style={{ marginTop: 28 }}
      >
        {block('200px', 28)}
        {block('100%', 16)}
        {block('90%', 16)}
        {block('70%', 16)}
      </div>
    </div>
  );
}
