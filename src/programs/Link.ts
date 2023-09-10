// TODO: traverse all folders in parent directory, i.e., ~/Repositories

import path from 'node:path';
import { Program } from '../lib/Program.js';
import { CONFIG_APP_NAME } from '../entities.js';
import { Memoize } from 'typescript-memoize';
import { WorkspacesNavigator } from '../utils/WorkspacesNavigator/index.js';
import fg from 'fast-glob';
import {
  type PackageInfo,
  type PackageJson,
  type RepoInfo,
} from '../entities.js';
import { pathDotPrefix } from '../utils/pathDotPrefix.js';

export default class Link extends Program {
  public async run() {
    await this.withInfo({
      withRoot: this.linkRoot,
      withPackage: this.linkPackage,
    });
  }

  async linkRoot(repoInfo: RepoInfo) {
    const { rootDir, packageJson } = repoInfo;
    return this.buildPackage({ packageDir: rootDir, packageJson });
  }

  async linkPackage(packageInfo: PackageInfo) {
    const { packageDir, packageJson } = packageInfo;
    return this.buildPackage({ packageDir, packageJson });
  }

  private externalConfigDir: false | string = undefined;

  private async buildPackage({
    packageDir,
    packageJson,
  }: {
    packageDir: string;
    packageJson: PackageJson;
  }) {
    const packageDependencies = [
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.peerDependencies ?? {}),
    ];

    const externalPackageDirs = (
      await Promise.all(
        packageDependencies.map((packageName) => {
          if (packageName === CONFIG_APP_NAME) {
            return undefined;
          }
          return this.getExternalPackageDir(packageName);
        }),
      )
    )
      .filter((v) => v !== undefined)
      .map((v) => pathDotPrefix(path.relative(packageDir, v)));

    // Always link this package, even if it is not in dependencies.
    this.externalConfigDir =
      this.externalConfigDir ??
      ((await this.getExternalPackageDir(CONFIG_APP_NAME)) || false);

    if (this.externalConfigDir) {
      externalPackageDirs.unshift(this.externalConfigDir);
    }

    await Promise.all(
      externalPackageDirs.map((externalPackageDir) => {
        this.log('info', `linking ${externalPackageDir}`);
        return this.scriptRunner.run('pnpm', {
          args: ['link', externalPackageDir],
          cwd: packageDir,
        });
      }),
    );
  }

  /**
   * For a given package name, iterates through all navigators in parent dir
   * and returns the matching directory.
   */
  @Memoize()
  private async getExternalPackageDir(packageName: string) {
    let externalPackageDir: string;
    await Promise.all(
      (
        await this.getExternalNavigators()
      ).map(async (wn) => {
        const packageDir = await wn.getWorkspaceDir(packageName);
        if (packageDir) {
          if (externalPackageDir) {
            throw new Error(
              `Multiple linked packages found matching "${packageName}".`,
            );
          }
          externalPackageDir = packageDir;
        }
      }),
    );
    return externalPackageDir;
  }

  private externalNavigators: Promise<
    Array<InstanceType<typeof WorkspacesNavigator>>
  >;

  /**
   * Returns a WorkspacesNavigator instance for each package in the parent dir.
   * _Only runs once._
   */
  private getExternalNavigators() {
    if (!this.externalNavigators) {
      this.externalNavigators = Promise.resolve().then(async () => {
        const { rootDir } = await this.getRepoInfo();
        const externalsDir = path.resolve(rootDir, '..');
        const externalRepoPaths = await fg(['./*/package.json'], {
          dot: true,
          cwd: externalsDir,
          ignore: [`./${path.relative(externalsDir, rootDir)}/**/*`],
          absolute: true,
        });

        return Promise.all(
          externalRepoPaths.map(
            (repoPath) => new WorkspacesNavigator(path.dirname(repoPath)),
          ),
        );
      });
    }
    return this.externalNavigators;
  }
}
