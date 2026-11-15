'use client';

import { type Settings, SettingsSchema, UpdateAccountSchema } from '@tekcert/types';
import { Button, Field, Toast } from '@tekcert/ui';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { SignOutButton } from '@/components/SignOutButton';
import { patchJson, postJson, withSessionRefresh } from '@/lib/client-api';
import { useToast } from '@/lib/use-toast';
import { ActionRow, SectionCard } from './parts';

const EXPORT_PATH = '/api/me/export.csv';
const EXPORT_NAME = 'tekcert-export.csv';

/** The file, with one retry after renewing a session whose 15-minute token ran out. */
async function fetchExport(): Promise<Blob | null> {
  const get = () => fetch(EXPORT_PATH, { credentials: 'same-origin' });
  try {
    let res = await get();
    if (res.status === 401 && (await postJson('/auth/refresh')).ok) res = await get();
    return res.ok ? await res.blob() : null;
  } catch {
    return null;
  }
}

function saveFile(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Names, the read-only institute address, the data export and signing out. */
export function AccountSection({ account }: { account: Settings['account'] }) {
  const router = useRouter();
  const { toast, show } = useToast();
  const [saved, setSaved] = useState(account);
  const [firstName, setFirstName] = useState(account.firstName);
  const [lastName, setLastName] = useState(account.lastName);
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string }>({});
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const changed = firstName.trim() !== saved.firstName || lastName.trim() !== saved.lastName;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = UpdateAccountSchema.safeParse({ firstName, lastName });
    if (!parsed.success) {
      const message = (field: string) =>
        parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
      setErrors({ firstName: message('firstName'), lastName: message('lastName') });
      return;
    }
    setErrors({});
    setSaving(true);
    const result = await withSessionRefresh(() =>
      patchJson('/me/account', parsed.data, SettingsSchema),
    );
    setSaving(false);
    if (!result.ok) {
      show('Couldn’t save. Try again.', { tone: 'error' });
      return;
    }
    setSaved(result.data.account);
    setFirstName(result.data.account.firstName);
    setLastName(result.data.account.lastName);
    show('Name saved');
    // The sidebar shows the name and is rendered on the server.
    router.refresh();
  };

  const exportData = async () => {
    setExporting(true);
    const file = await fetchExport();
    setExporting(false);
    if (!file) {
      show('Couldn’t export your data. Try again.', { tone: 'error' });
      return;
    }
    saveFile(file, EXPORT_NAME);
    show('Your data was downloaded');
  };

  return (
    <SectionCard title="Account" description="Signed in with your TEK-UP account.">
      <form onSubmit={(event) => void save(event)} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <Field
            label="First name"
            name="firstName"
            autoComplete="given-name"
            maxLength={80}
            value={firstName}
            error={errors.firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
          <Field
            label="Last name"
            name="lastName"
            autoComplete="family-name"
            maxLength={80}
            value={lastName}
            error={errors.lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </div>
        <Field
          label="Email"
          name="email"
          type="email"
          value={saved.email}
          readOnly
          aria-describedby="settings-email-note"
          className="[&_input]:border-ln [&_input]:bg-sf2 [&_input]:text-ink2"
        >
          <span id="settings-email-note" className="text-ink3 text-[13px]">
            Your institute address identifies your account and can’t be changed.
          </span>
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={!changed || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>

      <div className="flex flex-col border-t border-ln">
        <ActionRow
          title="Export my data"
          meta="Certifications, finished chapters and points as CSV"
          action={
            <Button
              variant="secondary"
              icon="download"
              disabled={exporting}
              onClick={() => void exportData()}
            >
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
          }
        />
        <ActionRow title="Sign out" meta="On this device" action={<SignOutButton />} />
      </div>

      {toast && <Toast key={toast.id} message={toast.message} tone={toast.tone} />}
    </SectionCard>
  );
}
