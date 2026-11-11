'use client';

import { MyProfileSettingsSchema } from '@tekcert/types';
import { Icon, Switch, Toast } from '@tekcert/ui';
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

/** "Available to help" on my own profile. Saved at once; a failure puts the switch back. */
export function HelpSwitch({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [saving, setSaving] = useState(false);
  const { toast, show } = useToast();
  const id = useId();

  const change = async (next: boolean) => {
    setOn(next);
    setSaving(true);
    const result = await withSessionRefresh(() =>
      patchJson('/me/profile', { availableToHelp: next }, MyProfileSettingsSchema),
    );
    setSaving(false);
    if (result.ok) {
      show(next ? 'You now show as available to help' : 'You no longer show as available to help');
    } else {
      setOn(!next);
      show("Couldn't save. Try again.", { tone: 'error' });
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 py-4.5 px-5.5 border border-ln rounded-[16px] bg-sf max-md:p-4 max-md:rounded-[12px]">
      <span className="flex items-start gap-3">
        <span className="grid flex-none place-items-center size-8 rounded-full bg-ok-sf text-ok">
          <Icon name="volunteer_activism" size={18} />
        </span>
        <span className="flex flex-col gap-0.5">
          <label htmlFor={id} className="text-[15px] font-semibold">
            Available to help
          </label>
          <span id={`${id}-hint`} className="text-ink3 text-[13px] leading-[1.4]">
            Shows a badge in the directory, so classmates know they can write to you.
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
      {toast && <Toast key={toast.id} message={toast.message} tone={toast.tone} />}
    </div>
  );
}
