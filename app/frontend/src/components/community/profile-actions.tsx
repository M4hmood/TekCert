'use client';

import { MyProfileSettingsSchema } from '@tekcert/types';
import { cn, Icon, Switch, Toast } from '@tekcert/ui';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { patchJson, withSessionRefresh } from '@/lib/client-api';
import { useToast } from '@/lib/use-toast';

/** The institute address with a copy button; the toast confirms the copy. */
export function CopyEmail({ email }: { email: string }) {
  const { toast, show } = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      show('Email copied');
    } catch {
      show("Couldn't copy. Select the address instead.", { tone: 'error' });
    }
  };
  return (
    <div className="flex items-center gap-2.5 min-w-0 max-md:hidden">
      <span className="font-mono text-[14px] font-medium truncate">{email}</span>
      <button
        type="button"
        aria-label="Copy email"
        onClick={() => void copy()}
        className="grid flex-none place-items-center size-9 border-none rounded-[8px] bg-transparent text-ink3 cursor-pointer hover:bg-sf2"
      >
        <Icon name="content_copy" size={18} />
      </button>
      {toast && <Toast key={toast.id} message={toast.message} tone={toast.tone} />}
    </div>
  );
}

type Setting = 'availableToHelp' | 'leaderboardVisible';

const SETTINGS: Record<
  Setting,
  { title: string; hint: string; icon: string; on: string; off: string }
> = {
  availableToHelp: {
    title: 'Available to help',
    hint: 'Shows a badge in the directory, so classmates know they can write to you.',
    icon: 'volunteer_activism',
    on: 'You now show as available to help',
    off: 'You no longer show as available to help',
  },
  leaderboardVisible: {
    title: 'Appear on the leaderboard',
    hint: 'Otherwise you stay ranked, but shown as “Anonymous”.',
    icon: 'leaderboard',
    on: 'Your name shows on the leaderboard again',
    off: 'You now appear as Anonymous on the leaderboard',
  },
};

/**
 * The switches on my own profile: "Available to help" and my name on the leaderboard. Each is
 * saved at once; a failure puts the switch back.
 */
export function ProfileSwitches({ availableToHelp, leaderboardVisible }: Record<Setting, boolean>) {
  const { toast, show } = useToast();
  return (
    <section
      id="privacy"
      aria-label="My settings"
      className="flex flex-col border border-ln rounded-[16px] bg-sf scroll-mt-6 max-md:rounded-[12px]"
    >
      <SettingSwitch setting="availableToHelp" initial={availableToHelp} notify={show} />
      <SettingSwitch setting="leaderboardVisible" initial={leaderboardVisible} notify={show} />
      {toast && <Toast key={toast.id} message={toast.message} tone={toast.tone} />}
    </section>
  );
}

function SettingSwitch({
  setting,
  initial,
  notify,
}: {
  setting: Setting;
  initial: boolean;
  notify: ReturnType<typeof useToast>['show'];
}) {
  const [on, setOn] = useState(initial);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const id = useId();
  const text = SETTINGS[setting];

  const change = async (next: boolean) => {
    setOn(next);
    setSaving(true);
    const result = await withSessionRefresh(() =>
      patchJson('/me/profile', { [setting]: next }, MyProfileSettingsSchema),
    );
    setSaving(false);
    if (result.ok) {
      notify(next ? text.on : text.off);
      // The chips at the top of the profile are rendered on the server.
      router.refresh();
    } else {
      setOn(!next);
      notify("Couldn't save. Try again.", { tone: 'error' });
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 py-4 px-5.5 border-b border-ln last:border-b-0 max-md:px-4">
      <span className="flex items-start gap-3">
        <span
          className={cn(
            'grid flex-none place-items-center size-8 rounded-full',
            on ? 'bg-ok-sf text-ok' : 'bg-sf2 text-ink3',
          )}
        >
          <Icon name={text.icon} size={18} />
        </span>
        <span className="flex flex-col gap-0.5">
          <label htmlFor={id} className="text-[15px] font-semibold">
            {text.title}
          </label>
          <span id={`${id}-hint`} className="text-ink3 text-[13px] leading-[1.4]">
            {text.hint}
          </span>
        </span>
      </span>
      <Switch
        id={id}
        checked={on}
        disabled={saving}
        aria-describedby={`${id}-hint`}
        onCheckedChange={(next) => void change(next)}
      />
    </div>
  );
}
