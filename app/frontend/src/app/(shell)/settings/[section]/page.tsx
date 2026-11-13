import { notFound } from 'next/navigation';
import { parseSection } from '@/components/settings/sections';
import { SettingsScreen } from '@/components/settings/SettingsScreen';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ section: string }> };

export default async function SettingsSectionPage({ params }: Props) {
  const section = parseSection((await params).section);
  if (!section) notFound();
  return <SettingsScreen section={section} />;
}
