'use client';

import type { Settings } from '@tekcert/types';
import { Icon, Toast } from '@tekcert/ui';
import { SettingSwitch } from '@/components/community/profile-actions';
import { useToast } from '@/lib/use-toast';
import { SectionCard } from './parts';

/**
 * The two choices a student has. Profile visibility is not one of them: every profile is
 * visible to signed-in students (decision of 2026-10-29).
 */
export function PrivacySection({ privacy }: { privacy: Settings['privacy'] }) {
  const { toast, show } = useToast();
  return (
    <SectionCard
      title="Privacy"
      description="Choose how you appear to other students. Each switch is saved as you change it."
    >
      <p className="flex items-start gap-3 py-3.5 px-4 rounded-[12px] bg-sf2 text-ink2 text-[14px] leading-[1.5]">
        <Icon name="visibility" size={20} className="flex-none mt-px text-ink3" />
        Your profile is visible to every signed-in student. You accepted this when you created your
        account, and it is the same for everyone.
      </p>
      <div className="flex flex-col border-t border-ln">
        <SettingSwitch
          setting="leaderboardVisible"
          initial={privacy.leaderboardVisible}
          notify={show}
          className="px-0 max-md:px-0"
        />
        <SettingSwitch
          setting="availableToHelp"
          initial={privacy.availableToHelp}
          notify={show}
          className="px-0 max-md:px-0"
        />
      </div>
      {toast && <Toast key={toast.id} message={toast.message} tone={toast.tone} />}
    </SectionCard>
  );
}
