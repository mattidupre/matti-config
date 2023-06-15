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

  public async buildPackageStorybook({ cacheDir, packageConfig }: PackageInfo) {
    if (!packageConfig.storybook) {
      return;
    }
    const { isDevMode } = this.programInfo;

    const storybookConfigDir = path.join(cacheDir, `.storybook`);

    const baseArgs = [
      '--disable-telemetry',
      '--config-dir',
      pathDotPrefix(path.relative(this.scriptRunner.cwd, storybookConfigDir)),
    ];

    if (isDevMode) {
      return await this.scriptRunner.run('storybook dev', {
        args: [...baseArgs, '--no-open', '--port', '3000'],
      });
    }

    return await this.scriptRunner.run('storybook build', {
      args: [
        ...baseArgs,
        // Duplicate of vite config value.
        // Storybook seems to both require and ignore this value.
        '--output-dir',
        STORYBOOK_DIRNAME,
      ],
    });
  }
}
