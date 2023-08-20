// TODO: traverse all folders in parent directory, i.e., ~/Repositories

import path from 'node:path';
import { Program } from '../lib/Program.js';
import { CONFIG_APP_NAME } from '../entities.js';
import { Memoize } from 'typescript-memoize';
import { WorkspacesNavigator } from '../utils/WorkspacesNavigator/index.js';
import fg from 'fast-glob';
import { type PackageInfo } from '../entities.js';
import { pathDotPrefix } from '../utils/pathDotPrefix.js';

export default class Link extends Program {
  public async run() {
    await this.withInfo({
      withPackage: this.buildPackage,
    });
  }

  private async buildPackage(packageInfo: PackageInfo) {
    const { name, packageDir, packageJson } = packageInfo;
    const packageDependencies = [
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.peerDependencies ?? {}),
    ];

    const externalPackageDirs = (
      await Promise.all(
        packageDependencies.map((packageName) =>
          this.getExternalPackageDir(packageName),
        ),
      )
    )
      .filter((v) => v !== undefined)
      .map((v) => pathDotPrefix(path.relative(packageDir, v)));

    await Promise.all(
      externalPackageDirs.map((externalPackageDir) => {
        console.log(`${name}: linking ${externalPackageDir}`);
        return this.scriptRunner.run('pnpm', {
          args: ['link', externalPackageDir],
          cwd: packageDir,
        });
      }),
    );
  }

  @Memoize()
  private async getExternalPackageDir(packageName: string) {
    if (packageName === CONFIG_APP_NAME) {
      return undefined;
    }
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
