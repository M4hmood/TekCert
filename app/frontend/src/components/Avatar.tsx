import { Avatar as AvatarRoot, AvatarFallback, AvatarImage, cn } from '@tekcert/ui';

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
    <AvatarRoot
      className={cn('bg-pri-sf text-pri font-serif font-semibold', className)}
      aria-hidden
    >
      {/* Not next/image: the optimiser would fetch the photo without the student's session. */}
      {avatarPath && <AvatarImage src={`/api${avatarPath}`} alt="" />}
      <AvatarFallback>{initials(firstName, lastName)}</AvatarFallback>
    </AvatarRoot>
  );
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
