import type { NotificationPreference, SavedEnrolment, Settings } from '@tekcert/types';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountSection } from './AccountSection';
import { AppearanceSection } from './AppearanceSection';
import { enrolmentInput, enrolmentLine, EnrolmentSection } from './EnrolmentSection';
import { NotificationPrefsSection } from './NotificationPrefsSection';
import { PrivacySection } from './PrivacySection';
import { parseSection, sectionOfPath } from './sections';
import { SettingsNav } from './SettingsNav';
import { yearAnswer, yearChoices, YearPrompt } from './YearPrompt';

const router = { refresh: vi.fn(), push: vi.fn(), replace: vi.fn() };
const pathname = vi.hoisted(() => ({ current: '/settings' }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => pathname.current,
}));

const specialties: Settings['specialties'] = [
  { code: 'SDIA', name: 'AI & Data Science', hue: 285 },
  { code: 'CIM', name: 'Cloud Infrastructure Management', hue: 225 },
  { code: 'SSIR', name: 'Systems & Network Security', hue: 15 },
];
const enrolment = (overrides: Partial<SavedEnrolment> = {}): SavedEnrolment => ({
  year: 4,
  group: 'A',
  specialty: 'CIM',
  targetSpecialty: null,
  classCode: 'ING-4-CIM-A',
  classmates: 12,
  ...overrides,
});
const settings = (overrides: Partial<Settings> = {}): Settings => ({
  account: { firstName: 'Yassine', lastName: 'Ben Amor', email: 'yassine.benamor@tek-up.de' },
  enrolment: enrolment(),
  alumni: false,
  privacy: { leaderboardVisible: true, availableToHelp: false },
  theme: null,
  academicYear: { year: 2026, label: '2026-27', due: false },
  specialties,
  ...overrides,
});

function mockApi(body: unknown, status = 200) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
    Response.json(body, { status }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const lastCall = (mock: ReturnType<typeof mockApi>) =>
  mock.mock.calls.at(-1) as [string, RequestInit | undefined];
const sentBody = (mock: ReturnType<typeof mockApi>) =>
  JSON.parse(String(lastCall(mock)[1]?.body)) as unknown;
const SERVER_ERROR = { type: 'about:blank', title: 'Server error', status: 500 };

beforeEach(() => {
  pathname.current = '/settings';
  router.refresh.mockClear();
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: false, media: query })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('settings sections', () => {
  it('knows its sections and opens on Account', () => {
    expect(parseSection('privacy')).toBe('privacy');
    expect(parseSection('billing')).toBeNull();
    expect(sectionOfPath('/settings')).toBe('account');
    expect(sectionOfPath('/settings/appearance')).toBe('appearance');
    expect(sectionOfPath('/settings/unknown')).toBe('account');
  });

  it('lists the five sections and marks the open one', () => {
    pathname.current = '/settings/enrolment';
    render(<SettingsNav />);
    const nav = screen.getByRole('navigation', { name: 'Settings sections' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/settings/account',
      '/settings/enrolment',
      '/settings/privacy',
      '/settings/notifications',
      '/settings/appearance',
    ]);
    expect(within(nav).getByRole('link', { current: 'page' })).toHaveTextContent('Enrolment');
  });
});

describe('AccountSection', () => {
  it('saves a new name and refreshes the shell', async () => {
    const user = userEvent.setup();
    const api = mockApi(
      settings({ account: { ...settings().account, firstName: 'Yasmine', lastName: 'Trabelsi' } }),
    );
    render(<AccountSection account={settings().account} />);
    const save = screen.getByRole('button', { name: 'Save' });
    // Nothing changed yet.
    expect(save).toBeDisabled();
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Email')).toHaveValue('yassine.benamor@tek-up.de');

    await user.clear(screen.getByLabelText('First name'));
    await user.type(screen.getByLabelText('First name'), ' Yasmine ');
    await user.clear(screen.getByLabelText('Last name'));
    await user.type(screen.getByLabelText('Last name'), 'Trabelsi');
    await user.click(save);

    expect(await screen.findByRole('status')).toHaveTextContent('Name saved');
    const [url, init] = lastCall(api);
    expect(url).toBe('/api/me/account');
    expect(init).toMatchObject({ method: 'PATCH' });
    expect(sentBody(api)).toEqual({ firstName: 'Yasmine', lastName: 'Trabelsi' });
    expect(screen.getByLabelText('First name')).toHaveValue('Yasmine');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('refuses an empty name before calling the API', async () => {
    const user = userEvent.setup();
    const api = mockApi(settings());
    render(<AccountSection account={settings().account} />);
    await user.clear(screen.getByLabelText('First name'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Required');
    expect(screen.getByLabelText('First name')).toBeInvalid();
    expect(api).not.toHaveBeenCalled();
  });

  it('says so when saving fails', async () => {
    const user = userEvent.setup();
    mockApi(SERVER_ERROR, 500);
    render(<AccountSection account={settings().account} />);
    await user.type(screen.getByLabelText('Last name'), 'x');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Couldn’t save. Try again.');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('downloads my data as a CSV file', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response('record,code\r\n', { headers: { 'content-type': 'text/csv' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const createObjectURL = vi.fn(() => 'blob:export');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    const clicked: { href: string; download: string }[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push({ href: this.href, download: this.download });
    });

    render(<AccountSection account={settings().account} />);
    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Your data was downloaded');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/me/export.csv');
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clicked).toEqual([{ href: 'blob:export', download: 'tekcert-export.csv' }]);
    click.mockRestore();
  });

  it('says so when the export fails', async () => {
    const user = userEvent.setup();
    mockApi(SERVER_ERROR, 500);
    render(<AccountSection account={settings().account} />);
    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Couldn’t export your data. Try again.',
    );
  });
});

