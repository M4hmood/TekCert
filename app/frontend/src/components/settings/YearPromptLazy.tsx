'use client';

import dynamic from 'next/dynamic';
import type { YearPromptProps } from './YearPrompt';

/**
 * The year prompt shows a few days a year, but the shell is on every screen: its code is
 * fetched only when the prompt is due.
 */
const YearPrompt = dynamic(() => import('./YearPrompt').then((module) => module.YearPrompt), {
  ssr: false,
});

export function YearPromptLazy(props: YearPromptProps) {
  return <YearPrompt {...props} />;
}
