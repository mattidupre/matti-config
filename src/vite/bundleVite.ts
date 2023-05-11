import type { PackageConfigParsed, BundledCode } from '../types';
import path from 'node:path';

export const bundleVite = async (
  packageConfig: PackageConfigParsed,
): Promise<BundledCode> => {
  const {
    packageInfo: { packageConfigDir, configName },
  } = packageConfig;

  const viteConfigCode = [
    `const { configureVite } = require('${configName}');`,
    `module.exports = () => configureVite(${JSON.stringify(
      packageConfig,
      null,
      2,
    )});`,
  ].join('\n');

  return {
    type: 'configureVite',
    isIndex: false,
    path: path.join(packageConfigDir, 'vite.config.cjs'),
    code: viteConfigCode,
  };
};
