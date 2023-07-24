import type { PackageInfo } from '../entities';
import { createBuildCompleteMessage } from '../entities';
import path from 'node:path';
import { pathDotPrefix } from '../utils/pathDotPrefix';
import { Program } from '../lib/Program';

const EXTRA_FILES = ['.yml', '.yaml'];

const VITE_ARGS = '--clearScreen false';

const VITE_WATCH_ARGS = '--watch';

const ROLLUP_WATCH_ARGS = '--watch';

const TSC_WATCH_ARGS = '--watch --preserveWatchOutput';

export default class Build extends Program {
  public async run() {
    await this.withInfo({
      withPackage: this.buildPackage,
    });
  }

  private async buildPackage(packageInfo: PackageInfo) {
    const { sourceDir, distDir, target, packageType } = packageInfo;

    // await this.fileManager.rimraf(path.join(distDir, '**/*'));
    // await this.fileManager.rimraf(path.join(distDir, '**/*', '*.tsbuildinfo'));

    await Promise.all([
      this.fileManager.copyFiles(
        // TODO: Add watch option.
        EXTRA_FILES.map((ext) => `**/*${ext}`),
        { sourceDir, distDir },
      ),
      this.buildTypeDeclarations(packageInfo),
      target === 'browser' || target === 'react'
        ? this.buildVite(packageInfo)
        : this.buildRollup(packageInfo),
    ]);
  }

  private logAsBuilt(packageName: string) {
    console.log(`${createBuildCompleteMessage(packageName)}`);
  }

  // private async buildTsc({ cacheDir }: PackageInfo) {
  //   return this.scriptRunner.run('tsc', {
  //     args: [
  //       '--project',
  //       path.join(cacheDir, 'tsconfig-dist.json'),
  //       this.programInfo.isDevMode ? TSC_WATCH_ARGS : '',
  //     ],
  //   });
  // }

  private async buildTypeDeclarations({ cacheDir }: PackageInfo) {
    this.scriptRunner.run('tsc', {
      args: [
        '--project',
        path.join(cacheDir, 'tsconfig-dist.json'),
        '--emitDeclarationOnly',
        '--declarationMap',
        this.programInfo.isDevMode ? TSC_WATCH_ARGS : '',
      ],
    });
  }

  private async buildRollup({
    name,
    cacheDir,
    packageJsExtension,
    packageDir,
    configRootDir,
  }: PackageInfo) {
    return this.scriptRunner.run('rollup', {
      args: [
        '--config',
        path.join(cacheDir, `rollup.config${packageJsExtension}`),
        '--sourcemap',
        '--no-watch.clearScreen',
        this.programInfo.isDevMode ? ROLLUP_WATCH_ARGS : '',
      ],
      onOutput: (message) => {
        if (/created /.test(message)) {
          this.logAsBuilt(name);
        }
      },
    });
  }

  private async buildVite({
    name,
    cacheDir,
    packageDir,
    packageType,
    packageJsExtension,
  }: PackageInfo) {
    const { isDevMode } = this.programInfo;

    const viteConfigPath = path.join(
      cacheDir,
      `vite.config${packageJsExtension}`,
    );

    let distBase;
    if (packageType === 'app') {
      if (isDevMode) {
        distBase = `vite ${VITE_ARGS}`;
      } else {
        distBase = `vite build ${VITE_ARGS}`;
      }
    } else {
      if (isDevMode) {
        distBase = `vite build --minify false ${VITE_ARGS} ${VITE_WATCH_ARGS}`;
      } else {
        distBase = `vite build ${VITE_ARGS}`;
      }
    }

    return this.scriptRunner.run(distBase, {
      args: [
        '--config',
        pathDotPrefix(path.relative(this.scriptRunner.cwd, viteConfigPath)),
        pathDotPrefix(path.relative(this.scriptRunner.cwd, packageDir)),
      ],
      onOutput: (message) => {
        if (/✓ built in/.test(message)) {
          this.logAsBuilt(name);
        }
      },
    });
  }
}
