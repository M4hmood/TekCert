import { cn } from '@tekcert/ui';
import Image from 'next/image';

/**
 * TEK-UP University's logo, shown next to TekCert's in every header. The file has navy lettering
 * on a transparent background: `auto` keeps it navy on light surfaces and draws it white in dark
 * mode; `light` always draws it white, for the navy panels. Size it with a height class.
 */
export function SchoolLogo({
  tone = 'auto',
  className,
}: {
  tone?: 'auto' | 'light';
  className?: string;
}) {
  return (
    <Image
      src="/icons/logo_tek-up_university.png"
      alt="TEK-UP University"
      width={109}
      height={40}
      priority
      className={cn(
        'flex-none w-auto',
        tone === 'light' ? 'brightness-0 invert' : 'dark:brightness-0 dark:invert',
        className,
      )}
    />
  );
}
