import { Program } from '../lib/Program.js';
import { pathDotPrefix } from '../utils/pathDotPrefix.js';
import path from 'node:path';
import { PackageInfo, RepoInfo } from '../entities.js';

export default class Lint extends Program {
  public async run() {
    await this.withInfo({
      withPackage: this.lintPackage,
    });
  }

  public async lintPackage(packageInfo: PackageInfo) {
    const { packageDir, configRootDir, rootDir, rootJsExtension, sourceDir } =
      packageInfo;
    const cwd = configRootDir;
    const filesGlob = pathDotPrefix(
      path.relative(cwd, path.join(sourceDir, '**/*')),
    );

    return this.scriptRunner.run('eslint', {
      cwd,
      args: [
        '--config',
        pathDotPrefix(path.relative(cwd, path.join(rootDir, `.eslintrc.cjs`))),
        '--resolve-plugins-relative-to',
        configRootDir,
        '--no-error-on-unmatched-pattern',
        `${filesGlob}`,
      ],
    });
  }
}
