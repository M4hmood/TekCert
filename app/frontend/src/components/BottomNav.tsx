'use client';

import { Icon } from '@tekcert/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BOTTOM_NAV, isActive } from '@/lib/navigation';

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-10 hidden grid-cols-5 border-t border-ln bg-sf px-1 pt-1.5 pb-[max(20px,env(safe-area-inset-bottom))] font-sans max-md:grid"
    >
      {BOTTOM_NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col items-center justify-center gap-0.75 min-h-14 text-ink3 text-[11.5px] font-medium no-underline aria-[current=page]:text-pri aria-[current=page]:font-semibold"
            aria-current={active ? 'page' : undefined}
          >
            <span className="grid place-items-center w-14 h-7.5 rounded-[15px] group-aria-[current=page]:bg-pri-sf">
              <Icon name={item.icon} filled={active} size={22} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
