import type {
  PackageConfig,
  PackageConfigParsed,
  Environment,
  PackageInfo,
} from '../types';

const frontendTargets: Array<PackageConfig['target']> = ['browser', 'react'];
const isPackageFrontend = (packageConfig: PackageConfig) =>
  frontendTargets.includes(packageConfig.target);

const baseEnvironments: Array<Environment> = ['config', 'dist', 'test'];
const frontendEnvironments: Array<Environment> = ['stories'];
const backendEnvironments: Array<Environment> = [];
const buildEnvironments = (
  packageConfig: PackageConfig,
): Array<Environment> => {
  return [
    ...baseEnvironments,
    ...(isPackageFrontend(packageConfig)
      ? frontendEnvironments
      : backendEnvironments),
  ];
};

export const buildPackageConfig = (
  packageInfo: PackageInfo,
  packageConfig: PackageConfig,
): PackageConfigParsed => {
  return {
    packageConfig,
    packageInfo,
    environments: buildEnvironments(packageConfig),
  };
};
