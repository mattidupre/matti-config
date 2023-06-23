import path from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import { RESOLVE_ALIASES } from '../entities';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import ViteYaml from '@modyfi/vite-plugin-yaml';
import { ImageLoader as VanillaExtractImageLoader } from 'esbuild-vanilla-image-loader';
import type { PackageInfo, PackageTarget, PackageType } from '../entities';
import type { UserConfig as ViteConfig } from 'vite';
import { SOURCE_DIRNAME, DIST_DIRNAME } from '../entities';

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
    rollupOptions: {
      external: ['react'],
    },
  },
};

export default async ({
  target,
  rootDir,
  cacheDir,
  packageDir,
  packageType,
  configRootDir,
  isPackageFrontend,
}: PackageInfo): Promise<ViteConfig> => {
  const isLibrary = packageType === 'library';
  const isReact = target === 'react';
  const isNode = target === 'node';
  const srcRootDir = path.join(packageDir, 'src');

  const tsconfigRaw = await fs.promises.readFile(
    path.join(rootDir, 'tsconfig.json'),
    'utf-8',
  );

  return defineConfig({
    // assetsInclude: ['**/*.woff2'],
    root: packageDir,
    resolve: {
      alias: {
        ...Object.fromEntries(
          RESOLVE_ALIASES.map(([from, to]) => [
            path.dirname(from),
            path.join(packageDir, path.dirname(to)),
          ]),
        ),
      },
    },
    build: {
      sourcemap: true,
      outDir: DIST_DIRNAME,
      emptyOutDir: false,
      ...buildOptionsByTarget[target],
      ...buildOptionsByPackageType[packageType],
    },
    // assetsInclude: ['**/*.woff2'],
    plugins: [
      ViteYaml(),
      ...(isLibrary
        ? [
            // dts({
            //   insertTypesEntry: true,
            //   tsConfigFilePath: path.join(cacheDir, 'tsconfig-package.json'),
            // }),
          ]
        : []),
      ...(isReact ? [react()] : []),
      ...(isPackageFrontend
        ? [
            vanillaExtractPlugin({
              identifiers: 'debug',
              esbuildOptions: {
                // Vanilla Extract doesn't seem to like tsconfig project references.
                tsconfig: path.join(cacheDir, 'tsconfig-dist.json'),
                plugins: [
                  VanillaExtractImageLoader({
                    filter: /\.(gif|jpe?g|tiff?|png|webp|bmp|svg|woff2)$/,
                    // dataUrl: false, // Read file as dataurl
                  }),
                ],
              },
            }),
          ]
        : []),
    ],
    esbuild: {
      // tsconfigRaw
    },
  }) as ViteConfig;
};
