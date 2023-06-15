import type { PackageConfig } from '../entities';
import { CONFIG_FILENAME, PackageConfigSchema } from '../entities';
import type { PackageJson } from 'type-fest';
import { readJson } from './readJson';
import path from 'node:path';

export class FileReader {
  /**
   * Read a package config file as an object at the given absolute directory.
   */
  public async readPackageConfig(absoluteDir: string) {
    const packageConfig = await readJson<PackageConfig>(
      path.join(absoluteDir, CONFIG_FILENAME),
    );
    if (!packageConfig) {
      throw new Error(`Package config not found at "${absoluteDir}".`);
    }
    return PackageConfigSchema.parse(packageConfig);
  }

  /**
   * Read a package JSON file as an object at the given absolute directory.
   */
  public async readPackageJson(absoluteDir: string) {
    const packageConfigJson = await readJson<PackageJson>(
      path.join(absoluteDir, 'package.json'),
    );
    if (!packageConfigJson) {
      return undefined;
    }
    if (!packageConfigJson.name) {
      throw new Error('A package must be named.');
    }
    if (packageConfigJson.name === 'root') {
      throw new Error('Do not name a package "root".');
    }
    return packageConfigJson;
  }
}
