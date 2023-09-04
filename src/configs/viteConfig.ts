import path from 'node:path';
import fg from 'fast-glob';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import ViteYaml from '@modyfi/vite-plugin-yaml';
import { ImageLoader as VanillaExtractImageLoader } from 'esbuild-vanilla-image-loader';
import {
  type PackageInfo,
  RESOLVE_ALIASES,
  SOURCE_DIRNAME,
  DIST_DIRNAME,
} from '../entities.js';
import type { UserConfig as ViteConfig } from 'vite';

// TODO: See https://www.npmjs.com/package/vite-node
// TODO: See https://www.npmjs.com/package/vite-plugin-node

export default async ({
  target,
  cacheDir,
  packageDir,
  sourceDir,
  packageType,
  isPackageFrontend,
}: PackageInfo): Promise<ViteConfig> => {
  const isLibrary = packageType === 'library';
  const isReact = target === 'react';
  const entryExtension = isLibrary ? '.ts' : '.html';
  const baseDir = isLibrary ? sourceDir : packageDir;

  const entryNames = (
    await fg([`*${entryExtension}`], {
      cwd: baseDir,
    })
  ).map((entryName) => entryName.replace(/\.[^/.]+$/, ''));

  const rollupOptions: ViteConfig['build']['rollupOptions'] = {
    input: Object.fromEntries(
      entryNames.map((entryName) => [
        entryName,
        path.join(baseDir, `${entryName}${entryExtension}`),
      ]),
    ),
    ...(isLibrary
      ? {
          external: ['react'],
          output: [
            // {
            //   format: 'commonjs',
            //   entryFileNames: '[name].cjs',
            //   // preserveModules: true,
            // },
            {
              format: 'module',
              entryFileNames: '[name].js',
              // preserveModules: true,
            },
          ],
        }
      : {}),
  };

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
      target: 'esnext',
      ...(isLibrary
        ? {
            lib: {
              entry: `./${SOURCE_DIRNAME}/index.ts`,
              fileName: 'index',
              formats: ['es', 'cjs'],
            },
          }
        : {}),
      rollupOptions,
    },
    // assetsInclude: ['**/*.woff2'],
    plugins: [
      ViteYaml(),
      // tsconfigPaths({
      //   root: packageDir,
      // }),
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
              // TODO: Figure out how to handle multiple entries.
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
