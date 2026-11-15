import '@tekcert/ui/styles.css';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { Splash } from '@/components/Splash';
import { parseTheme, SPLASH_COOKIE, THEME_COOKIE } from '@/lib/preferences';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = {
  title: { default: 'TekCert', template: '%s · TekCert' },
  description: 'IT certifications for TEK-UP students: prepare, track your progress, find help.',
  icons: { icon: '/icons/tekcert-96.png', apple: '/icons/tekcert-180.png' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f3ec' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1220' },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Read on the server so the first paint already has the chosen theme (no flash). A signed-in
  // student's saved theme wins over this browser's cookie, so a new device opens in it; the
  // API being unreachable must not take the error pages down with it.
  const jar = await cookies();
  const user = await getCurrentUser().catch(() => null);
  const theme = user?.theme ?? parseTheme(jar.get(THEME_COOKIE)?.value);
  return (
    <html lang="en" data-theme={theme === 'system' ? undefined : theme}>
      {/* Where the browser reports errors, when monitoring is set up (lib/monitoring.ts). */}
      {process.env.SENTRY_DSN && (
        <head>
          <meta name="sentry-dsn" content={process.env.SENTRY_DSN} />
          <meta
            name="sentry-environment"
            content={process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV}
          />
        </head>
      )}
      <body>
        {!jar.has(SPLASH_COOKIE) && <Splash />}
        {children}
      </body>
    </html>
  );
}
