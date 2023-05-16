import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import path from 'node:path';

import type { PackageConfigParsed, VitestConfig } from '../types';
import { configureVite } from '../vite/configureVite';

export const configureVitest = async (
  packageConfig: PackageConfigParsed,
): Promise<VitestConfig> => {
  const setupFile = require.resolve('./setupVitest');

  const {
    packageConfig: { target },
  } = packageConfig;

  const extensions = target === 'react' ? ['ts', 'tsx'] : ['ts'];
  const extensionsString =
    extensions.length === 1 ? extensions[0] : `{${extensions.join(',')}}`;

  return mergeConfig(
    await configureVite(packageConfig),
    defineConfig({
      test: {
        environment: 'happy-dom', // TODO: Set this based on config.
        include: [`./src/**/*.test.${extensionsString}`],
        globals: true,
        // globalSetup
        setupFiles: [setupFile],
      },
    }),
  );
};
