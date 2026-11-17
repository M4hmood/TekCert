import { countLabel } from '@tekcert/types';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import { CertBadge, providerColor } from '@/components/catalog/parts';
import { type ProviderShowcase, SHOWCASE_BADGES, SHOWCASE_ROWS } from './format';
import { PROVIDER_LOGOS } from './provider-logos';

/**
 * One provider in the landing page's carousel (design/Landing, "Certifications funded by the
 * institute"): the logo on top of a band tinted with the provider's colour, the badges under it,
 * then the name and the first certifications. Landscape on purpose: wider than tall at every size, so on phones the
 * list gives way and the card keeps the logo, the badges, the name and the count.
 */
export function ProviderCard({ provider, certifications }: ProviderShowcase) {
  const logo = PROVIDER_LOGOS[provider.code];
  const hidden = certifications.length - SHOWCASE_ROWS;

  return (
    <article
      aria-label={provider.name}
      className="group/card flex flex-none flex-col w-150 border border-ln rounded-[16px] bg-bg overflow-hidden snap-start transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-ln2 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-16px_rgb(0_0_0/0.18)] hover:shadow-[0_2px_4px_rgb(0_0_0/0.05),0_22px_40px_-20px_color-mix(in_oklch,var(--tile)_55%,rgb(0_0_0/0.35))] dark:shadow-[0_1px_2px_rgb(0_0_0/0.3),0_10px_28px_-14px_rgb(0_0_0/0.6)] dark:hover:shadow-[0_2px_4px_rgb(0_0_0/0.35),0_24px_44px_-18px_color-mix(in_oklch,var(--tile)_45%,rgb(0_0_0/0.8))] max-lg:w-[min(78vw,560px)] max-md:w-[min(84vw,340px)]"
      style={{ '--tile': providerColor(provider.hue) } as CSSProperties}
    >
      {/* Tinted with the provider's colour, with a soft glow in the corner. Fixed height on every
          card: the logo sits in a 44px slot (36px on phones) above one row of 60px badges. Logos
          and badges keep their own colours: in dark mode the band is a light grey-blue (not white),
          so logos with black lettering (AWS, Red Hat, INE, Huawei) stay readable. */}
      <div className="flex flex-col gap-5 p-6 border-b border-ln bg-[color:color-mix(in_oklch,var(--tile)_10%,var(--sf))] bg-[image:radial-gradient(130%_100%_at_100%_0%,color-mix(in_oklch,var(--tile)_28%,transparent),transparent_70%)] dark:border-transparent dark:bg-[color:color-mix(in_oklch,var(--tile)_12%,oklch(0.86_0.012_255))] dark:bg-[image:radial-gradient(130%_100%_at_100%_0%,color-mix(in_oklch,var(--tile)_34%,transparent),transparent_70%)] max-md:gap-4 max-md:p-4">
        <div className="flex items-center h-11 max-md:h-9">
          {logo ? (
            <Image
              src={logo.src}
              alt={provider.name}
              width={logo.width}
              height={logo.height}
              className="w-auto h-(--logo-h) max-md:h-[calc(var(--logo-h)*0.8)]"
              style={{ '--logo-h': `${logo.height}px` } as CSSProperties}
            />
          ) : (
            <span className="font-serif text-[24px] font-semibold max-md:text-[20px]">
              {provider.name}
            </span>
          )}
        </div>
        <div className="flex items-center h-15 gap-3 max-md:gap-2 max-md:[&>*:nth-child(n+5)]:hidden">
          {certifications.slice(0, SHOWCASE_BADGES).map((cert) => (
            <CertBadge
              key={cert.slug}
              code={cert.code}
              badgeAsset={cert.badgeAsset}
              provider={cert.provider}
              size={60}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 pt-4.5 px-6 pb-5.5 max-md:gap-0 max-md:p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-[22px] font-semibold max-md:text-[19px]">
            {provider.name}
          </h3>
          <span className="flex-none text-ink3 text-[13px]">
            {countLabel(certifications.length, 'certification')}
          </span>
        </div>
        <ul className="flex flex-col max-md:hidden">
          {certifications.slice(0, SHOWCASE_ROWS).map((cert) => (
            <li
              key={cert.slug}
              className="grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-2.5 py-1.75 border-t border-ln text-[14px]"
            >
              <span className="font-mono text-[12.5px] font-medium truncate">{cert.code}</span>
              <span className="text-ink2 truncate">{cert.name}</span>
            </li>
          ))}
          {hidden > 0 && (
            <li className="py-1.75 border-t border-ln text-ink3 text-[13.5px]">
              and {hidden} more
            </li>
          )}
        </ul>
      </div>
    </article>
  );
}
