import { pathDotPrefix } from '../utils/pathDotPrefix';
import path from 'node:path';
import { RESOLVE_ALIASES } from '../entities';
import type { Environment, PackageTarget, PackageInfo } from '../entities';
import { TsConfigJson } from 'type-fest';

// https://github.com/dominikg/tsconfck

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
  noImplicitAny: true,
  skipLibCheck: true,
  allowJs: false,
  sourceMap: true,
};

const optionsByEnvironment: Record<
  Environment,
  TsConfigJson['compilerOptions']
> = {
  dist: { strict: true },
  test: { strict: false },
  stories: { strict: false },
};

const baseTypes = ['@modyfi/vite-plugin-yaml/modules'];

const localTypesByEnvironment: Record<Environment, Array<string>> = {
  dist: [],
  test: [path.join(__dirname, 'vitestSetup.d.ts')],
  stories: [],
};

const typesByEnvironment: Record<Environment, Array<string>> = {
  dist: ['vite/client'],
  test: [],
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
  dist: ['./src', './dist'],
  test: ['./src', null],
  stories: ['./src', null],
};

const globsByEnvironment: Record<Environment, [Array<string>, Array<string>]> =
  {
    dist: [['./src/**/*'], ['./src/**/*.test.*', './src/**/*.stories.*']],
    test: [['./src/**/*.test.*'], []],
    stories: [['./src/**/*.stories.*'], []],
  };

export default (
  { target, rootDir, cacheDir, configRootDir, packageDir }: PackageInfo,
  environment: Environment,
) => {
  const baseDir = path.relative(cacheDir, packageDir);

  // const pathRelative = (targetPath: string) =>
  //   pathDotPrefix(path.relative(packageDir, targetPath));
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
      tsBuildInfoFile: distDir
        ? pathDotPrefix(
            path.join(baseDir, distDir, `tsconfig-${environment}.tsbuildinfo`),
          )
        : undefined,
      paths: {
        ...Object.fromEntries(
          RESOLVE_ALIASES.map(([from, to]) => [
            from,
            [pathDotPrefix(path.join(srcDir, to))],
          ]),
        ),
      },
      types: [
        ...localTypesByEnvironment[environment],
        ...[
          ...baseTypes,
          ...typesByEnvironment[environment],
          ...typesByTarget[target],
        ].map((t) => path.join(configRootDir, 'node_modules', t)),
      ],
    },
    include,
    exclude: [
      ...exclude,
      // '**/node_modules/**'
    ],
  };
};
