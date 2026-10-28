import { AUTH_PROBLEM } from '@tekcert/types';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckInbox, formatCountdown } from './CheckInbox';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

/** Answers the next /api call with the given status and JSON body. */
function mockApi(status: number, body: unknown) {
  const fetchMock = vi.fn(async () =>
    status === 204 ? new Response(null, { status }) : Response.json(body, { status }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const USER = {
  id: '6f1f0c8e-2b6c-4f3a-9d43-6d1e2a7b9c10',
  email: 'yassine.benamor@tek-up.de',
  firstName: 'Yassine',
  lastName: 'Ben Amor',
  role: 'student',
  profileVisible: false,
};

beforeEach(() => {
  router.replace.mockReset();
  router.refresh.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SignInForm', () => {
  async function fillAndSubmit(email = 'yassine.benamor@tek-up.de', password = 'secret-pass-1!') {
    await userEvent.type(screen.getByLabelText('Institute email'), email);
    await userEvent.type(screen.getByLabelText('Password'), password);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  }

  it('shows the domain error inline without calling the API', async () => {
    const fetchMock = mockApi(200, USER);
    render(<SignInForm />);
    await fillAndSubmit('someone@gmail.com');
    expect(screen.getByRole('alert')).toHaveTextContent('Use your @tek-up.de address');
    expect(screen.getByLabelText('Institute email')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends "stay signed in" and goes to the requested page', async () => {
    const fetchMock = mockApi(200, USER);
    render(<SignInForm next="/catalog?q=aws" />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Stay signed in on this device' }));
    await fillAndSubmit();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/auth/sign-in');
    expect(JSON.parse(String(init.body))).toMatchObject({ remember: true });
    expect(router.replace).toHaveBeenCalledWith('/catalog?q=aws');
  });

  it('ignores a next parameter that points to another site', async () => {
    mockApi(200, USER);
    render(<SignInForm next="//evil.example" />);
    await fillAndSubmit();
    expect(router.replace).toHaveBeenCalledWith('/dashboard');
  });

  it('shows the attempts left after a wrong password', async () => {
    mockApi(401, {
      type: AUTH_PROBLEM.invalidCredentials,
      title: 'Incorrect email or password',
      status: 401,
      attemptsLeft: 4,
    });
    render(<SignInForm />);
    await fillAndSubmit();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Incorrect email or password. You have 4 attempts left before a 15-minute lockout.',
    );
  });

  it('explains the lockout', async () => {
    mockApi(429, {
      type: AUTH_PROBLEM.locked,
      title: 'Too many attempts',
      status: 429,
      retryAfterSeconds: 840,
    });
    render(<SignInForm />);
    await fillAndSubmit();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Too many attempts. Try again in 14 minutes.',
    );
  });

  it('offers to resend the link to an unverified account', async () => {
    mockApi(403, {
      type: AUTH_PROBLEM.emailNotVerified,
      title: 'Confirm your email first',
      status: 403,
    });
    render(<SignInForm />);
    await fillAndSubmit();
    mockApi(202, { status: 'accepted' });
    await userEvent.click(screen.getByRole('button', { name: 'Resend link' }));
    expect(await screen.findByRole('heading', { name: 'Check your inbox' })).toBeInTheDocument();
  });
});

describe('SignUpForm', () => {
  it('ticks password rules as the student types', async () => {
    render(<SignUpForm />);
    const rules = () =>
      screen.getAllByRole('listitem').map((li) => li.getAttribute('data-met') === 'true');
    expect(rules()).toEqual([false, false, false]);
    await userEvent.type(screen.getByLabelText('Password'), 'abcdefg1');
    expect(rules()).toEqual([true, true, false]);
    await userEvent.type(screen.getByLabelText('Password'), '!');
    expect(rules()).toEqual([true, true, true]);
  });

  it('recognises the institute address', async () => {
    render(<SignUpForm />);
    await userEvent.type(screen.getByLabelText('Institute email'), 'yassine.benamor@tek-up.de');
    expect(screen.getByText('Institute address recognised')).toBeInTheDocument();
  });

  it('starts with the visibility consent unticked and sends it only when ticked', async () => {
    const fetchMock = mockApi(202, { status: 'accepted' });
    render(<SignUpForm />);
    const consent = screen.getByRole('checkbox');
    expect(consent).not.toBeChecked();

    await userEvent.type(screen.getByLabelText('First name'), 'Yassine');
    await userEvent.type(screen.getByLabelText('Last name'), 'Ben Amor');
    await userEvent.type(screen.getByLabelText('Institute email'), 'yassine.benamor@tek-up.de');
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse-9');
    await userEvent.click(consent);
    await userEvent.click(screen.getByRole('button', { name: 'Create my account' }));

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({ profileVisible: true });
    expect(await screen.findByText(/A link valid for 24 hours was sent to/)).toBeInTheDocument();
  });

  it('flags each invalid field before calling the API', async () => {
    const fetchMock = mockApi(202, { status: 'accepted' });
    render(<SignUpForm />);
    await userEvent.type(screen.getByLabelText('Institute email'), 'someone@gmail.com');
    await userEvent.click(screen.getByRole('button', { name: 'Create my account' }));
    expect(screen.getAllByRole('alert').map((a) => a.textContent)).toEqual([
      'errorRequired',
      'errorRequired',
      'errorUse your @tek-up.de address',
      'errorPassword needs: 8 characters',
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('CheckInbox', () => {
  it('counts down before allowing a resend', async () => {
    vi.useFakeTimers();
    const onResend = vi.fn(async () => undefined);
    render(<CheckInbox email="a@tek-up.de" onResend={onResend} />);
    expect(screen.getByRole('button', { name: 'Resend in 1:00' })).toBeDisabled();

    for (let i = 0; i < 60; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
    }
    const resend = screen.getByRole('button', { name: 'Resend link' });
    vi.useRealTimers();
    await userEvent.click(resend);
    expect(onResend).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Resend in 1:00' })).toBeDisabled();
  });

  it('formats the countdown like the design', () => {
    expect(formatCountdown(58)).toBe('0:58');
    expect(formatCountdown(60)).toBe('1:00');
  });
});
