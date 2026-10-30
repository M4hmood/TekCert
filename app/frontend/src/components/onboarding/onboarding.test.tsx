import type { CertificationSummary, OnboardingState } from '@tekcert/types';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingWizard } from './OnboardingWizard';
import { photoProblem } from './PhotoStep';
import { ResultStep } from './ResultStep';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const STATE: OnboardingState = {
  step: 1,
  completed: false,
  firstName: 'Yassine',
  lastName: 'Ben Amor',
  enrolment: null,
  certificationSlugs: [],
  leaderboardVisible: true,
  avatarPath: null,
  specialties: [
    { code: 'SDIA', name: 'AI & Data Science', hue: 285, pathPreview: ['PCEP', 'PCAP'] },
    {
      code: 'CIM',
      name: 'Cloud Infrastructure Management',
      hue: 225,
      pathPreview: ['CLF-C02', 'SAA-C03', 'SOA-C03'],
    },
  ],
};

function cert(code: string, name: string, provider = 'AWS'): CertificationSummary {
  return {
    code,
    slug: code.toLowerCase(),
    name,
    examCode: null,
    level: 'associate',
    difficulty: 2,
    provider: { code: provider, name: provider, hue: 55 },
    forAllSpecialties: true,
    specialties: [],
    chapterCount: 10,
    badgeAsset: null,
  };
}

const CERTS = [
  cert('CLF-C02', 'AWS Certified Cloud Practitioner'),
  cert('AZ-900', 'Microsoft Azure Fundamentals', 'AZURE'),
  cert('RHCSA', 'Red Hat Certified System Administrator', 'REDHAT'),
];

/** Answers every /api call with the given body (status 200). */
function mockApi(body: (url: string, init: RequestInit) => unknown) {
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => Response.json(body(url, init)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const heading = () => screen.getByRole('heading', { level: 1 });
const continueButton = () => screen.getByRole('button', { name: /^Continue/ });

beforeEach(() => {
  router.replace.mockReset();
  router.refresh.mockReset();
  window.history.replaceState(null, '', '/onboarding');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OnboardingWizard', () => {
  it('starts on the year step and continues once a year is picked', async () => {
    render(<OnboardingWizard initialState={STATE} initialStep={1} certifications={CERTS} />);
    expect(heading()).toHaveTextContent('Which year are you in?');
    expect(screen.getByText('Welcome, Yassine')).toBeInTheDocument();
    expect(continueButton()).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /ING-4/ }));
    expect(screen.getByRole('button', { name: /ING-4/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(continueButton());

    expect(heading()).toHaveTextContent('What’s your specialty?');
    expect(screen.getByText('Step 2 of 4 · Specialty')).toBeInTheDocument();
    expect(window.location.search).toBe('?step=2');
    expect(screen.getByText('Path: CLF-C02 → SAA-C03 → SOA-C03')).toBeInTheDocument();
  });

  it('asks ING-1…3 students for a target specialty and their group, then saves', async () => {
    const fetchMock = mockApi(() => ({
      ...STATE,
      step: 3,
      enrolment: {
        year: 3,
        group: 'B',
        specialty: null,
        targetSpecialty: null,
        classCode: 'ING-3-B',
        classmates: 12,
      },
    }));
    render(<OnboardingWizard initialState={STATE} initialStep={1} certifications={CERTS} />);
    await userEvent.click(screen.getByRole('button', { name: /ING-3/ }));
    await userEvent.click(continueButton());

    expect(heading()).toHaveTextContent('Which specialty are you aiming for?');
    expect(screen.getByText('Step 2 of 4 · Target specialty and group')).toBeInTheDocument();
    expect(continueButton()).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /Undecided/ }));
    const groups = screen.getByRole('group', { name: 'Your group in ING-3' });
    await userEvent.click(within(groups).getByRole('button', { name: 'Group B' }));
    expect(screen.getByText('ING-3-B')).toBeInTheDocument();
    await userEvent.click(continueButton());

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/onboarding/enrolment');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({ year: 3, targetSpecialty: null, group: 'B' });
    expect(heading()).toHaveTextContent('Do you already have certifications?');
  });

  it('resumes on a saved step with the earlier answers', () => {
    render(
      <OnboardingWizard
        initialState={{ ...STATE, step: 4, certificationSlugs: ['az-900'] }}
        initialStep={3}
        certifications={CERTS}
      />,
    );
    expect(heading()).toHaveTextContent('Do you already have certifications?');
    expect(screen.getByRole('button', { name: /Microsoft Azure Fundamentals/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('filters the certifications and shows when nothing matches', async () => {
    render(<OnboardingWizard initialState={STATE} initialStep={3} certifications={CERTS} />);
    const search = screen.getByRole('searchbox', { name: 'Search for a certification' });
    await userEvent.type(search, 'red hat');
    expect(screen.getAllByRole('button', { pressed: false }).map((b) => b.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining('RHCSA')]),
    );
    expect(screen.queryByText('AWS Certified Cloud Practitioner')).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, 'google');
    expect(screen.getByText('No certification matches “google”.')).toBeInTheDocument();
  });

  it('saves the picked certifications, or none when the step is skipped', async () => {
    const fetchMock = mockApi(() => ({ ...STATE, step: 4 }));
    render(<OnboardingWizard initialState={STATE} initialStep={3} certifications={CERTS} />);
    await userEvent.click(screen.getByRole('button', { name: /AWS Certified Cloud Practitioner/ }));
    await userEvent.click(continueButton());
    expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({
      slugs: ['clf-c02'],
    });
    expect(heading()).toHaveTextContent('Add a profile photo');

    // The header's Back button is for phones; the footer's is the desktop one.
    await userEvent.click(screen.getAllByRole('button', { name: 'Back' }).at(-1) as HTMLElement);
    await userEvent.click(screen.getByRole('button', { name: 'Skip this step' }));
    expect(JSON.parse(String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body))).toEqual({
      slugs: [],
    });
  });

  it('keeps profiles visible and lets the student leave the leaderboards', async () => {
    const fetchMock = mockApi((url) => (url.endsWith('/privacy') ? { ...STATE, step: 5 } : {}));
    render(<OnboardingWizard initialState={STATE} initialStep={4} certifications={CERTS} />);
    expect(screen.getByText('Your profile is visible to students')).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /visible profile/i })).not.toBeInTheDocument();

    const leaderboards = screen.getByRole('switch', { name: 'Appear on leaderboards' });
    expect(leaderboards).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(leaderboards);
    expect(leaderboards).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({
      leaderboardVisible: false,
    });
    expect(heading()).toHaveTextContent('Here’s your recommended path');
    // The mock path is malformed: the screen says so instead of waiting forever.
    expect(await screen.findByText('Your path could not be loaded.')).toBeInTheDocument();
  });

  it('shows the API problem and stays on the step when a save fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          { type: 'about:blank', title: 'Service unavailable', status: 503, detail: 'Try later.' },
          { status: 503 },
        ),
      ),
    );
    render(<OnboardingWizard initialState={STATE} initialStep={3} certifications={CERTS} />);
    await userEvent.click(continueButton());
    expect(screen.getByRole('alert')).toHaveTextContent('Service unavailable. Try later.');
    expect(heading()).toHaveTextContent('Do you already have certifications?');
  });

  it('finishes onboarding and opens the dashboard', async () => {
    const fetchMock = mockApi((url) =>
      url.endsWith('/complete')
        ? { ...STATE, step: 5, completed: true }
        : {
            path: { code: 'FOND', name: 'Fundamentals', hue: null },
            reason: 'undecided',
            track: [],
            certificationCount: 6,
            peers: { count: 0, initials: [] },
          },
    );
    render(
      <OnboardingWizard
        initialState={{ ...STATE, step: 5 }}
        initialStep={5}
        certifications={CERTS}
      />,
    );
    expect(await screen.findByText('Fundamentals')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Go to my dashboard' }));
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain('/api/onboarding/complete');
    expect(router.replace).toHaveBeenCalledWith('/dashboard');
  });
});

