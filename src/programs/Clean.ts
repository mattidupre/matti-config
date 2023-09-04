import { Program } from '../lib/Program.js';
import path from 'node:path';
import { PackageInfo, RepoInfo } from '../entities.js';

const EXTRA_PACKAGE_FILES = ['tsconfig.json', 'project.json'];

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

    const nodeModulesDir = path.join(packageDir, 'node_modules');

    await Promise.all([
      ...(isHard
        ? [this.fileManager.rimraf(nodeModulesDir)]
        : [
            this.fileManager.rimraf(path.join(nodeModulesDir, '.vite')),
            this.fileManager.rimraf(path.join(nodeModulesDir, '.cache')),
            this.fileManager.rimraf(path.join(distDir, '*'), { glob: true }),
          ]),
      this.fileManager.rimraf(cacheDir),
      ...EXTRA_PACKAGE_FILES.map((extraPackageFile) =>
        this.fileManager.rimraf(path.join(packageDir, extraPackageFile)),
      ),
    ]);
  }

  private async cleanRoot({ rootDir }: RepoInfo) {
    const { isHard } = this.programInfo;
    await Promise.all([
      isHard
        ? this.fileManager.rimraf(path.join(rootDir, 'node_modules'))
        : null,
    ]);
  }
}
