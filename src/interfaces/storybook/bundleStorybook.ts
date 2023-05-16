import type { PackageConfigParsed, BundledCode } from '../../types';
import path from 'node:path';

export const bundleStorybook = (
  packageConfig: PackageConfigParsed,
): Array<BundledCode> => {
  const {
    packageInfo: { packageConfigDir, configName },
    packageConfig: { target, type },
  } = packageConfig;

  if (target !== 'react' || type !== 'library') {
    return [];
  }

  const mainConfigCode = [
    `const { configureStorybook } = require('${configName}');`,
    `module.exports = configureStorybook(${JSON.stringify(
      packageConfig,
      null,
      2,
    )});`,
  ].join('\n');

  return [
    {
      type: 'configureStorybook',
      isIndex: false,
      path: path.join(packageConfigDir, '.storybook', 'main.js'),
      code: mainConfigCode,
    },
  ];
};
