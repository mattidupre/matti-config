import { Program } from '../lib/Program';
import path from 'node:path';
import { PackageInfo, RepoInfo } from '../entities';

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
      isHard
        ? this.fileDeleter.rimraf(path.join(packageDir, 'node_modules'))
        : null,
      this.fileDeleter.rimraf(path.join(distDir, '*'), { glob: true }),
      this.fileDeleter.rimraf(cacheDir),
    ]);
  }

  private async cleanRoot({ rootDir }: RepoInfo) {
    const { isHard } = this.programInfo;
    await Promise.all([
      isHard
        ? this.fileDeleter.rimraf(path.join(rootDir, 'node_modules'))
        : null,
    ]);
  }
}
