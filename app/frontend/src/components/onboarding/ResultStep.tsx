import type { RecommendedPath } from '@tekcert/types';
import { Alert, cn, Icon } from '@tekcert/ui';
import type { CSSProperties } from 'react';
import { hueColour, LEVEL_LABEL, NODE_STATE, pathTitle, REASON } from './copy';
import { StepHeading } from './steps';

const PEER_TINTS = ['bg-pri-sf text-pri', 'bg-gold-sf text-gold', 'bg-ok-sf text-ok'];

export function ResultStep({ path, failed }: { path: RecommendedPath | null; failed: boolean }) {
  return (
    <>
      <div className="flex flex-col gap-2.5 max-md:gap-1.5">
        <span
          className={cn(
            'text-[12.5px] font-semibold tracking-[0.12em] uppercase max-md:text-[11.5px]',
            'text-gold',
          )}
        >
          You’re all set
        </span>
        <StepHeading>Here’s your recommended path</StepHeading>
        {path && (
          <p
            className={cn(
              'text-ink2 text-[16.5px] max-md:text-[14.5px]',
              '[--path:var(--ink3)] flex items-start gap-2.5 [&_strong]:text-ink',
            )}
            style={{ '--path': pathColour(path) } as CSSProperties}
          >
            <span
              className="flex-none size-3 mt-[calc(0.75em-6px)] rounded-full bg-(--path)"
              aria-hidden
            />
            <span>
              <strong>{pathTitle(path.path)}</strong> · {REASON[path.reason]}
            </span>
          </p>
        )}
      </div>

      {failed && (
        <Alert tone="error">
          <strong>Your path could not be loaded.</strong> You can still go to your dashboard and
          find it under Paths.
        </Alert>
      )}
      {!path && !failed && (
        <p className="text-ink2" role="status">
          Preparing your path…
        </p>
      )}

      {path && (
        <section
          className="flex flex-col gap-7 p-8 border border-ln rounded-[16px] bg-sf max-md:p-0 max-md:border-0 max-md:bg-transparent"
          aria-label="Recommended path"
        >
          <ol className="grid auto-cols-fr grid-flow-col gap-8 max-md:relative max-md:grid-flow-row max-md:gap-3.5 max-md:ps-11 max-md:before:absolute max-md:before:top-4.5 max-md:before:bottom-4.5 max-md:before:start-4 max-md:before:w-0.5 max-md:before:bg-ln2 max-md:before:content-['']">
            {path.track.map((node) => (
              <li
                key={node.code}
                className="group/node relative flex flex-col gap-1.5 p-4 border-[1.5px] border-ln2 rounded-[12px] bg-sf not-first:before:absolute not-first:before:top-1/2 not-first:before:-start-[33.5px] not-first:before:w-8 not-first:before:h-[1.5px] not-first:before:bg-ln2 not-first:before:content-[''] data-[state=held]:border-dashed data-[state=held]:border-gold-fill data-[state=held]:bg-bg data-[state=next]:p-[15.5px] data-[state=next]:border-2 data-[state=next]:border-pri data-[state=next]:shadow-[0_0_0_4px_var(--pri-sf)] data-[state=locked]:border-dashed data-[state=locked]:bg-sf2 max-md:p-3.5 max-md:not-first:before:hidden"
                data-state={node.state}
              >
                <span
                  className="hidden max-md:absolute max-md:top-3.5 max-md:-start-10 max-md:grid max-md:place-items-center max-md:size-7.5 max-md:border-[1.5px] max-md:border-ln2 max-md:rounded-full max-md:bg-sf max-md:text-ink2 max-md:group-data-[state=held]/node:border-dashed max-md:group-data-[state=held]/node:border-gold-fill max-md:group-data-[state=held]/node:bg-bg max-md:group-data-[state=held]/node:text-gold max-md:group-data-[state=next]/node:border-none max-md:group-data-[state=next]/node:bg-pri max-md:group-data-[state=next]/node:text-pri-ink max-md:group-data-[state=locked]/node:border-none max-md:group-data-[state=locked]/node:bg-sf2 max-md:group-data-[state=locked]/node:text-ink3"
                  aria-hidden
                >
                  <Icon name={NODE_STATE[node.state].icon} size={17} />
                </span>
                <span className="text-ink3 font-mono font-medium text-[11.5px] leading-[normal] group-data-[state=held]/node:text-gold group-data-[state=next]/node:text-pri">
                  {node.code} · {LEVEL_LABEL[node.level]}
                </span>
                <span className="text-[15px] font-semibold group-data-[state=locked]/node:text-ink2">
                  {node.name}
                </span>
                <span className="flex items-center gap-1 text-ink2 text-[12.5px] font-semibold group-data-[state=next]/node:text-pri group-data-[state=locked]/node:text-ink3 max-md:[&_.material-symbols-outlined]:hidden">
                  <Icon name={NODE_STATE[node.state].icon} size={16} />
                  {NODE_STATE[node.state].note}
                </span>
              </li>
            ))}
          </ol>
          <div className="flex items-center justify-between gap-4 pt-5.5 border-t border-ln max-md:flex-col max-md:items-start max-md:pt-4">
            <span className="flex items-center gap-3 text-ink2 text-[14.5px] [&_strong]:text-ink">
              {path.peers.initials.length > 0 && (
                <span className="flex" aria-hidden>
                  {path.peers.initials.map((initials, i) => (
                    <span
                      key={`${initials}-${i}`}
                      className={cn(
                        'grid place-items-center size-8.5 rounded-full shadow-[0_0_0_2.5px_var(--sf)] text-[12px] font-semibold not-first:-ms-2',
                        PEER_TINTS[i],
                      )}
                    >
                      {initials}
                    </span>
                  ))}
                </span>
              )}
              {path.peers.count > 0 ? (
                <span>
                  <strong>
                    {path.peers.count} {path.peers.count === 1 ? 'student' : 'students'}
                  </strong>{' '}
                  also {path.peers.count === 1 ? 'follows' : 'follow'} this path
                </span>
              ) : (
                <span>You’re the first to follow this path</span>
              )}
            </span>
            <span className="text-ink3 text-[14px]">
              {path.certificationCount} certifications in this path
            </span>
          </div>
        </section>
      )}
    </>
  );
}

function pathColour(path: RecommendedPath): string {
  return path.path.hue === null ? 'var(--ink3)' : hueColour(path.path.hue);
}
