import { STORYBOOK_DIRNAME } from '../entities.js';
import type { PackageInfo } from '../entities.js';
import path from 'node:path';
import { pathDotPrefix } from '../utils/pathDotPrefix.js';
import { Program } from '../lib/Program.js';

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
    const { isWatchMode } = this.programInfo;

    const baseArgs = [
      // '--type',
      // 'REACT',
      '--disable-telemetry',
      '--config-dir',
      path.join(cacheDir, `.storybook`),
    ];

    if (isWatchMode) {
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
