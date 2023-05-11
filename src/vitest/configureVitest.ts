import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';

import type { PackageConfigParsed, VitestConfig } from '../types';
import { configureVite } from '../vite/configureVite';

export const configureVitest = async (
  packageConfig: PackageConfigParsed,
): Promise<VitestConfig> => {
  const {
    packageConfig: { target },
  } = packageConfig;

  const extensions = target === 'react' ? ['ts', 'tsx'] : ['ts'];

  return mergeConfig(
    await configureVite(packageConfig),
    defineConfig({
      test: {
        include: [`./src/**/*.test.{${extensions.join(',')}}`],
        globals: true,
      },
    }),
  );
};
