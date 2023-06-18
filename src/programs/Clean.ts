import { Program } from '../lib/Program';
import path from 'node:path';
import { PackageInfo, RepoInfo } from '../entities';
import rimraf from 'rimraf';

export default class Clean extends Program {
  public async run() {
    await this.withInfo({
      withRoot: this.cleanRoot,
      withPackage: this.cleanPackage,
    });

    await this.fileWriter.writeFiles();
  }

  private async cleanPackage({ packageDir, distDir, cacheDir }: PackageInfo) {
    const { isHard } = this.programInfo;
    await Promise.all([
      isHard ? Clean.rimraf(path.join(packageDir, 'node_modules')) : null,
      Clean.rimraf(path.join(distDir, '*'), { glob: true }),
      Clean.rimraf(cacheDir),
    ]);
  }

  private async cleanRoot({ rootDir }: RepoInfo) {
    const { isHard } = this.programInfo;
    await Promise.all([
      isHard ? Clean.rimraf(path.join(rootDir, 'node_modules')) : null,
    ]);
  }

  private static async rimraf(deletePath: string, options = {}) {
    return new Promise((resolve, reject) => {
      rimraf(deletePath, options, (err) => {
        if (err) {
          return reject(err);
        }
        resolve(undefined);
      });
    });
  }
}
