import path from 'node:path';
import type { PackageConfigParsed, StorybookConfig } from '../types';
import { mergeConfig } from 'vite';
import { configureVite } from '../vite/configureVite';

export const configureStorybook = (
  packageConfig: PackageConfigParsed,
): StorybookConfig => {
  const {
    packageInfo: { packageDir },
  } = packageConfig;

  const viteConfigPromise = configureVite(packageConfig).then((config) => ({
    ...config,
    plugins: config.plugins
      .flat()
      .filter(({ name }: { name: string }) => !name.startsWith('vite:')),
  }));

  return {
    core: { builder: '@storybook/builder-vite' },
    framework: '@storybook/react-vite',
    stories: [path.join(packageDir, '**/*.stories.@(ts|tsx)')],
    async viteFinal(config) {
      return mergeConfig(config, await viteConfigPromise);
    },
  };
};
