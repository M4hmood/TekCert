import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  document.cookie.split(';').forEach((c) => {
    document.cookie = `${c.split('=')[0]?.trim()}=; max-age=0; path=/`;
  });
  document.documentElement.removeAttribute('data-theme');
});
