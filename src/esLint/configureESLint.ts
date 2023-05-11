import type { PackageConfigParsed, Environment, ESLintConfig } from '../types';
import { buildGlobsByEnvironment } from '../lib/buildGlobsByEnvironment';
import { pathDotPrefix } from '../utils/pathDotPrefix';
import path from 'node:path';

// TODO: Prevent index.tsx.
// https://github.com/typescript-eslint/typescript-eslint/issues/2094

const baseConfig = {
  plugins: ['@typescript-eslint', 'filenames', 'import'],
  extends: ['airbnb', 'airbnb/hooks', 'airbnb-typescript', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {},
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      node: true,
      typescript: {},
    },
  },
  overrides: [
    {
      files: ['**/index.ts'],
      rules: {
        'import/no-export': 'off',
      },
    },
  ],
  rules: {
    'no-undef': 'off',
    'import/order': 'off',
    'import/prefer-default-export': 'off',
    'prefer-destructuring': 'off',
    'react/function-component-definition': 'off',
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/quotes': ['error', 'single'],
    'import/no-extraneous-dependencies': [
      'warn',
      {
        devDependencies: ['**/*.test.ts', '**/*.test.tsx'],
        optionalDependencies: false,
        peerDependencies: true,
      },
    ],
    // 'filenames/match-exported': [2, null, null, true],
  },
};

export const configureESLint = (
  {
    packageConfig: { target },
    packageInfo: { packageDir, rootDir },
  }: PackageConfigParsed,
  environment: Environment,
  tsConfigPaths: Array<string>,
): ESLintConfig => {
  const [files, excludedFiles] = buildGlobsByEnvironment(
    {
      baseDir: path.relative(rootDir, packageDir),
      extension: target === 'react' ? '.ts?(x)' : '.ts',
    },
    environment,
  );

  const tsConfigProject = tsConfigPaths.map((configPath) =>
    pathDotPrefix(path.relative(rootDir, configPath)),
  );

  return {
    ...baseConfig,
    parserOptions: {
      ...(baseConfig.parserOptions ?? {}),
      project: tsConfigProject,
    },
    settings: {
      ...baseConfig.settings,
      'import/resolver': {
        ...(baseConfig.settings['import/resolver'] ?? {}),
        typescript: {
          ...(baseConfig.settings['import/resolver'].typescript ?? {}),
          project: tsConfigProject,
        },
      },
    },
    rules: {
      ...baseConfig.rules,
      'no-console': environment === 'dist' ? 'error' : 'off',
    },
    files,
    excludedFiles,
  };
};
