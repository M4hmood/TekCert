import { redirect } from 'next/navigation';

/** The public landing page arrives in Sprint 8; until then the root opens the app. */
export default function Home() {
  redirect('/dashboard');
}
