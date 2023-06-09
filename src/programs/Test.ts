import type { PackageInfo } from '../entities';
import path from 'node:path';
import { Program } from '../lib/Program';

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
    const { isDevMode } = this.programInfo;

    const vitestConfigPath = path.join(
      cacheDir,
      `vitest.config${packageJsExtension}`,
    );

    // const testPaths = process.argv.slice(3).filter((a) => !a.startsWith('-'));

    await this.scriptRunner.run('vitest', {
      args: [
        isDevMode ? 'watch' : 'run',
        `--config ${vitestConfigPath}`,
        `--dir ${packageDir}`,
        `--passWithNoTests`,
        // ...testPaths,
      ],
      cwd: packageDir,
    });
  }
}
