import path from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import { shimTSConfig } from './lib/pluginShimTSConfig';
import type {
  PackageConfigParsed,
  PackageTarget,
  PackageType,
  ViteConfig,
} from '../types';

// TODO: See https://www.npmjs.com/package/vite-node

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
      entry: './src/index.ts',
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
  },
};

export const configureVite = async ({
  packageConfig: { target, type: packageType },
  packageInfo: { packageDir, rootDir, packageConfigDir },
}: PackageConfigParsed): Promise<ViteConfig> => {
  const isLibrary = packageType === 'library';
  const isReact = target === 'react';
  const srcRootDir = path.join(packageDir, 'src');

  return defineConfig({
    root: packageDir,
    resolve: { alias: { '~': srcRootDir } },
    build: {
      sourcemap: true,
      outDir: 'dist',
      emptyOutDir: true,
      ...buildOptionsByTarget[target],
      ...buildOptionsByPackageType[packageType],
    },
    plugins: [
      shimTSConfig({
        sourceConfigPath: path.join(packageConfigDir, 'tsconfig-all.json'),
        tempConfigPath: path.join(packageDir, 'tsconfig.json'),
        enabled: true,
      }),
      ...(isLibrary
        ? [
            dts({
              insertTypesEntry: true,
              tsConfigFilePath: path.join(
                packageConfigDir,
                'tsconfig-all.json',
              ),
            }),
          ]
        : []),
      ...(isReact ? [react()] : []),
    ],
    esbuild: {
      tsconfigRaw: await fs.promises.readFile(
        path.join(rootDir, 'tsconfig.json'),
        'utf-8',
      ),
    },
  }) as ViteConfig;
};
