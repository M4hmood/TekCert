import { base } from '@tekcert/config/eslint/base';

export default [
  ...base,
  { ignores: ['jest*.config.js'] },
  {
    // Nest resolves providers from emitted decorator metadata, so injected
    // classes must be value imports, never `import type`.
    rules: { '@typescript-eslint/consistent-type-imports': 'off' },
  },
];
