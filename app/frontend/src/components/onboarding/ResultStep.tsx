import type { RecommendedPath } from '@tekcert/types';
import { Alert, cx, Icon } from '@tekcert/ui';
import type { CSSProperties } from 'react';
import { hueColour, LEVEL_LABEL, NODE_STATE, pathTitle, REASON } from './copy';
import styles from './onboarding.module.css';
import { StepHeading } from './steps';

const PEER_TINTS = [styles.peerPri, styles.peerGold, styles.peerOk];

export function ResultStep({ path, failed }: { path: RecommendedPath | null; failed: boolean }) {
  return (
    <>
      <div className={styles.intro}>
        <span className={cx(styles.eyebrow, styles.gold)}>You’re all set</span>
        <StepHeading>Here’s your recommended path</StepHeading>
        {path && (
          <p
            className={cx(styles.lead, styles.pathLine)}
            style={{ '--path': pathColour(path) } as CSSProperties}
          >
            <span className={styles.pathDot} aria-hidden />
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
        <p className={styles.loading} role="status">
          Preparing your path…
        </p>
      )}

      {path && (
        <section className={styles.pathCard} aria-label="Recommended path">
          <ol className={styles.track}>
            {path.track.map((node) => (
              <li key={node.code} className={styles.node} data-state={node.state}>
                <span className={styles.nodeMarker} aria-hidden>
                  <Icon name={NODE_STATE[node.state].icon} size={17} />
                </span>
                <span className={styles.nodeCode}>
                  {node.code} · {LEVEL_LABEL[node.level]}
                </span>
                <span className={styles.nodeName}>{node.name}</span>
                <span className={styles.nodeNote}>
                  <Icon name={NODE_STATE[node.state].icon} size={16} />
                  {NODE_STATE[node.state].note}
                </span>
              </li>
            ))}
          </ol>
          <div className={styles.pathFooter}>
            <span className={styles.peers}>
              {path.peers.initials.length > 0 && (
                <span className={styles.peerStack} aria-hidden>
                  {path.peers.initials.map((initials, i) => (
                    <span key={`${initials}-${i}`} className={cx(styles.peer, PEER_TINTS[i])}>
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
            <span className={styles.pathCount}>
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
