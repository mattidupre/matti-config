import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import type { UserConfig as VitestConfig } from 'vitest';
import type { PackageInfo } from '../entities';
import viteConfig from './viteConfig';

export default async (packageInfo: PackageInfo): Promise<VitestConfig> => {
  const vitestSetup = require.resolve('./vitestSetup');

  const { target } = packageInfo;

  const extensions = target === 'react' ? ['ts', 'tsx'] : ['ts'];
  const extensionsString =
    extensions.length === 1 ? extensions[0] : `{${extensions.join(',')}}`;

  return mergeConfig(
    await viteConfig(packageInfo),
    defineConfig({
      test: {
        environment: 'happy-dom', // TODO: Set this based on config.
        include: [`./src/**/*.test.${extensionsString}`],
        globals: true,
        setupFiles: [vitestSetup],
        passWithNoTests: true,
      },
    }),
  );
};
