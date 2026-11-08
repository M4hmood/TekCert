import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SPLASH_COOKIE } from '@/lib/preferences';
import { Splash } from './Splash';

const splash = (container: HTMLElement) => container.querySelector('[data-splash]');

describe('Splash', () => {
  it('stays out of the way of keyboards and screen readers', () => {
    const { container } = render(<Splash />);
    expect(splash(container)).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('button, a, [tabindex]')).toHaveLength(0);
  });

  it('remembers for this browser session that it was shown', () => {
    render(<Splash />);
    expect(document.cookie).toContain(`${SPLASH_COOKIE}=1`);
  });

  it('removes itself when the backdrop has finished opening', () => {
    const { container } = render(<Splash />);
    const element = splash(container);
    if (!element) throw new Error('no splash');

    // An animation of something inside it doesn't count.
    const tick = element.querySelector('line');
    if (!tick) throw new Error('no tick');
    fireEvent.animationEnd(tick);
    expect(splash(container)).not.toBeNull();

    fireEvent.animationEnd(element);
    expect(splash(container)).toBeNull();
  });
});
