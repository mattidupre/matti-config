import path from 'node:path';
import { pathDotPrefix } from '../../utils/pathDotPrefix';
import { buildGlobsByEnvironment } from '../../lib/buildGlobsByEnvironment';
import type {
  PackageConfigParsed,
  Environment,
  PackageTarget,
  TSConfig,
} from '../../types';

// https://github.com/dominikg/tsconfck

const baseOptions: TSConfig['compilerOptions'] = {
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

export const configureTypeScript = (
  {
    packageConfig: { target },
    packageInfo: { packageConfigDir, packageDir, rootDir, configDir },
  }: PackageConfigParsed,
  environment: Environment,
): TSConfig => {
  const baseDir = path.relative(packageConfigDir, packageDir);
  const [srcDir, distDir] = pathsByEnvironment[environment];

  const [include, exclude] = globsByEnvironment[environment].map((globs) =>
    globs.map((glob) => path.join(baseDir, glob)),
  );

  return {
    compilerOptions: {
      ...baseOptions,
      ...optionsByEnvironment[environment],
      ...optionsByTarget[target],
      baseUrl: baseDir,
      rootDir: pathDotPrefix(path.join(baseDir, srcDir)),
      outDir: distDir ? pathDotPrefix(path.join(baseDir, distDir)) : undefined,
      paths: { '~/*': [pathDotPrefix(path.join(srcDir, '*'))] },
      typeRoots: [
        pathDotPrefix(
          path.join(
            path.relative(packageConfigDir, packageDir),
            'node_modules',
          ),
        ),
        pathDotPrefix(
          path.join(path.relative(packageConfigDir, rootDir), 'node_modules'),
        ),
        pathDotPrefix(
          path.join(path.relative(packageConfigDir, configDir), 'node_modules'),
        ),
      ],
      types: typesByEnvironment[environment],
    },
    include,
    exclude,
  };
};
