import path from 'node:path';
import type { PackageInfo } from '../types';
import { mergeConfig } from 'vite';
import viteConfig from './viteConfig';
import type { StorybookViteConfig as StorybookConfig } from '@storybook/builder-vite';

export default (packageInfo: PackageInfo): StorybookConfig => {
  const { packageDir } = packageInfo;

  const viteConfigPromise = viteConfig(packageInfo).then((config) => ({
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
