import { BADGE_KEYS, type MyPoints } from '@tekcert/types';
import { BadgeGrid, earnedCount, formatPoints, LevelBar, toNextLabel } from './parts';

/** The profile's level and badges blocks (design/Profil, right column). */
export function ProfileProgress({ points }: { points: MyPoints }) {
  const { level } = points;
  return (
    <div className="grid grid-cols-2 gap-5 items-start max-lg:grid-cols-[minmax(0,1fr)] max-md:gap-4">
      <section
        aria-label="My level"
        className="flex flex-col gap-3.5 p-6 rounded-[16px] bg-hero text-hero-ink"
      >
        <span className="type-overline opacity-70">Level {level.roman}</span>
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-[34px] font-medium">{level.name}</span>
          <span className="text-[14px]">
            <strong className="font-serif text-[24px] font-medium">
              {formatPoints(points.points)}
            </strong>{' '}
            pts
          </span>
        </div>
        <LevelBar level={level} />
        <span className="text-[13px] opacity-80">{toNextLabel(level)}</span>
      </section>
      <section
        aria-labelledby="badges-title"
        className="flex flex-col gap-4 p-5.5 border border-ln rounded-[16px] bg-sf"
      >
        <div className="flex items-baseline justify-between">
          <h2 id="badges-title" className="font-serif text-[21px] font-semibold">
            Badges
          </h2>
          <span className="text-ink3 text-[13px]">
            {earnedCount(points.badges)} of {BADGE_KEYS.length}
          </span>
        </div>
        <BadgeGrid badges={points.badges} />
      </section>
    </div>
  );
}
