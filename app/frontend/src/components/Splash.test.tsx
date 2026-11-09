import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SPLASH_COOKIE } from '@/lib/preferences';
import { Splash } from './Splash';

const splash = (container: HTMLElement) => container.querySelector('[data-splash]');

/** jsdom has no Web Animations API. `animations` is what the backdrop reports as running. */
function stubAnimations(animations: { finished: Promise<unknown> }[]) {
  Element.prototype.getAnimations = vi.fn(() => animations as unknown as Animation[]);
}

function controlledAnimation() {
  let finish = () => {};
  let cancel = () => {};
  const finished = new Promise<void>((resolve, reject) => {
    finish = resolve;
    cancel = () => reject(new DOMException('Cancelled', 'AbortError'));
  });
  stubAnimations([{ finished }]);
  return { finish: () => finish(), cancel: () => cancel() };
}

describe('Splash', () => {
  beforeEach(() => {
    controlledAnimation();
  });

  it('stays out of the way of keyboards and screen readers', () => {
    const { container } = render(<Splash />);
    expect(splash(container)).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('button, a, [tabindex]')).toHaveLength(0);
  });

  it('remembers for this browser session that it was shown', () => {
    render(<Splash />);
    expect(document.cookie).toContain(`${SPLASH_COOKIE}=1`);
  });

  it('removes itself once the backdrop has finished opening', async () => {
    const animation = controlledAnimation();
    const { container } = render(<Splash />);
    expect(splash(container)).not.toBeNull();

    await act(async () => animation.finish());
    expect(splash(container)).toBeNull();
  });

  it('removes itself if the animation is cancelled', async () => {
    const animation = controlledAnimation();
    const { container } = render(<Splash />);

    await act(async () => animation.cancel());
    expect(splash(container)).toBeNull();
  });

  it('removes itself when there is no animation, as with reduced motion', async () => {
    stubAnimations([]);
    const { container } = render(<Splash />);
    await waitFor(() => expect(splash(container)).toBeNull());
  });
});
