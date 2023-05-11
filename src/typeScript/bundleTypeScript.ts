import type { PackageConfigParsed, BundledCode } from '../types';
import path from 'node:path';
import { configureTypeScript } from './configureTypeScript';

const packageEntryFile = 'tsconfig-all.json';

export const bundleTypeScript = (
  packageConfig: PackageConfigParsed,
): Array<BundledCode> => {
  const bundles: Array<BundledCode> = packageConfig.environments.map(
    (environment) => ({
      type: 'configureTypeScript',
      isIndex: false,
      path: `tsconfig-${environment}.json`,
      code: JSON.stringify(
        configureTypeScript(packageConfig, environment),
        null,
        2,
      ),
    }),
  );

  bundles.push({
    type: 'configureTypeScript',
    isIndex: true,
    path: packageEntryFile,
    code: JSON.stringify(
      {
        files: [],
        references: bundles.map(({ path }) => ({ path: `./${path}` })),
      },
      null,
      2,
    ),
  });

  return bundles.map(({ path: bundlePath, ...bundle }) => ({
    path: path.join(packageConfig.packageInfo.packageConfigDir, bundlePath),
    ...bundle,
  }));
};

export const bundleTypeScriptEntry = (
  packageConfigs: Array<PackageConfigParsed>,
): Array<BundledCode> => {
  if (!packageConfigs.length) {
    return [];
  }
  const [
    {
      packageInfo: { rootDir },
    },
  ] = packageConfigs;
  return [
    {
      type: 'configureTypeScript',
      isIndex: true,
      path: path.join(rootDir, 'tsconfig.json'),
      code: JSON.stringify(
        {
          files: [],
          references: packageConfigs.map(
            ({ packageInfo: { rootDir, packageConfigDir } }) => ({
              path: `./${path.join(
                path.relative(rootDir, packageConfigDir),
                packageEntryFile,
              )}`,
            }),
          ),
        },
        null,
        2,
      ),
    },
  ];
};