describe('ResultStep', () => {
  it('shows each node state, the peers and the path size', () => {
    render(
      <ResultStep
        failed={false}
        path={{
          path: { code: 'CIM', name: 'Cloud Infrastructure Management', hue: 225 },
          reason: 'specialty',
          track: [
            {
              code: 'CLF-C02',
              slug: 'clf-c02',
              name: 'Cloud Practitioner',
              level: 'foundational',
              state: 'held',
            },
            {
              code: 'SAA-C03',
              slug: 'saa-c03',
              name: 'Solutions Architect',
              level: 'associate',
              state: 'next',
            },
            {
              code: 'SOA-C03',
              slug: 'soa-c03',
              name: 'CloudOps Engineer',
              level: 'associate',
              state: 'locked',
            },
          ],
          certificationCount: 9,
          peers: { count: 23, initials: ['OB', 'SB', 'NK'] },
        }}
      />,
    );
    expect(screen.getByText('CIM · Cloud Infrastructure Management')).toBeInTheDocument();
    expect(screen.getByText(/your specialty’s path/)).toBeInTheDocument();
    const nodes = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(nodes.map((n) => n.dataset.state)).toEqual(['held', 'next', 'locked']);
    expect(nodes[0]).toHaveTextContent('CLF-C02 · Foundational');
    expect(nodes[0]).toHaveTextContent('Unverified');
    expect(nodes[1]).toHaveTextContent('Your next step');
    expect(nodes[2]).toHaveTextContent('Locked');
    expect(screen.getByText('23 students')).toBeInTheDocument();
    expect(screen.getByText('9 certifications in this path')).toBeInTheDocument();
  });

  it('says when the path could not be loaded', () => {
    render(<ResultStep failed path={null} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Your path could not be loaded.');
  });
});

describe('photoProblem', () => {
  it('accepts JPG and PNG up to 5 MB', () => {
    expect(photoProblem({ type: 'image/jpeg', size: 5 * 1024 * 1024 })).toBeNull();
    expect(photoProblem({ type: 'image/png', size: 1000 })).toBeNull();
  });

  it('explains what is wrong with other files', () => {
    expect(photoProblem({ type: 'image/gif', size: 1000 })).toBe('Use a JPG or PNG image.');
    expect(photoProblem({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toBe(
      'This photo is larger than 5 MB. Choose a smaller one.',
    );
  });
});
