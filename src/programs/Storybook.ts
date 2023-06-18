import { STORYBOOK_DIRNAME } from '../entities';
import type { PackageInfo } from '../entities';
import path from 'node:path';
import { pathDotPrefix } from '../utils/pathDotPrefix';
import { Program } from '../lib/Program';

export default class Storybook extends Program {
  public async run() {
    await this.withInfo({
      withPackage: this.buildPackageStorybook,
    });
  }

  public async buildPackageStorybook({
    cacheDir,
    configRootDir,
    distDir,
    packageDir,
    packageConfig,
  }: PackageInfo) {
    if (!packageConfig.storybook) {
      return;
    }
    const cwd = configRootDir;
    const { isDevMode } = this.programInfo;

    const baseArgs = [
      // '--type',
      // 'REACT',
      '--disable-telemetry',
      '--config-dir',
      path.join(cacheDir, `.storybook`),
    ];

    if (isDevMode) {
      return await this.scriptRunner.run('storybook dev', {
        args: [...baseArgs, '--no-open', '--port', '3000'],
      });
    }

    return await this.scriptRunner.run('storybook build', {
      cwd,
      args: [
        ...baseArgs,
        // Duplicate of vite config value.
        // Storybook seems to both require and ignore this value.
        '--output-dir',
        path.join(packageDir, STORYBOOK_DIRNAME),
      ],
    });
  }
}
