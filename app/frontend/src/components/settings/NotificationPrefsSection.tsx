'use client';

import {
  type Channels,
  NOTIFICATION_CATEGORY_HINT,
  NOTIFICATION_CATEGORY_LABEL,
  type NotificationPreference,
  NotificationPreferencesSchema,
} from '@tekcert/types';
import { Switch, Toast } from '@tekcert/ui';
import { useState } from 'react';
import { putJson, withSessionRefresh } from '@/lib/client-api';
import { useToast } from '@/lib/use-toast';
import { SectionCard } from './parts';

const CHANNELS: { key: keyof Channels; label: string; spoken: string }[] = [
  { key: 'inApp', label: 'In the app', spoken: 'in the app' },
  { key: 'email', label: 'Email', spoken: 'by email' },
];
const GRID =
  'grid grid-cols-[minmax(0,1fr)_96px_96px] items-center gap-3 max-md:grid-cols-[minmax(0,1fr)_64px_64px] max-md:gap-2';

/** Where each category of notification arrives. A switch is saved as soon as it moves. */
export function NotificationPrefsSection({ initial }: { initial: NotificationPreference[] }) {
  const { toast, show } = useToast();
  const [items, setItems] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);

  const change = async (item: NotificationPreference, channel: keyof Channels, on: boolean) => {
    const next = { ...item, [channel]: on };
    const put = (row: NotificationPreference) =>
      setItems((current) => current.map((i) => (i.category === row.category ? row : i)));
    put(next);
    setSaving(`${item.category}:${channel}`);
    const result = await withSessionRefresh(() =>
      putJson('/me/notification-preferences', { items: [next] }, NotificationPreferencesSchema),
    );
    setSaving(null);
    if (result.ok) {
      setItems(result.data.items);
      show('Notification preferences saved');
    } else {
      put(item);
      show('Couldn’t save. Try again.', { tone: 'error' });
    }
  };

  return (
    <SectionCard title="Notifications" description="Choose where to receive each type of alert.">
      <div role="table" aria-label="Notification preferences" className="flex flex-col">
        <div
          role="row"
          className={`${GRID} pb-2.5 border-b border-ln text-ink3 text-[12px] font-semibold tracking-[0.08em] uppercase`}
        >
          <span role="columnheader">Type</span>
          {CHANNELS.map((channel) => (
            <span key={channel.key} role="columnheader" className="text-center">
              {channel.label}
            </span>
          ))}
        </div>
        {items.map((item) => {
          const label = NOTIFICATION_CATEGORY_LABEL[item.category];
          return (
            <div
              key={item.category}
              role="row"
              className={`${GRID} min-h-17 py-2.5 border-b border-ln last:border-b-0`}
            >
              <span role="cell" className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{label}</span>
                <span className="text-ink3 text-[13px] leading-[1.4]">
                  {NOTIFICATION_CATEGORY_HINT[item.category]}
                </span>
              </span>
              {CHANNELS.map((channel) => (
                <span key={channel.key} role="cell" className="flex justify-center">
                  <Switch
                    aria-label={`${label} ${channel.spoken}`}
                    checked={item[channel.key]}
                    disabled={saving === `${item.category}:${channel.key}`}
                    onCheckedChange={(on) => void change(item, channel.key, on)}
                  />
                </span>
              ))}
            </div>
          );
        })}
      </div>
      <p className="text-ink3 text-[13px] leading-[1.5]">
        Emails go to your institute address. Exam requests, verified certifications and exam
        sessions will get their own rows when those features arrive.
      </p>
      {toast && <Toast key={toast.id} message={toast.message} tone={toast.tone} />}
    </SectionCard>
  );
}
