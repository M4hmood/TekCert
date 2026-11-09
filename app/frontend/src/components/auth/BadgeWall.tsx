import Image from 'next/image';

/** Badges in three columns (files in public/badges). Only files that exist there are listed. */
const COLUMNS = [
  [
    'aws-saa-c03.webp',
    'cisco-ccna.webp',
    'ine-ewpt.svg',
    'azure-associate.webp',
    'lf-cka.webp',
    'pi-pcap.png',
  ],
  [
    'azure-fundamentals.webp',
    'aws-dva-c02.webp',
    'cisco-ccnp.webp',
    'ine-ecppt.svg',
    'aws-sap-c02.webp',
    'pi-pcep.png',
  ],
  [
    'ine-ejpt.svg',
    'aws-clf-c02.webp',
    'lf-ckad.png',
    'cisco-ccie.webp',
    'azure-expert.webp',
    'pi-pcpp.png',
  ],
];

/** Decorative: hidden from assistive technology, paused for reduced motion. */
export function BadgeWall() {
  return (
    <div
      className="flex justify-center gap-3.5 h-95 overflow-hidden -rotate-6 origin-center [mask-image:linear-gradient(to_bottom,transparent,#000_18%,#000_82%,transparent)] max-lg:hidden"
      aria-hidden
    >
      {COLUMNS.map((column, i) => (
        <div
          key={i}
          className="flex flex-none flex-col self-start gap-3.5 animate-wall-up nth-2:-mt-10 nth-2:animate-wall-down nth-3:[animation-duration:46s] motion-reduce:animate-none"
        >
          {/* Each column is listed twice so the scroll loops seamlessly. */}
          {[...column, ...column].map((file, j) => (
            <div
              key={j}
              className="grid place-items-center flex-none size-26 rounded-[18px] bg-[rgba(255,253,248,0.96)] shadow-[0_10px_24px_-12px_rgba(0,0,0,0.55)]"
            >
              <Image
                src={`/badges/${file}`}
                alt=""
                width={76}
                height={76}
                className="w-auto max-w-19 h-auto max-h-19"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
