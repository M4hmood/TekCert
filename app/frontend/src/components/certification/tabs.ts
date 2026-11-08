import type { CommunityQuery } from '@tekcert/types';

export const TABS = ['overview', 'syllabus', 'resources', 'community'] as const;
export type Tab = (typeof TABS)[number];

/** The ?tab= value, or the Overview for anything else. */
export function parseTab(value: string | string[] | undefined): Tab {
  return TABS.find((tab) => tab === value) ?? 'overview';
}

/** The ?scope=&specialty=&year= part of the page URL and of the API call. */
export function communitySearch(query: CommunityQuery): string {
  const params = new URLSearchParams();
  if (query.scope !== 'institute') params.set('scope', query.scope);
  if (query.specialty) params.set('specialty', query.specialty);
  if (query.year) params.set('year', String(query.year));
  return params.toString();
}
