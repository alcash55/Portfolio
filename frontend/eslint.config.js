// Flat config, replacing .eslintrc.cjs (ESLint 9 dropped the legacy format).
// The rule set below is the same one .eslintrc.cjs enforced, carried over
// rule for rule rather than taken wholesale from each plugin's current
// "recommended" export, so the flat-config move itself introduces no new
// findings.
//
// Two exceptions, both upstream renames rather than dropped coverage:
// - @typescript-eslint/ban-types was removed in typescript-eslint v8 and
//   split into three rules (no-empty-object-type, no-unsafe-function-type,
//   no-wrapper-object-types). All three are enabled below to keep the same
//   detections.
// - @typescript-eslint/no-var-requires was renamed to no-require-imports in
//   the same major. Enabled under its new name.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.base],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Same two rules .eslintrc.cjs pulled in via plugin:react-hooks/recommended.
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Same rule set as plugin:@typescript-eslint/recommended in the old
      // config (@typescript-eslint/eslint-plugin@6.14.0), rule for rule.
      '@typescript-eslint/ban-ts-comment': 'error',
      'no-array-constructor': 'off',
      '@typescript-eslint/no-array-constructor': 'error',
      '@typescript-eslint/no-duplicate-enum-values': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-extra-non-null-assertion': 'error',
      'no-loss-of-precision': 'off',
      '@typescript-eslint/no-loss-of-precision': 'error',
      '@typescript-eslint/no-misused-new': 'error',
      '@typescript-eslint/no-namespace': 'error',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
      '@typescript-eslint/no-this-alias': 'error',
      '@typescript-eslint/no-unnecessary-type-constraint': 'error',
      '@typescript-eslint/no-unsafe-declaration-merging': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/triple-slash-reference': 'error',
      // ban-types split three ways, see file header.
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/no-unsafe-function-type': 'error',
      '@typescript-eslint/no-wrapper-object-types': 'error',
      // no-var-requires, renamed.
      '@typescript-eslint/no-require-imports': 'error',

      // eslint:recommended rules TypeScript already checks at compile time,
      // switched off the same way .eslintrc.cjs's TS override switched
      // them off, so the flat config disables the same list.
      'constructor-super': 'off',
      'getter-return': 'off',
      'no-const-assign': 'off',
      'no-dupe-args': 'off',
      'no-dupe-class-members': 'off',
      'no-dupe-keys': 'off',
      'no-func-assign': 'off',
      'no-import-assign': 'off',
      'no-new-symbol': 'off',
      'no-obj-calls': 'off',
      'no-redeclare': 'off',
      'no-setter-return': 'off',
      'no-this-before-super': 'off',
      'no-undef': 'off',
      'no-unreachable': 'off',
      'no-unsafe-negation': 'off',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
    },
  },
);
