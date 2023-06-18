import { pathDotPrefix } from '../utils/pathDotPrefix';
import path from 'node:path';
import { RESOLVE_ALIASES } from '../entities';
import type { Environment, PackageTarget, PackageInfo } from '../entities';
import { TsConfigJson } from 'type-fest';

// https://github.com/dominikg/tsconfck

/*
"target": "ESNext",
"useDefineForClassFields": true,
"lib": ["DOM", "DOM.Iterable", "ESNext"],
"allowJs": false,
"skipLibCheck": true,
"esModuleInterop": false,
"allowSyntheticDefaultImports": true,
"strict": true,
"forceConsistentCasingInFileNames": true,
"module": "ESNext",
"moduleResolution": "bundler",
"resolveJsonModule": true,
"isolatedModules": true,
"noEmit": true,
"jsx": "react-jsx"
*/

const baseCompilerOptions: TsConfigJson['compilerOptions'] = {
  composite: true,
  forceConsistentCasingInFileNames: true,
  target: 'ESNext',
  lib: ['DOM', 'DOM.Iterable', 'ESNext'],
  module: 'ESNext',
  esModuleInterop: true,
  useDefineForClassFields: true,
  allowSyntheticDefaultImports: true,
  resolveJsonModule: true,
  // isolatedModules: true,
  skipLibCheck: true,
  allowJs: false,
  sourceMap: true,
};

const optionsByEnvironment: Record<
  Environment,
  TsConfigJson['compilerOptions']
> = {
  config: { strict: true },
  dist: { strict: true },
  test: { strict: false },
  stories: { strict: false },
};

const baseTypes = ['@modyfi/vite-plugin-yaml/modules'];

const typesByEnvironment: Record<Environment, Array<string>> = {
  config: [],
  dist: ['vite/client'],
  test: ['jest-extended', 'vitest/globals'],
  stories: [],
};

const typesByTarget: Record<PackageTarget, Array<string>> = {
  browser: [],
  react: ['@types/react'],
  node: ['node'],
  universal: [],
};

const optionsByTarget: Record<PackageTarget, TsConfigJson['compilerOptions']> =
  {
    browser: {
      moduleResolution: 'NodeNext',
    },
    react: {
      moduleResolution: 'NodeNext',
      jsx: 'react-jsx',
    },
    node: {
      moduleResolution: 'NodeNext',
    },
    universal: {
      moduleResolution: 'NodeNext',
    },
  };

const pathsByEnvironment: Record<Environment, [string, null | string]> = {
  config: ['.', null],
  dist: ['./src', './dist'],
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
      paths: {
        ...Object.fromEntries(
          RESOLVE_ALIASES.map(([from, to]) => [
            from,
            [pathDotPrefix(path.join(srcDir, to))],
          ]),
        ),
        react: [path.join(configRootDir, 'node_modules', 'react')],
        'react-dom': [path.join(configRootDir, 'node_modules', 'react-dom')],
      },
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
      types: [
        ...baseTypes,
        ...typesByEnvironment[environment],
        ...typesByTarget[target],
      ].map((t) => path.join(configRootDir, 'node_modules', t)),
    },
    include,
    exclude,
  };
};
