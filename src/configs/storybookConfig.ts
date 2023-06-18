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
        // outDir: path.join(packageDir, STORYBOOK_DIRNAME),
      },
      plugins: [
        ...config.plugins
          .flat()
          .filter(({ name }: { name: string }) => !name.startsWith('vite:')),
      ],
      // https://github.com/storybookjs/builder-vite/issues/55
      root: path.dirname(require.resolve('@storybook/builder-vite')),
    };
  });

  return {
    core: { builder: require.resolve('@storybook/builder-vite') },
    framework: '@storybook/react-vite',
    stories: [path.join(packageDir, '**/*.stories.@(ts|tsx)')],
    viteFinal: async (config) => mergeConfig(config, await viteConfigPromise),
  };
};
