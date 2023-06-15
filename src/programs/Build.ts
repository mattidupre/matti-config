import type { PackageInfo } from '../entities';
import path from 'node:path';
import { pathDotPrefix } from '../utils/pathDotPrefix';
import { CONFIG_EXTNAME, STORYBOOK_DIRNAME } from '../entities';
import { Program } from '../lib/Program';

export default class Build extends Program {
  public async run() {
    await this.withInfo({
      withPackage: this.buildPackage,
    });
  }

  private async lintRoot() {}

  private async buildPackage({
    cacheDir,
    packageDir,
    packageType,
    target,
  }: PackageInfo) {
    if (target === 'node') {
      return;
    }

    const { isDevMode } = this.programInfo;

    const viteConfigPath = path.join(cacheDir, `vite.config${CONFIG_EXTNAME}`);

    let distBase;
    if (packageType === 'app') {
      if (isDevMode) {
        distBase = 'vite';
      } else {
        distBase = 'vite build';
      }
    } else {
      if (isDevMode) {
        distBase = 'vite build --watch';
      } else {
        distBase = 'vite build';
      }
    }

    return this.scriptRunner.run(distBase, {
      args: [
        '--config',
        pathDotPrefix(path.relative(this.scriptRunner.cwd, viteConfigPath)),
        pathDotPrefix(path.relative(this.scriptRunner.cwd, packageDir)),
      ],
    });
  }
}
