import '@tekcert/ui/styles.css';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { parseTheme, THEME_COOKIE } from '@/lib/preferences';

export const metadata: Metadata = {
  title: { default: 'TekCert', template: '%s · TekCert' },
  description: 'IT certifications for TEK-UP students: prepare, track your progress, find help.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f3ec' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1220' },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Read on the server so the first paint already has the chosen theme (no flash).
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="en" data-theme={theme === 'system' ? undefined : theme}>
      <body>{children}</body>
    </html>
  );
}
