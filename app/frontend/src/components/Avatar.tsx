import { cx } from '@tekcert/ui';
import styles from './Avatar.module.css';

export interface AvatarProps {
  firstName: string;
  lastName: string;
  /** API path from the user record (e.g. /users/…/avatar?v=…), or null for the initials. */
  avatarPath: string | null;
  className?: string;
}

/** Profile photo, or the student's initials when there is none. Decorative: the name is nearby. */
export function Avatar({ firstName, lastName, avatarPath, className }: AvatarProps) {
  return (
    <span className={cx(styles.avatar, className)} aria-hidden>
      {avatarPath ? (
        // Not next/image: the optimiser would fetch the photo without the student's session.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api${avatarPath}`} alt="" className={styles.photo} />
      ) : (
        initials(firstName, lastName)
      )}
    </span>
  );
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
