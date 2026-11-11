import type { CertificationDetail, MyCertificationStatus } from '@tekcert/types';
import { Icon } from '@tekcert/ui';
import Link from 'next/link';
import { examDuration } from './format';

/** Server-rendered tab panel: Overview. The Syllabus tab is SyllabusPanel (client: ticks). */

export function OverviewPanel({
  cert,
  mine,
}: {
  cert: CertificationDetail;
  /** slug → my status, for the prerequisites. */
  mine: Record<string, MyCertificationStatus>;
}) {
  const weighted = cert.domains.every((d) => d.weightPct !== null);
  const facts: [string, string | null][] = [
    ['Duration', cert.facts.minutes ? examDuration(cert.facts.minutes, true) : null],
    ['Questions', cert.facts.questions ? String(cert.facts.questions) : null],
    ['Passing score', cert.facts.passingScore],
    ['Languages', cert.facts.languages],
    ['Delivery', cert.facts.delivery],
    [
      'Validity',
      cert.facts.validityYears
        ? `${cert.facts.validityYears} ${cert.facts.validityYears === 1 ? 'year' : 'years'}`
        : null,
    ],
  ];
  const shown = facts.filter((f): f is [string, string] => f[1] !== null);

  return (
    <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-10 items-start [&>:first-child]:gap-8 max-cert:grid-cols-[minmax(0,1fr)] max-cert:gap-7">
      <div className="flex flex-col gap-5 min-w-0">
        <div className="flex flex-col gap-3">
          <h2 className="font-serif text-[28px] font-medium max-md:text-[23px]">Description</h2>
          <p className="max-w-170 text-ink2 text-[16px] leading-[1.7]">
            {cert.description ?? cert.summary}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-serif text-[28px] font-medium max-md:text-[23px]">
            Domains assessed
          </h2>
          {weighted && (
            <div
              className="flex gap-0.5 h-3 overflow-hidden rounded-[6px] [&_span]:bg-pri"
              aria-hidden
            >
              {cert.domains.map((d, i) => (
                <span
                  key={d.order}
                  style={{ width: `${d.weightPct}%`, opacity: 1 - i * (0.7 / cert.domains.length) }}
                />
              ))}
            </div>
          )}
          <ul className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-[14.5px] [&_li]:flex [&_li]:justify-between [&_li]:gap-3 [&_li]:py-2 [&_li]:border-b [&_li]:border-ln max-md:grid-cols-[minmax(0,1fr)]">
            {cert.domains.map((d) => (
              <li key={d.order}>
                {d.order}. {d.title}
                {d.weightPct !== null && <strong>{d.weightPct}%</strong>}
              </li>
            ))}
          </ul>
        </div>

        {cert.prerequisites.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-serif text-[28px] font-medium max-md:text-[23px]">Prerequisites</h2>
            {cert.prerequisites.map((p) => {
              const status = mine[p.slug];
              const note =
                status === 'unverified'
                  ? 'Recommended · you declared it, proof comes later'
                  : status === 'in_progress'
                    ? 'Recommended · you are preparing it'
                    : 'Recommended first';
              return (
                <Link
                  key={p.slug}
                  href={`/catalog/${p.slug}`}
                  className="flex items-center gap-3.5 py-3.5 px-4 border border-ln rounded-[12px] bg-sf text-ink no-underline hover:border-ln2"
                >
                  <Icon
                    name={status ? 'check_circle' : 'info'}
                    size={22}
                    className={status ? 'text-ok' : 'text-ink3'}
                  />
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">
                      {p.name} ({p.code})
                    </span>
                    <span className="text-ink3 text-[13px]">{note}</span>
                  </span>
                  <Icon name="chevron_right" size={20} className="text-ink3" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {shown.length > 0 && (
        <div className="flex flex-col gap-5 min-w-0">
          <div className="flex flex-col p-6 border border-ln rounded-[16px] bg-sf">
            <h3 className="mb-2.5 font-serif text-[21px] font-semibold">Exam format</h3>
            <dl className="text-[14.5px]">
              {shown.map(([term, value]) => (
                <div
                  key={term}
                  className="flex justify-between gap-4 py-2.75 border-t border-ln [&_dt]:text-ink2 [&_dd]:font-semibold [&_dd]:text-end"
                >
                  <dt>{term}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
