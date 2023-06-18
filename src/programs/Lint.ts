import { Program } from '../lib/Program';
import { pathDotPrefix } from '../utils/pathDotPrefix';
import path from 'node:path';
import { PackageInfo, RepoInfo } from '../entities';

export default class Lint extends Program {
  public async run() {
    await this.withInfo({
      withPackage: this.lintPackage,
    });
  }

  public async lintPackage(packageInfo: PackageInfo) {
    const { packageDir, configRootDir, rootDir, packageJsExtension } =
      packageInfo;
    const cwd = configRootDir;
    const filesGlob = pathDotPrefix(
      path.relative(cwd, path.join(packageDir, '**/*')),
    );

    return this.scriptRunner.run('eslint', {
      cwd,
      args: [
        '--config',
        pathDotPrefix(
          path.relative(
            cwd,
            path.join(rootDir, `.eslintrc${packageJsExtension}`),
          ),
        ),
        '--resolve-plugins-relative-to',
        configRootDir,
        '--no-error-on-unmatched-pattern',
        `${filesGlob}`,
      ],
    });
  }
}
