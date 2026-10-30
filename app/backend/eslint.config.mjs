import { base } from '@tekcert/config/eslint/base';

export default [
  ...base,
  { ignores: ['jest*.config.js'] },
  {
    // Nest resolves providers from emitted decorator metadata, so injected
    // classes must be value imports, never `import type`.
    rules: { '@typescript-eslint/consistent-type-imports': 'off' },
  },
  {
    // Module boundaries (ADR-017): a module reaches another module's data through the
    // services it exports. Naming another module's entity as a type is fine.
    files: ['src/**/*.ts'],
    ignores: ['src/database/**', 'src/**/entities/*.entity.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*/entities/*', '../../*/entities/*'],
              allowTypeImports: true,
              message: "Use the owning module's exported service instead of its entities.",
            },
          ],
        },
      ],
    },
  },
];
