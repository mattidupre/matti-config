import path from 'node:path';
import { TsConfigJson } from 'type-fest';
import { pathDotPrefix } from '../utils/pathDotPrefix.js';
import {
  RESOLVE_ALIASES,
  CONFIG_APP_DIST_DIR,
  CONFIG_APP_ROOT_DIR,
} from '../entities.js';
import type { Environment, PackageTarget, PackageInfo } from '../entities.js';

// https://github.com/dominikg/tsconfck

const baseCompilerOptions: TsConfigJson['compilerOptions'] = {
  composite: true,
  forceConsistentCasingInFileNames: true,
  target: 'ESNext',
  lib: ['DOM', 'DOM.Iterable', 'ESNext'],
  module: 'ESNext',
  moduleResolution: 'node',
  esModuleInterop: true,
  useDefineForClassFields: true,
  allowSyntheticDefaultImports: true,
  resolveJsonModule: true,
  // isolatedModules: true,
  // preserveSymlinks: true, // Enabling for TS error 2742.
  skipLibCheck: true,
  allowJs: false,
  sourceMap: true,
};

const optionsByEnvironment: Record<
  Environment,
  TsConfigJson['compilerOptions']
> = {
  dist: { strict: true },
  test: { strict: true, noImplicitAny: false },
  stories: { strict: true, strictNullChecks: false },
};

const basePaths: TsConfigJson['compilerOptions']['paths'] = {
  tslib: [path.join(CONFIG_APP_ROOT_DIR, 'node_modules', 'tslib')],
  ...Object.fromEntries(RESOLVE_ALIASES.map(([from, to]) => [from, [to]])),
};

const pathsByEnvironment: Record<
  Environment,
  TsConfigJson['compilerOptions']['paths']
> = {
  dist: {},
  test: {
    vitest: [path.join(CONFIG_APP_ROOT_DIR, 'node_modules', 'vitest')],
  },
  stories: {},
};

const baseTypes = ['@modyfi/vite-plugin-yaml/modules'];

const localTypesByEnvironment: Record<Environment, Array<string>> = {
  dist: [],
  test: [path.join(CONFIG_APP_DIST_DIR, 'configs', 'vitestTypes.d.ts')],
  stories: [],
};

const typesByEnvironment: Record<Environment, Array<string>> = {
  dist: ['vite/client'],
  test: [
    // 'vitest/globals'
  ],
  stories: [],
};

const typesByTarget: Record<PackageTarget, Array<string>> = {
  browser: [],
  react: [],
  node: ['@types/node'],
  universal: [],
};

const optionsByTarget: Record<PackageTarget, TsConfigJson['compilerOptions']> =
  {
    browser: {
      // moduleResolution: 'node',
    },
    react: {
      // moduleResolution: 'node',
      jsx: 'react-jsx',
    },
    node: {
      // moduleResolution: 'node',
    },
    universal: {
      // moduleResolution: 'node',
    },
  };

const extensionsByTarget: Record<PackageTarget, Array<string>> = {
  browser: ['.ts'],
  react: ['.ts', '.tsx'],
  node: ['.ts'],
  universal: ['.ts'],
};

const dirsByEnvironment: Record<Environment, [string, null | string]> = {
  dist: ['./src', './dist'],
  test: ['./src', null],
  stories: ['./src', null],
};

const globsByEnvironment: Record<Environment, [Array<string>, Array<string>]> =
  {
    test: [['./src/**/*'], ['./src/**/*.stories.*']],
    stories: [['./src/**/*'], ['./src/**/*.test.*']],
    // Dist should be listed last. (Sorted elsewhere.)
    dist: [['./src/**/*'], ['./src/**/*.stories.*', './src/**/*.test.*']],
  };

export default (
  { target, cacheDir, configRootDir, packageDir }: PackageInfo,
  environment: Environment,
) => {
  const baseDir = path.relative(cacheDir, packageDir);

  // const pathRelative = (targetPath: string) =>
  //   pathDotPrefix(path.relative(packageDir, targetPath));
  const [srcDir, distDir] = dirsByEnvironment[environment] ?? [];

  const [include, exclude] = (globsByEnvironment[environment] ?? []).map(
    (globs) =>
      globs.map(
        (glob) => path.join(baseDir, glob),
        // extensionsByTarget[target].map(
        //   (extension) => `${path.join(baseDir, glob)}${extension}`,
        // ),
      ),
  );

  return {
    compilerOptions: {
      ...baseCompilerOptions,
      ...(optionsByEnvironment[environment] ?? {}),
      ...(optionsByTarget[target] ?? {}),
      baseUrl: baseDir,
      rootDir: pathDotPrefix(path.join(baseDir, srcDir)),
      outDir: distDir ? pathDotPrefix(path.join(baseDir, distDir)) : undefined,
      tsBuildInfoFile: distDir
        ? pathDotPrefix(
            path.join(baseDir, distDir, `tsconfig-${environment}.tsbuildinfo`),
          )
        : undefined,
      paths: {
        ...basePaths,
        ...(pathsByEnvironment[environment] ?? {}),
      },
      types: [
        ...(localTypesByEnvironment[environment] ?? []),
        ...[
          ...baseTypes,
          ...(typesByEnvironment[environment] ?? []),
          ...typesByTarget[target],
        ].map((t) => path.join(configRootDir, 'node_modules', t)),
      ],
      declarationMap: true,
    },
    'tsc-alias': {
      verbose: true,
      resolveFullPaths: true,
    },
    include,
    exclude,
  };
};
