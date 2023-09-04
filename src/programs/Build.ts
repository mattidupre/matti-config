import type { PackageInfo } from '../entities.js';
import { createBuildCompleteMessage } from '../entities.js';
import path from 'node:path';
import { pathDotPrefix } from '../utils/pathDotPrefix.js';
import { Program } from '../lib/Program.js';

const EXTRA_FILES = ['.yml', '.yaml'];

const VITE_ARGS = '--clearScreen false';

const VITE_WATCH_ARGS = '--watch';

const TSC_WATCH_ARGS = '--watch --preserveWatchOutput';

export default class Build extends Program {
  public async run() {
    const { isWatchMode } = this.programInfo;

    await this.withInfo({
      withPackage: (packageInfo) =>
        this.buildPackage(packageInfo, isWatchMode).then(() => {
          createBuildCompleteMessage(packageInfo.name);
        }),
      withDependency: (packageInfo) => this.buildPackage(packageInfo, false),
      sequential: true,
    });
  }

  private async buildPackage(packageInfo: PackageInfo, isWatchMode?: boolean) {
    this.log(isWatchMode ? 'WATCHING' : 'BUILDING', packageInfo.name);

    const { sourceDir, distDir, target } = packageInfo;

    // await this.fileManager.rimraf(path.join(distDir, '**/*'));
    // await this.fileManager.rimraf(path.join(distDir, '**/*', '*.tsbuildinfo'));

    await Promise.all(
      [
        this.fileManager.copyFiles(
          // TODO: Add watch option.
          EXTRA_FILES.map((ext) => `**/*${ext}`),
          { sourceDir, distDir },
        ),
        target === 'browser' || target === 'react'
          ? [
              this.buildTsc(packageInfo, true, isWatchMode),
              this.buildVite(packageInfo, isWatchMode),
            ]
          : this.buildTsc(packageInfo, false, isWatchMode),
      ].flat(),
    );

    this.log(isWatchMode ? 'WATCH' : 'BUILD', 'complete');
  }

  private async buildTsc(
    { cacheDir }: PackageInfo,
    emitDeclarationOnly: boolean,
    isWatchMode: boolean,
  ) {
    const baseArgs = ['--project', path.join(cacheDir, 'tsconfig-dist.json')];
    const tscArgs = [
      ...baseArgs,
      emitDeclarationOnly ? '--emitDeclarationOnly' : '',
    ];
    const tscAliasArgs = [...baseArgs];

    // tsc-alias requires a non-watch run of TSC first.
    await this.scriptRunner.run('tsc', {
      args: tscArgs,
    });

    await this.scriptRunner.run('tsc-alias', {
      args: [...tscAliasArgs],
    });

    this.scriptRunner.run('tsc', {
      args: [...tscArgs, ...(isWatchMode ? [TSC_WATCH_ARGS] : [])],
    });

    this.scriptRunner.run('tsc-alias', {
      args: [...tscAliasArgs, ...(isWatchMode ? ['--watch'] : [])],
    });
  }

  private async buildVite(
    { cacheDir, packageDir, packageType, packageJsExtension }: PackageInfo,
    isWatchMode: boolean,
  ) {
    const { isWatchProductionMode } = this.programInfo;

    const viteConfigPath = path.join(
      cacheDir,
      `vite.config${packageJsExtension}`,
    );

    let distBase;
    if (packageType === 'app') {
      if (isWatchProductionMode) {
        distBase = `vite build ${VITE_ARGS} ${VITE_WATCH_ARGS}`;
      } else if (isWatchMode) {
        distBase = `vite ${VITE_ARGS}`;
      } else {
        distBase = `vite build ${VITE_ARGS}`;
      }
    } else if (isWatchMode) {
      distBase = `vite build --minify false ${VITE_ARGS} ${VITE_WATCH_ARGS}`;
    } else {
      distBase = `vite build ${VITE_ARGS}`;
    }

    let isResolved = false;
    let outerResolve: () => void;
    const isBuiltPromise = new Promise((resolve) => {
      outerResolve = () => {
        if (!isResolved) {
          isResolved = true;
          resolve(undefined);
        }
      };
    });

    this.scriptRunner.run(distBase, {
      args: [
        '--config',
        pathDotPrefix(path.relative(this.scriptRunner.cwd, viteConfigPath)),
        pathDotPrefix(path.relative(this.scriptRunner.cwd, packageDir)),
      ],
      onOutput: (message) => {
        if (
          /(?:✓ )?built in [0-9]/.test(message) ||
          /VITE v[0-9]\.[0-9]\.[0-9] +ready in [0-9]+/.test(message)
        ) {
          outerResolve();
        }
      },
    });

    return isBuiltPromise;
  }
}
