import type { ReactNode } from 'react';

export default function FocusLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="flex flex-col min-h-dvh">
      {children}
    </main>
  );
}
