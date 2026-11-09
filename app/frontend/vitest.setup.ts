import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Browser APIs that Radix relies on and jsdom doesn't have.
Element.prototype.hasPointerCapture = () => false;
Element.prototype.setPointerCapture = () => undefined;
Element.prototype.releasePointerCapture = () => undefined;
Element.prototype.scrollIntoView = vi.fn();
HTMLMediaElement.prototype.play = () => Promise.resolve();
HTMLMediaElement.prototype.pause = () => undefined;
window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => {
  cleanup();
  document.cookie.split(';').forEach((c) => {
    document.cookie = `${c.split('=')[0]?.trim()}=; max-age=0; path=/`;
  });
  document.documentElement.removeAttribute('data-theme');
});
