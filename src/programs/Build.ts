import type { PackageInfo } from '../types';
import path from 'node:path';
import { pathDotPrefix } from '../utils/pathDotPrefix';
import { CONFIG_EXTNAME } from '../constants';
import { Program } from '../lib/Program';

export default class Build extends Program {
  public async run() {
    await this.withInfo({
      withPackage: this.buildPackage,
    });
  }

  public async buildPackage(packageInfo: PackageInfo) {
    await Promise.all([this.vite(packageInfo), this.storybook(packageInfo)]);
  }

  private async vite({
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

  private async storybook({ cacheDir, packageType, target }: PackageInfo) {
    if (target === 'node' || packageType !== 'library') {
      return;
    }

    const storybookConfigDir = path.join(cacheDir, `.storybook`);

    console.log('\n\n\n', 'RUNNING STORYBOOK', '\n\n\n');

    await Promise.all([
      this.scriptRunner.run('storybook dev', {
        // TODO: build or dev?
        args: [
          '--config-dir',
          pathDotPrefix(
            path.relative(this.scriptRunner.cwd, storybookConfigDir),
          ),
          // '--port',
          // '3000',
          '--no-open',
        ],
      }),
    ]);
  }
}
