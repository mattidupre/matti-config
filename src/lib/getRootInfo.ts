import path from 'node:path';
import pm from 'picomatch';
import { readPackageJson } from './readPackageJson';
import { PackageJson } from '../types';

const isRootPackage = (
  startDir: string,
  packageDir: string,
  packageJson: PackageJson,
) => {
  if (!packageJson.workspaces) {
    return false;
  }
  const relativePath = path.relative(packageDir, startDir);
  if (relativePath === '') {
    return true;
  }
  if (!(pm(packageJson.workspaces)(relativePath) > 0)) {
    console.warn(
      'Current directory is not included in root package workspaces.',
    );
  }
  return true;
};

export const getRootInfo = async (startDir: string = process.cwd()) => {
  let prevDir;
  let thisDir = startDir;
  let packageJson: false | PackageJson;
  while (true) {
    packageJson = await readPackageJson(thisDir);
    if (packageJson && isRootPackage(startDir, thisDir, packageJson)) {
      break;
    }
    prevDir = thisDir;
    thisDir = path.normalize(path.join(thisDir, '..'));
    if (prevDir === thisDir) {
      throw new Error(`Root package.json cannot be found from '${thisDir}'.`);
    }
  }

  return {
    rootDir: thisDir,
    workspaces: [].concat(packageJson.workspaces) as Array<string>,
    rootPackageJson: packageJson as PackageJson,
  };
};
