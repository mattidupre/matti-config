import path from 'node:path';
import fs from 'node:fs';
import type { PackageJson } from '../types';

export const readPackageJson = async (
  packageDir: string,
): Promise<false | PackageJson> => {
  const packagePath = path.join(packageDir, 'package.json');
  if (!fs.existsSync(packagePath)) {
    return false;
  }
  return fs.promises
    .readFile(packagePath)
    .then((fileContent) => JSON.parse(String(fileContent)));
};
