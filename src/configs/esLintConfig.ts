import type {
  PackageInfo,
  RepoInfo,
  Environment,
  PackageTarget,
} from '../entities.js';
import { pathDotPrefix } from '../utils/pathDotPrefix.js';
import { resolveModule } from '../utils/resolveModule.js';
import path from 'node:path';
import { SOURCE_DIRNAME } from '../entities.js';

type ESLintConfig = Record<string, unknown>; // TODO

// TODO: Rule to prevent creation of index.tsx files.

const baseConfig = {
  plugins: [
    '@typescript-eslint/eslint-plugin',
    'eslint-plugin-filenames',
    'eslint-plugin-import',
    'eslint-plugin-react-refresh',
  ],
  extends: [
    'eslint-config-airbnb-base',
    'eslint-config-airbnb-typescript/base',
    'eslint-config-prettier',
  ],
  overrides: [
    {
      files: ['**/index.ts'],
      rules: {
        'import/no-export': 'off',
      },
    },
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      plugins: [
        // TODO: https://github.com/jest-community/eslint-plugin-jest
        // TODO: https://github.com/dangreenisrael/eslint-plugin-jest-formatting
        'jest-extended',
      ],
    },
  ],
  rules: {
    'arrow-body-style': 'off',
    'no-undef': 'off',
    'import/order': 'off',
    'import/prefer-default-export': 'off',
    'prefer-destructuring': 'off',
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/quotes': ['error', 'single'],
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/consistent-type-exports': [
      'error',
      { fixMixedExportsWithInlineTypeSpecifier: true },
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
      // plugins: ['eslint-plugin-react'], // TODO: Get this from the package dir and not matti-config?
      rules: {
        'react/prop-types': 'off',
        'react/require-default-props': 'off',
        'react/jsx-props-no-spreading': 'off',
        'react/react-in-jsx-scope': 'off',
        'eslintreact/jsx-no-useless-fragment': 'off',
      },
    },
  ],
};

const reactConfig = {
  ...browserConfig,
  extends: [
    'eslint-config-airbnb',
    'eslint-config-airbnb-typescript',
    'eslint-config-airbnb/hooks',
    ...browserConfig.extends.filter(
      (e) =>
        ![
          'eslint-config-airbnb-base',
          'eslint-config-airbnb-typescript/base',
        ].includes(e),
    ),
  ],
};

const globsByEnvironment: Record<
  Environment,
  { include: Array<string>; exclude: Array<string> }
> = {
  dist: {
    include: [`./${SOURCE_DIRNAME}/**/*.ts?(x)`],
    exclude: [
      `./${SOURCE_DIRNAME}/**/*.test.ts?(x)`,
      `./${SOURCE_DIRNAME}/**/*.stories.ts?(x)`,
    ],
  },
  test: {
    include: [`./${SOURCE_DIRNAME}/**/*.test.ts?(x)`],
    exclude: [],
  },
  stories: {
    include: [`./${SOURCE_DIRNAME}/**/*.stories.ts?(x)`],
    exclude: [],
  },
};

const buildConfig = (target: PackageTarget, environment: Environment) => {
  if (target === 'node') {
    return {
      ...nodeConfig,
      files: globsByEnvironment[environment].include,
      excludedFiles: globsByEnvironment[environment].exclude,
    };
  }

  if (target === 'universal') {
    return {
      ...universalConfig,
      files: globsByEnvironment[environment].include,
      excludedFiles: globsByEnvironment[environment].exclude,
    };
  }

  if (target === 'browser') {
    return {
      ...browserConfig,
      files: globsByEnvironment[environment].include,
      excludedFiles: globsByEnvironment[environment].exclude,
    };
  }

  if (target === 'react') {
    return {
      ...reactConfig,
      files: globsByEnvironment[environment].include,
      excludedFiles: globsByEnvironment[environment].exclude,
    };
  }
};

const patchConfig = (
  { rootDir, packageDir, configRootDir }: PackageInfo,
  tsConfigPaths: Array<string>,
  config: any,
) => {
  // https://github.com/typescript-eslint/typescript-eslint/issues/2094

  return {
    ...config,
    extends: config.extends.map((extend) => resolveModule(extend)),
    parser: resolveModule('@typescript-eslint/parser'),
    parserOptions: {
      project: tsConfigPaths,
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
          project: tsConfigPaths,
        },
      },
    },
  };
};

export const rootConfig = () => {};

export const packageConfig = (
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
