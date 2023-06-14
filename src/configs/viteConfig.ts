import path from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import type { PackageInfo, PackageTarget, PackageType } from '../types';
import type { UserConfig as ViteConfig } from 'vite';
import { SOURCE_DIRNAME, DIST_DIRNAME } from '../constants';

// TODO: See https://www.npmjs.com/package/vite-node
// TODO: See https://www.npmjs.com/package/vite-plugin-node

const buildOptionsByTarget: Record<PackageTarget, ViteConfig['build']> = {
  browser: { target: 'esnext' },
  react: { target: 'esnext' },
  node: { target: 'node12' },
  universal: { target: 'esnext' },
};

const buildOptionsByPackageType: Record<PackageType, ViteConfig['build']> = {
  app: {},
  library: {
    lib: {
      entry: `./${SOURCE_DIRNAME}/index.ts`,
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
  },
};

export default async ({
  target,
  rootDir,
  cacheDir,
  packageDir,
  packageType,
}: PackageInfo): Promise<ViteConfig> => {
  const isLibrary = packageType === 'library';
  const isReact = target === 'react';
  const isNode = target === 'node';
  const srcRootDir = path.join(packageDir, 'src');

  return defineConfig({
    root: packageDir,
    resolve: { alias: { '~': srcRootDir } },
    build: {
      sourcemap: true,
      outDir: DIST_DIRNAME,
      emptyOutDir: true,
      ...buildOptionsByTarget[target],
      ...buildOptionsByPackageType[packageType],
    },
    plugins: [
      ...(isLibrary
        ? [
            dts({
              insertTypesEntry: true,
              tsConfigFilePath: path.join(cacheDir, 'tsconfig-package.json'),
            }),
          ]
        : []),
      ...(isReact ? [react()] : []),
      // ...(isNode
      //   ? [
      //       VitePluginNode({
      //         adapter: 'express',
      //         appPath: `./${SOURCE_DIRNAME}/index.ts`,
      //         tsCompiler: 'esbuild',
      //       }),
      //     ]
      //   : []),
    ],
    esbuild: {
      tsconfigRaw: await fs.promises.readFile(
        path.join(rootDir, 'tsconfig.json'),
        'utf-8',
      ),
    },
  }) as ViteConfig;
};
