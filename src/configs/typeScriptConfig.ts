import { pathDotPrefix } from '../utils/pathDotPrefix';
import path from 'node:path';
import { RESOLVE_ALIASES } from '../entities';
import type { Environment, PackageTarget, PackageInfo } from '../entities';

type TSConfig = {
  compilerOptions?: Record<string, unknown>;
  include?: Array<string>;
  exclude?: Array<string>;
};

// https://github.com/dominikg/tsconfck

const baseCompilerOptions: TSConfig['compilerOptions'] = {
  composite: true,
  forceConsistentCasingInFileNames: true,

  target: 'esnext',
  lib: ['esnext', 'dom'],
  module: 'esnext',
  esModuleInterop: false,
  allowSyntheticDefaultImports: true,
  moduleResolution: 'node',
  resolveJsonModule: true,
  // isolatedModules: false,
  // skipLibCheck: true, // ??
  allowJs: false,
};

const optionsByEnvironment: Record<Environment, TSConfig['compilerOptions']> = {
  config: { strict: true },
  dist: { strict: true },
  test: { strict: false },
  stories: { strict: false },
};

const typesByEnvironment: Record<Environment, Array<string>> = {
  config: [],
  dist: ['vite/client'],
  test: ['jest-extended', 'vitest/globals'],
  stories: [],
};

const optionsByTarget: Record<PackageTarget, TSConfig['compilerOptions']> = {
  browser: {},
  react: { jsx: 'preserve' },
  node: {},
  universal: {},
};

const pathsByEnvironment: Record<Environment, [string, null | string]> = {
  config: ['.', null],
  dist: ['./src', 'dist'],
  test: ['./src', null],
  stories: ['./src', null],
};

const globsByEnvironment: Record<Environment, [Array<string>, Array<string>]> =
  {
    config: [['./*'], []],
    dist: [['./src/**/*'], ['./src/**/*.test.*', './src/**/*.stories.*']],
    test: [['./src/**/*'], ['./src/**/*.stories.*']],
    stories: [['./src/**/*'], ['./src/**/*.test.*']],
  };

export default (
  { target, rootDir, cacheDir, configRootDir, packageDir }: PackageInfo,
  environment: Environment,
) => {
  const baseDir = path.relative(cacheDir, packageDir);
  const [srcDir, distDir] = pathsByEnvironment[environment];

  const [include, exclude] = globsByEnvironment[environment].map((globs) =>
    globs.map((glob) => path.join(baseDir, glob)),
  );

  return {
    compilerOptions: {
      ...baseCompilerOptions,
      ...optionsByEnvironment[environment],
      ...optionsByTarget[target],
      baseUrl: baseDir,
      rootDir: pathDotPrefix(path.join(baseDir, srcDir)),
      outDir: distDir ? pathDotPrefix(path.join(baseDir, distDir)) : undefined,
      paths: Object.fromEntries(
        RESOLVE_ALIASES.map(([from, to]) => [
          from,
          [pathDotPrefix(path.join(srcDir, to))],
        ]),
      ),
      typeRoots: [
        pathDotPrefix(
          path.join(path.relative(cacheDir, packageDir), 'node_modules'),
        ),
        pathDotPrefix(
          path.join(path.relative(cacheDir, rootDir), 'node_modules'),
        ),
        pathDotPrefix(
          path.join(path.relative(cacheDir, configRootDir), 'node_modules'),
        ),
      ],
      types: typesByEnvironment[environment],
    },
    include,
    exclude,
  };
};
