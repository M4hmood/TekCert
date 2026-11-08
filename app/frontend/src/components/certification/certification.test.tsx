import type { CertificationCommunity, CertificationResource } from '@tekcert/types';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CertificationView, type CertificationViewProps } from './CertificationView';
import { CommunityPanel } from './CommunityPanel';
import { examDuration, studyTime } from './format';
import { ResourcesPanel } from './ResourcesPanel';
import { parseTab } from './tabs';

function view(overrides: Partial<CertificationViewProps> = {}) {
  return render(
    <CertificationView
      slug="saa-c03"
      code="SAA-C03"
      topBar={<nav>Catalog</nav>}
      header={<h1>AWS Solutions Architect</h1>}
      panels={{
        overview: <p>Overview panel</p>,
        syllabus: <p>Syllabus panel</p>,
        resources: <p>Resources panel</p>,
        community: <p>Community panel</p>,
      }}
      counts={{ syllabus: 11, resources: 7 }}
      initialTab="overview"
      initialStatus={null}
      preparingCount={23}
      {...overrides}
    />,
  );
}

/** Answers every /api call with `body` and `status`. */
function mockApi(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  window.history.replaceState(null, '', '/catalog/saa-c03');
});

describe('CertificationView', () => {
  it('shows one tab panel at a time and keeps the tab in the URL', async () => {
    const user = userEvent.setup();
    view();
    expect(screen.getByText('Overview panel')).toBeVisible();
    expect(screen.getByText('Syllabus panel')).not.toBeVisible();

    await user.click(screen.getByRole('tab', { name: /Syllabus/ }));
    expect(screen.getByText('Syllabus panel')).toBeVisible();
    expect(window.location.search).toBe('?tab=syllabus');

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Resources/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Resources/ })).toHaveFocus();
  });

  it('starts the certification: in progress, syllabus open, toast', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({
      slug: 'saa-c03',
      status: 'in_progress',
      since: '2026-10-30T10:00:00.000Z',
    });
    view();
    const status = screen.getByRole('region', { name: 'My status' });
    expect(status).toHaveTextContent('Available');
    expect(status).toHaveTextContent('23 students preparing it');

    await user.click(within(status).getByRole('button', { name: 'Start' }));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/me/preparations/saa-c03',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(status).toHaveTextContent('In progress');
    expect(status).toHaveTextContent('Started October 30');
    expect(screen.getByRole('tab', { name: /Syllabus/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('SAA-C03 started');
  });

  it('shows the API error when Start fails', async () => {
    const user = userEvent.setup();
    mockApi(
      { type: 'urn:x', title: 'Conflict', status: 409, detail: 'You already hold SAA-C03.' },
      409,
    );
    view();
    await user.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByRole('alert')).toHaveTextContent('You already hold SAA-C03.');
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
  });

  it('has no Start for a certification already held', () => {
    view({
      initialStatus: { slug: 'saa-c03', status: 'unverified', since: '2026-10-09T10:00:00.000Z' },
    });
    const status = screen.getByRole('region', { name: 'My status' });
    expect(status).toHaveTextContent('Unverified');
    expect(status).toHaveTextContent('Declared October 9');
    expect(within(status).queryByRole('button')).toBeNull();
  });
});

describe('ResourcesPanel', () => {
  const resources: CertificationResource[] = [
    {
      kind: 'doc',
      title: 'Exam guide',
      url: 'https://docs.aws.amazon.com/guide',
      source: 'docs.aws.amazon.com',
      duration: '30 min',
    },
    {
      kind: 'lab',
      title: 'Labs',
      url: 'https://workshops.aws/',
      source: 'workshops.aws',
      duration: null,
    },
  ];

  it('opens external links in a new tab and filters by type', async () => {
    const user = userEvent.setup();
    render(<ResourcesPanel resources={resources} />);
    const guide = screen.getByRole('link', { name: /Exam guide/ });
    expect(guide).toHaveAttribute('target', '_blank');
    expect(guide).toHaveAttribute('rel', 'noopener noreferrer');
    expect(guide).toHaveTextContent('Official documentation · docs.aws.amazon.com · 30 min');

    await user.click(screen.getByRole('button', { name: 'Labs' }));
    expect(screen.queryByRole('link', { name: /Exam guide/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Videos' }));
    expect(screen.getByText('No resources of this type yet.')).toBeInTheDocument();
  });
});

describe('CommunityPanel', () => {
  const person = {
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    firstName: 'Ons',
    lastName: 'Ben Salah',
    avatarPath: null,
    classCode: 'ING-4-CIM-A',
    year: 4 as const,
    specialty: 'CIM' as const,
    email: 'ons.bensalah@tek-up.de',
    since: '2026-06-01T10:00:00.000Z',
  };
  const data: CertificationCommunity = {
    earned: { total: 1, items: [person] },
    preparing: { total: 0, items: [] },
  };

  it('lists people with a mail link and reloads for another scope', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({
      earned: { total: 0, items: [] },
      preparing: { total: 0, items: [] },
    });
    render(
      <CommunityPanel slug="saa-c03" initialQuery={{ scope: 'institute' }} initialData={data} />,
    );

    const earned = screen.getByRole('region', { name: 'Earned it' });
    expect(earned).toHaveTextContent('Ons Ben Salah');
    expect(within(earned).getByRole('link', { name: 'Email Ons Ben Salah' })).toHaveAttribute(
      'href',
      'mailto:ons.bensalah@tek-up.de',
    );
    expect(screen.getByRole('region', { name: 'Preparing it' })).toHaveTextContent(
      'Nobody for this filter yet.',
    );

    await user.click(screen.getByRole('radio', { name: 'My class' }));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/certifications/saa-c03/community?scope=class',
      expect.anything(),
    );
    expect(window.location.search).toBe('?scope=class');
    expect(await screen.findAllByText('Nobody for this filter yet.')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(window.location.search).toBe('');
  });
});

describe('format', () => {
  it('formats exam and study times', () => {
    expect(examDuration(130)).toBe('130 min');
    expect(examDuration(130, true)).toBe('130 minutes');
    expect(examDuration(2880)).toBe('48 h');
    expect(studyTime(90)).toBe('1 h 30');
    expect(studyTime(180)).toBe('3 h');
    expect(studyTime(45)).toBe('45 min');
  });

  it('falls back to the overview for an unknown tab', () => {
    expect(parseTab('community')).toBe('community');
    expect(parseTab('tests')).toBe('overview');
    expect(parseTab(undefined)).toBe('overview');
  });
});
