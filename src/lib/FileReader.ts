import path from 'node:path';
import fs from 'node:fs';
import { jsonc } from 'jsonc';
import { type JsonObject, type PackageJson } from 'type-fest';
import { type PackageConfig } from '../entities.js';
import { CONFIG_FILENAME, PackageConfigSchema } from '../entities.js';

export class FileReader {
  /**
   * Read any JSON file at the given absolute path.
   */
  public async readJson<TypeT extends JsonObject = JsonObject>(
    absolutePath: string,
  ): Promise<undefined | TypeT> {
    if (!fs.existsSync(absolutePath)) {
      return Promise.resolve(undefined);
    }
    const fileString = await fs.promises.readFile(absolutePath);
    const fileData = jsonc.parse(String(fileString));
    return fileData as TypeT;
  }

  /**
   * Read a package config file as an object at the given absolute directory.
   */
  public async readPackageConfig(absoluteDir: string) {
    const packageConfig = await this.readJson<PackageConfig>(
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
    const packageConfigJson = await this.readJson<PackageJson>(
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
