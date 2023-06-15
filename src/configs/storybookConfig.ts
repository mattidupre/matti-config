import path from 'node:path';
import { STORYBOOK_DIRNAME } from '../entities';
import type { PackageInfo } from '../entities';
import { mergeConfig } from 'vite';
import viteConfig from './viteConfig';
import type { StorybookViteConfig as StorybookConfig } from '@storybook/builder-vite';

export default (packageInfo: PackageInfo): StorybookConfig => {
  const { packageDir } = packageInfo;

  const viteConfigPromise = viteConfig(packageInfo).then((config) => {
    return {
      ...config,
      build: {
        ...config.build,
        outDir: STORYBOOK_DIRNAME,
      },
      plugins: [
        ...config.plugins
          .flat()
          .filter(({ name }: { name: string }) => !name.startsWith('vite:')),
      ],
    };
  });

  return {
    core: { builder: '@storybook/builder-vite' },
    framework: '@storybook/react-vite',
    stories: [path.join(packageDir, '**/*.stories.@(ts|tsx)')],
    viteFinal: async (config) => mergeConfig(config, await viteConfigPromise),
  };
};
