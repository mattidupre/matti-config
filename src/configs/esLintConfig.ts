import type { PackageInfo, Environment } from '../types';
import { pathDotPrefix } from '../utils/pathDotPrefix';
import path from 'node:path';
import { SOURCE_DIRNAME } from '../constants';

type ESLintConfig = Record<string, unknown>; // TODO

// TODO: buildGlobsByEnvironment.

// TODO: Rule to prevent creation of index.tsx files.

// https://github.com/typescript-eslint/typescript-eslint/issues/2094

const globsByEnvironment: Record<Environment, [Array<string>, Array<string>]> =
  {
    config: [['./*.ts?(x)'], []],
    dist: [
      [`./${SOURCE_DIRNAME}/**/*.ts?(x)`],
      [
        `./${SOURCE_DIRNAME}/**/*.test.ts?(x)`,
        `./${SOURCE_DIRNAME}/**/*.stories.ts?(x)`,
      ],
    ],
    test: [[`./${SOURCE_DIRNAME}/**/*.test.ts?(x)`], []],
    stories: [[`./${SOURCE_DIRNAME}/**/*.stories.ts?(x)`], []],
  };

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

export default (
  { target, rootDir, packageDir }: PackageInfo,
  environment: Environment,
  tsConfigPaths: Array<string>,
): ESLintConfig => {
  const [files, excludedFiles] = globsByEnvironment[environment].map((globs) =>
    globs.map((glob) =>
      pathDotPrefix(path.join(path.relative(rootDir, packageDir), glob)),
    ),
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
