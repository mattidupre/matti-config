import type { PackageInfo } from '../entities';
import path from 'node:path';
import { pathDotPrefix } from '../utils/pathDotPrefix';
import { Program } from '../lib/Program';

const EXTRA_FILES = ['.yml', '.yaml'];

const VITE_ARGS = '--clearScreen false';

const VITE_WATCH_ARGS = '--watch';

const TSC_WATCH_ARGS = '--watch --preserveWatchOutput';

export default class Build extends Program {
  public async run() {
    await this.withInfo({
      withPackage: this.buildPackage,
    });
  }

  private async buildPackage({
    cacheDir,
    distDir,
    sourceDir,
    packageDir,
    packageType,
    packageJsExtension,
    target,
  }: PackageInfo) {
    const { isDevMode } = this.programInfo;
    await this.fileManager.rimraf(path.join(distDir, '**/*', '*.tsbuildinfo'));

    if (target === 'node' || target === 'universal') {
      return Promise.all([
        this.fileManager.copyFiles(
          EXTRA_FILES.map((ext) => `**/*${ext}`),
          { sourceDir, distDir },
        ),
        this.scriptRunner.run('tsc', {
          args: [
            '--project',
            path.join(cacheDir, 'tsconfig-dist.json'),
            isDevMode ? TSC_WATCH_ARGS : '',
          ],
        }),
      ]).then(() => {});
    }

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

    const distPromise = this.scriptRunner.run(distBase, {
      args: [
        '--config',
        pathDotPrefix(path.relative(this.scriptRunner.cwd, viteConfigPath)),
        pathDotPrefix(path.relative(this.scriptRunner.cwd, packageDir)),
      ],
    });

    const tscPromise =
      packageType === 'library'
        ? this.scriptRunner.run('tsc', {
            args: [
              '--project',
              path.join(cacheDir, 'tsconfig-dist.json'),
              '--emitDeclarationOnly',
              '--declarationMap',
              isDevMode ? TSC_WATCH_ARGS : '',
            ],
          })
        : Promise.resolve();

    await Promise.all([distPromise, tscPromise]);
  }
}
