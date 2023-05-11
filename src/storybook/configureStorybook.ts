import path from 'node:path';
import type { PackageConfigParsed, StorybookConfig } from '../types';

export const configureStorybook = ({
  packageInfo: { packageDir },
}: PackageConfigParsed): StorybookConfig => {
  return {
    core: { builder: '@storybook/builder-vite' },
    framework: '@storybook/react-vite',
    stories: [path.join(packageDir, '**/*.stories.@(ts|tsx)')],
  };
};
