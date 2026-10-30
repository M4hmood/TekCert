/** The API path a browser loads the photo from; `v` changes whenever the photo does. */
export function avatarPath(userId: string, key: string | null): string | null {
  if (!key) return null;
  const version = key.slice(key.lastIndexOf('/') + 1).replace(/\.webp$/, '');
  return `/users/${userId}/avatar?v=${version}`;
}
