import type { PackageConfigParsed, BundledCode } from '../types';
import path from 'node:path';

export const bundleVitest = async (
  packageConfig: PackageConfigParsed,
): Promise<BundledCode> => {
  const {
    packageInfo: { packageConfigDir, configName },
  } = packageConfig;

  const vitestConfigCode = [
    `const { configureVitest } = require('${configName}');`,
    `module.exports = () => configureVitest(${JSON.stringify(
      packageConfig,
      null,
      2,
    )});`,
  ].join('\n');

  return {
    type: 'configureVitest',
    isIndex: false,
    path: path.join(packageConfigDir, 'vitest.config.cjs'),
    code: vitestConfigCode,
  };
};
