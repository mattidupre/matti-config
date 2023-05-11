import path from 'node:path';
import type { PackageInfo } from '../types';
import { getNearestPackageDir } from './getNearestPackageDir';

const configDir = getNearestPackageDir(__dirname);
const packageConfigDirName = '.kit';
const packageConfigFileName = 'kit.config';

export const buildPackageInfo = ({
  rootDir,
  packageDir,
}: Pick<PackageInfo, 'rootDir' | 'packageDir'>): PackageInfo => ({
  rootDir,
  configDir,
  configName: 'matti-config',
  sourceDir: path.join(packageDir, 'src'),
  packageDir,
  packageConfigDir: path.join(packageDir, packageConfigDirName),
  packageConfigPath: path.join(packageDir, `${packageConfigFileName}.json`),
  packageConfigPathBundled: path.join(
    packageDir,
    packageConfigDirName,
    `${packageConfigFileName}.js`,
  ),
});
