import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-unused-disable': 'off',
      'prefer-const': 'off',
    },
  },
  {
    ignores: ['**/dist/**', '**/dist-electron/**', '**/vite-plugins/**', '**/.flowbite-react/**', '**/node_modules/**'],
  },
);
