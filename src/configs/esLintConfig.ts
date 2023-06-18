import type { PackageInfo, Environment, PackageTarget } from '../entities';
import { pathDotPrefix } from '../utils/pathDotPrefix';
import path from 'node:path';
import { SOURCE_DIRNAME } from '../entities';

type ESLintConfig = Record<string, unknown>; // TODO

// TODO: Rule to prevent creation of index.tsx files.

const baseConfig = {
  plugins: ['@typescript-eslint', 'filenames', 'import'],
  extends: ['airbnb-base', 'airbnb-typescript/base', 'prettier'],
  overrides: [
    {
      files: ['**/index.ts'],
      rules: {
        'import/no-export': 'off',
      },
    },
  ],
  rules: {
    'arrow-body-style': 'off',
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

const nodeConfig = {
  ...baseConfig,
  env: { node: true },
};

const universalConfig = {
  ...baseConfig,
  env: { node: true, browser: true },
};

const browserConfig = {
  ...baseConfig,
  env: { browser: true },
  plugins: [...baseConfig.plugins, 'react-hooks'],
  rules: {
    ...baseConfig.rules,
    'react-hooks/exhaustive-deps': [
      'warn',
      {
        // additionalHooks: 'useDispatch',
      },
    ],
  },
  overrides: [
    ...baseConfig.overrides,
    {
      files: ['**/*.tsx'],
      plugins: ['react'], // TODO: Get this from the package dir and not matti-config?
      rules: {
        'react/prop-types': 'off',
        'react/require-default-props': 'off',
        'react/jsx-props-no-spreading': 'off',
      },
    },
  ],
};
// 'airbnb/hooks',

const reactConfig = {
  ...browserConfig,
  extends: [
    'airbnb',
    'airbnb-typescript',
    ...browserConfig.extends.filter(
      (e) => !['airbnb-base', 'airbnb-typescript/base'].includes(e),
    ),
  ],
};

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

const buildConfig = (target: PackageTarget, environment: Environment) => {
  if (environment === 'config') {
    return {
      ...nodeConfig,
      files: globsByEnvironment[environment][0],
      excludedFiles: globsByEnvironment[environment][1],
    };
  }

  if (target === 'node') {
    return {
      ...nodeConfig,
      files: globsByEnvironment[environment][0],
      excludedFiles: globsByEnvironment[environment][1],
    };
  }

  if (target === 'universal') {
    return {
      ...universalConfig,
      files: globsByEnvironment[environment][0],
      excludedFiles: globsByEnvironment[environment][1],
    };
  }

  if (target === 'browser') {
    return {
      ...browserConfig,
      files: globsByEnvironment[environment][0],
      excludedFiles: globsByEnvironment[environment][1],
    };
  }

  if (target === 'react') {
    return {
      ...reactConfig,
      files: globsByEnvironment[environment][0],
      excludedFiles: globsByEnvironment[environment][1],
    };
  }
};

export const patchConfig = (
  { rootDir, packageDir, configRootDir }: PackageInfo,
  tsConfigPaths: Array<string>,
  config: any,
) => {
  const cwd = configRootDir;

  // https://github.com/typescript-eslint/typescript-eslint/issues/2094

  const tsConfigRelativePaths = tsConfigPaths;
  // const tsConfigRelativePaths = tsConfigPaths.map((configPath) =>
  //   pathDotPrefix(path.relative(cwd, configPath)),
  // );

  return {
    ...config,
    extends: config.extends.map((extend) =>
      require.resolve(`eslint-config-${extend}`),
    ),
    parser: require.resolve('@typescript-eslint/parser'),
    parserOptions: {
      project: tsConfigRelativePaths,
    },
    files: config.files.map((glob) =>
      pathDotPrefix(path.join(path.relative(rootDir, packageDir), glob)),
    ),
    excludedFiles: config.excludedFiles.map((glob) =>
      pathDotPrefix(path.join(path.relative(rootDir, packageDir), glob)),
    ),
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        node: true,
        typescript: {
          alwaysTryTypes: true,
          project: tsConfigRelativePaths,
        },
      },
    },
  };
};

export default (
  packageInfo: PackageInfo,
  environment: Environment,
  tsConfigPaths: Array<string>,
): ESLintConfig => {
  return patchConfig(
    packageInfo,
    tsConfigPaths,
    buildConfig(packageInfo.target, environment),
  );
};