describe('enrolment helpers', () => {
  it('builds what Save sends for each kind of year', () => {
    expect(enrolmentInput(4, 'A', 'CIM')).toEqual({ year: 4, specialty: 'CIM', group: 'A' });
    expect(enrolmentInput(5, 'B', null)).toBeNull();
    expect(enrolmentInput(2, 'C', 'SSIR')).toEqual({
      year: 2,
      targetSpecialty: 'SSIR',
      group: 'C',
    });
    expect(enrolmentInput(1, 'D', null)).toEqual({ year: 1, targetSpecialty: null, group: 'D' });
  });

  it('writes the class as a line', () => {
    expect(enrolmentLine(4, 'A', 'CIM')).toBe('ING-4 CIM · group A');
    // A target specialty isn't part of the class.
    expect(enrolmentLine(2, 'B', 'CIM')).toBe('ING-2 · group B');
  });
});

describe('EnrolmentSection', () => {
  const section = (overrides: Partial<Settings> = {}) => {
    const s = settings(overrides);
    return render(
      <EnrolmentSection
        enrolment={s.enrolment ?? enrolment()}
        alumni={s.alumni}
        academicYear={s.academicYear}
        specialties={s.specialties}
        firstName={s.account.firstName}
      />,
    );
  };

  it('shows my class and saves another specialty', async () => {
    const user = userEvent.setup();
    const api = mockApi(
      settings({ enrolment: enrolment({ specialty: 'SSIR', classCode: 'ING-4-SSIR-A' }) }),
    );
    section();
    const group = screen.getByRole('radiogroup', { name: 'Specialty' });
    expect(within(group).getByRole('radio', { name: /CIM/ })).toBeChecked();
    // ING-4 and 5 have a specialty: there is no "Undecided".
    expect(within(group).queryByRole('radio', { name: /Undecided/ })).not.toBeInTheDocument();
    expect(screen.getByText('ING-4 CIM · group A')).toBeInTheDocument();
    expect(screen.queryByText(/academic year not confirmed/)).not.toBeInTheDocument();

    await user.click(within(group).getByRole('radio', { name: /SSIR/ }));
    expect(screen.getByText('ING-4 SSIR · group A')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Enrolment saved');
    const [url, init] = lastCall(api);
    expect(url).toBe('/api/me/enrolment');
    expect(init).toMatchObject({ method: 'PUT' });
    expect(sentBody(api)).toEqual({ year: 4, specialty: 'SSIR', group: 'A' });
    expect(router.refresh).toHaveBeenCalled();
  });

  it('asks which specialty I aim for in ING-1 to 3, undecided included', async () => {
    const user = userEvent.setup();
    const saved = enrolment({
      year: 2,
      specialty: null,
      targetSpecialty: 'CIM',
      classCode: 'ING-2-A',
    });
    const api = mockApi(settings({ enrolment: { ...saved, targetSpecialty: null } }));
    section({ enrolment: saved });
    const group = screen.getByRole('radiogroup', { name: 'Specialty you’re aiming for' });
    expect(within(group).getByRole('radio', { name: /CIM/ })).toBeChecked();
    expect(screen.getByText(/You choose your specialty in ING-4/)).toHaveTextContent(
      'your recommended path is the CIM path.',
    );

    await user.click(within(group).getByRole('radio', { name: /Undecided/ }));
    expect(screen.getByText(/You choose your specialty in ING-4/)).toHaveTextContent(
      'your recommended path is Fundamentals.',
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByRole('status');
    expect(sentBody(api)).toEqual({ year: 2, targetSpecialty: null, group: 'A' });
  });

  it('shows the error the API gives, such as a class that doesn’t exist', async () => {
    const user = userEvent.setup();
    mockApi(
      {
        type: 'urn:tekcert:problem:unknown-class',
        title: 'Unknown class',
        status: 422,
        detail: 'There is no class ING-4-CIM-A.',
      },
      422,
    );
    section();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('status')).toHaveTextContent('There is no class ING-4-CIM-A.');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('opens the year prompt from the banner while the year is not confirmed', async () => {
    const user = userEvent.setup();
    section({ academicYear: { year: 2027, label: '2027-28', due: true } });
    expect(screen.getByText('2027-28 academic year not confirmed')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('2027-28 academic year');
    expect(dialog).toHaveTextContent('Last year you were in ING-4 CIM, group A.');
  });

  it('tells an alumnus how to come back', () => {
    section({ alumni: true });
    expect(screen.getByText('You’re in alumni mode.')).toBeInTheDocument();
  });
});

describe('year prompt helpers', () => {
  it('offers moving up, repeating or leaving, by year', () => {
    expect(yearChoices(3).map((choice) => [choice.label, choice.hint])).toEqual([
      ['I’m moving up to ING-4', 'Choose your specialty and group'],
      ['I’m repeating ING-3', 'Your path and points are kept'],
      ['I’m no longer at TEK-UP', 'Your profile switches to alumni mode'],
    ]);
    expect(yearChoices(1)[0]).toMatchObject({
      label: 'I’m moving up to ING-2',
      hint: 'Choose your group',
    });
    expect(yearChoices(5)[0]).toMatchObject({ label: 'I graduated' });
  });

  it('builds the answer the API expects', () => {
    expect(yearAnswer('repeat', { year: 3 }, 'A', null)).toEqual({ status: 'repeating' });
    expect(yearAnswer('left', { year: 3 }, 'A', null)).toEqual({ status: 'left' });
    expect(yearAnswer('up', { year: 1 }, 'B', null)).toEqual({ status: 'moving_up', group: 'B' });
    // Moving up to ING-4 needs a specialty.
    expect(yearAnswer('up', { year: 3 }, 'A', null)).toBeNull();
    expect(yearAnswer('up', { year: 3 }, 'A', 'CIM')).toEqual({
      status: 'moving_up',
      group: 'A',
      specialty: 'CIM',
    });
    // The specialty carries over from ING-4 to ING-5.
    expect(yearAnswer('up', { year: 4 }, 'C', 'CIM')).toEqual({ status: 'moving_up', group: 'C' });
    // Graduating is leaving.
    expect(yearAnswer('up', { year: 5 }, 'A', 'CIM')).toEqual({ status: 'left' });
  });
});

describe('YearPrompt', () => {
  const ing3 = enrolment({
    year: 3,
    specialty: null,
    targetSpecialty: 'CIM',
    classCode: 'ING-3-A',
  });
  const prompt = (saved: SavedEnrolment = ing3, onConfirmed = vi.fn()) => {
    render(
      <YearPrompt
        firstName="Yassine"
        enrolment={saved}
        specialties={specialties}
        yearLabel="2027-28"
        defaultOpen
        onConfirmed={onConfirmed}
      />,
    );
    return onConfirmed;
  };

  it('asks where I am this year, moving up being the first answer', () => {
    prompt();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('2027-28 academic year');
    expect(dialog).toHaveTextContent('Welcome back, Yassine');
    expect(dialog).toHaveTextContent('Last year you were in ING-3, group A.');
    const choices = within(dialog).getAllByRole('radio');
    expect(choices.map((choice) => choice.textContent)).toEqual([
      'I’m moving up to ING-4Choose your specialty and group',
      'I’m repeating ING-3Your path and points are kept',
      'I’m no longer at TEK-UPYour profile switches to alumni mode',
    ]);
    expect(choices[0]).toBeChecked();
    // The specialty I aimed for is already chosen.
    expect(within(dialog).getByRole('combobox', { name: 'Specialty' })).toHaveTextContent(
      'CIM · Cloud Infrastructure Management',
    );
    expect(within(dialog).getByRole('combobox', { name: 'Group in ING-4' })).toHaveTextContent(
      'Group A',
    );
  });

  it('moves me up with the specialty and group, then closes and confirms', async () => {
    const user = userEvent.setup();
    const next = settings({
      enrolment: enrolment({ year: 4, specialty: 'CIM', classCode: 'ING-4-CIM-A' }),
    });
    const api = mockApi(next);
    const onConfirmed = prompt();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByRole('status')).toHaveTextContent('Academic year confirmed');
    const [url, init] = lastCall(api);
    expect(url).toBe('/api/me/academic-year');
    expect(init).toMatchObject({ method: 'POST' });
    expect(sentBody(api)).toEqual({ status: 'moving_up', group: 'A', specialty: 'CIM' });
    expect(onConfirmed).toHaveBeenCalledWith(next);
  });

  it('needs a specialty before moving an undecided student up to ING-4', async () => {
    const user = userEvent.setup();
    const api = mockApi(settings());
    prompt({ ...ing3, targetSpecialty: null });
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Choose your specialty to move up to ING-4.',
    );
    expect(api).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('repeats the year without asking for a class', async () => {
    const user = userEvent.setup();
    const api = mockApi(settings());
    prompt();
    await user.click(screen.getByRole('radio', { name: /I’m repeating ING-3/ }));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    expect(sentBody(api)).toEqual({ status: 'repeating' });
  });

  it('treats graduating from ING-5 as leaving', async () => {
    const user = userEvent.setup();
    const api = mockApi(settings({ alumni: true }));
    prompt(enrolment({ year: 5, classCode: 'ING-5-CIM-A' }));
    expect(screen.getByRole('radio', { name: /I graduated/ })).toBeChecked();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    expect(sentBody(api)).toEqual({ status: 'left' });
  });

  it('shows what the API refuses and stays open', async () => {
    const user = userEvent.setup();
    mockApi(
      {
        type: 'urn:tekcert:problem:academic-year-already-confirmed',
        title: 'Academic year already confirmed',
        status: 409,
        detail: 'Change your class in Settings › Enrolment instead.',
      },
      409,
    );
    prompt();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Change your class in Settings › Enrolment instead.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('hides for a day with "Remind me tomorrow"', async () => {
    const user = userEvent.setup();
    const api = mockApi(settings());
    prompt();
    await user.click(screen.getByRole('button', { name: 'Remind me tomorrow' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.cookie).toContain('year_prompt_snoozed=1');
    expect(api).not.toHaveBeenCalled();
  });
});

describe('PrivacySection', () => {
  it('has the two switches and no way to hide the profile', async () => {
    const user = userEvent.setup();
    const api = mockApi({ availableToHelp: false, leaderboardVisible: false });
    render(<PrivacySection privacy={settings().privacy} />);
    expect(screen.getAllByRole('switch')).toHaveLength(2);
    expect(screen.getByText(/visible to every signed-in student/)).toBeInTheDocument();

    const leaderboard = screen.getByRole('switch', { name: 'Appear on the leaderboard' });
    expect(leaderboard).toBeChecked();
    await user.click(leaderboard);
    expect(leaderboard).not.toBeChecked();
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    expect(lastCall(api)[0]).toBe('/api/me/profile');
    expect(sentBody(api)).toEqual({ leaderboardVisible: false });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'You now appear as Anonymous on the leaderboard',
    );
  });
});

describe('NotificationPrefsSection', () => {
  const preferences: NotificationPreference[] = [
    { category: 'community', inApp: true, email: false },
    { category: 'leaderboard', inApp: true, email: false },
    { category: 'progress', inApp: true, email: true },
  ];

  it('lists each category with a switch per channel', () => {
    render(<NotificationPrefsSection initial={preferences} />);
    const table = screen.getByRole('table', { name: 'Notification preferences' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['Type', 'In the app', 'Email']);
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(screen.getByRole('switch', { name: 'Community in the app' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Community by email' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Progress by email' })).toBeChecked();
  });

  it('saves a switch as soon as it moves', async () => {
    const user = userEvent.setup();
    const saved = preferences.map((item) =>
      item.category === 'community' ? { ...item, email: true } : item,
    );
    const api = mockApi({ items: saved });
    render(<NotificationPrefsSection initial={preferences} />);
    const email = screen.getByRole('switch', { name: 'Community by email' });
    await user.click(email);

    expect(await screen.findByRole('status')).toHaveTextContent('Notification preferences saved');
    expect(email).toBeChecked();
    const [url, init] = lastCall(api);
    expect(url).toBe('/api/me/notification-preferences');
    expect(init).toMatchObject({ method: 'PUT' });
    // Only the row that changed, with both of its channels.
    expect(sentBody(api)).toEqual({
      items: [{ category: 'community', inApp: true, email: true }],
    });
  });

  it('puts the switch back when saving fails', async () => {
    const user = userEvent.setup();
    mockApi(SERVER_ERROR, 500);
    render(<NotificationPrefsSection initial={preferences} />);
    const inApp = screen.getByRole('switch', { name: 'Leaderboard in the app' });
    await user.click(inApp);
    expect(await screen.findByRole('status')).toHaveTextContent('Couldn’t save. Try again.');
    expect(inApp).toBeChecked();
  });
});

describe('AppearanceSection', () => {
  it('applies a theme at once and saves it in the cookie and on the account', async () => {
    const user = userEvent.setup();
    const api = mockApi(settings({ theme: 'dark' }));
    render(<AppearanceSection initial="system" />);
    const group = screen.getByRole('radiogroup', { name: 'Theme' });
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.textContent),
    ).toEqual(['Light', 'Dark', 'System']);
    expect(within(group).getByRole('radio', { name: 'System' })).toBeChecked();

    await user.click(within(group).getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.cookie).toContain('theme=dark');
    await waitFor(() => expect(within(group).getByRole('radio', { name: 'Dark' })).toBeChecked());
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    const [url, init] = lastCall(api);
    expect(url).toBe('/api/me/preferences');
    expect(init).toMatchObject({ method: 'PATCH' });
    expect(sentBody(api)).toEqual({ theme: 'dark' });
    expect(screen.getByRole('status')).toHaveTextContent('Dark theme on');
  });

  it('goes back to following the device', async () => {
    const user = userEvent.setup();
    const api = mockApi(settings({ theme: 'system' }));
    document.documentElement.dataset.theme = 'light';
    render(<AppearanceSection initial="light" />);
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'System' }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(document.cookie).toContain('theme=system');
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    expect(sentBody(api)).toEqual({ theme: 'system' });
    expect(screen.getByRole('status')).toHaveTextContent('Theme matches your device');
  });

  it('follows the theme button of the page header', async () => {
    render(<AppearanceSection initial="system" />);
    document.documentElement.dataset.theme = 'dark';
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked());
  });
});
