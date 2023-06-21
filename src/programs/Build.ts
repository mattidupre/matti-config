import type { PackageInfo } from '../entities';
import path from 'node:path';
import { pathDotPrefix } from '../utils/pathDotPrefix';
import { Program } from '../lib/Program';

export default class Build extends Program {
  public async run() {
    await this.withInfo({
      withPackage: this.buildPackage,
    });
  }

  private async buildPackage({
    cacheDir,
    distDir,
    packageDir,
    packageType,
    packageJsExtension,
    target,
  }: PackageInfo) {
    const { isDevMode } = this.programInfo;

    if (target === 'node') {
      return this.scriptRunner.run('tsc', {
        args: [
          '--project',
          path.join(cacheDir, 'tsconfig-dist.json'),
          isDevMode ? '--watch' : '',
        ],
      });
    }

    const viteConfigPath = path.join(
      cacheDir,
      `vite.config${packageJsExtension}`,
    );

    let distBase;
    if (packageType === 'app') {
      if (isDevMode) {
        distBase = 'vite';
      } else {
        distBase = 'vite build';
      }
    } else {
      if (isDevMode) {
        distBase = 'vite build --minify false --watch';
      } else {
        distBase = 'vite build';
      }
    }

    await this.fileDeleter.rimraf(path.join(distDir, '*'));

    return Promise.all([
      this.scriptRunner.run(distBase, {
        args: [
          '--config',
          pathDotPrefix(path.relative(this.scriptRunner.cwd, viteConfigPath)),
          pathDotPrefix(path.relative(this.scriptRunner.cwd, packageDir)),
        ],
      }),
      ...(packageType === 'library'
        ? [
            this.scriptRunner
              .run('tsc', {
                args: [
                  '--project',
                  path.join(cacheDir, 'tsconfig-dist.json'),
                  '--emitDeclarationOnly',
                  '--declarationMap',
                  ...(isDevMode ? ['--watch'] : []),
                ],
              })
              .then(() => console.log('wtf?')),
          ]
        : []),
    ]).then(() => {});
  }
}
