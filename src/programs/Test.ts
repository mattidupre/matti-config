import path from 'node:path';
import type { PackageInfo } from '../entities.js';
import { pathDotPrefix } from '../utils/pathDotPrefix.js';
import { Program } from '../lib/Program.js';

export default class Test extends Program {
  public async run() {
    await this.withInfo({
      withPackage: this.testPackage,
    });
  }

  public async testPackage({
    packageDir,
    cacheDir,
    packageJsExtension,
  }: PackageInfo) {
    const { isWatchMode, extraArgs } = this.programInfo;

    const vitestConfigPath = path.join(
      cacheDir,
      `vitest.config${packageJsExtension}`,
    );

    // const testPaths = process.argv.slice(3).filter((a) => !a.startsWith('-'));

    await this.scriptRunner.run('vitest', {
      args: [
        isWatchMode ? 'watch' : 'run',
        '--config',
        pathDotPrefix(path.relative(this.scriptRunner.cwd, vitestConfigPath)),
        `--dir ${pathDotPrefix(
          path.relative(this.scriptRunner.cwd, packageDir),
        )}`,
        `--passWithNoTests`,
        ...extraArgs,
      ],
      forceColor: true,
    });
  }
}
