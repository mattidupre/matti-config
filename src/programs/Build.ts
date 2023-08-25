import type { PackageInfo } from '../entities.js';
import { createBuildCompleteMessage } from '../entities.js';
import path from 'node:path';
import { pathDotPrefix } from '../utils/pathDotPrefix.js';
import { Program } from '../lib/Program.js';

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

    await Promise.all(
      [
        this.fileManager.copyFiles(
          // TODO: Add watch option.
          EXTRA_FILES.map((ext) => `**/*${ext}`),
          { sourceDir, distDir },
        ),
        target === 'browser' || target === 'react'
          ? [this.buildTsc(packageInfo, true), this.buildVite(packageInfo)]
          : this.buildTsc(packageInfo, false),
      ].flat(),
    );
  }

  private logAsBuilt(packageName: string) {
    console.log(`${createBuildCompleteMessage(packageName)}`);
  }

  private async buildTsc(
    { cacheDir }: PackageInfo,
    emitDeclarationOnly: boolean,
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

    await Promise.all([
      this.scriptRunner.run('tsc', {
        args: [
          ...tscArgs,
          ...(this.programInfo.isWatchMode ? [TSC_WATCH_ARGS] : []),
        ],
      }),
      this.scriptRunner.run('tsc-alias', {
        args: [
          ...tscAliasArgs,
          ...(this.programInfo.isWatchMode ? ['--watch'] : []),
        ],
      }),
    ]);
  }

  private async buildRollup({
    name,
    cacheDir,
    packageJsExtension,
  }: PackageInfo) {
    // return this.scriptRunner.run('rollup', {
    //   args: [
    //     '--config',
    //     path.join(cacheDir, `rollup.config${packageJsExtension}`),
    //     '--sourcemap',
    //     '--no-watch.clearScreen',
    //     this.programInfo.isWatchMode ? ROLLUP_WATCH_ARGS : '',
    //   ],
    //   onOutput: (message) => {
    //     if (/created /.test(message)) {
    //       this.logAsBuilt(name);
    //     }
    //   },
    // });
  }

  private async buildVite({
    name,
    cacheDir,
    packageDir,
    packageType,
    packageJsExtension,
  }: PackageInfo) {
    const { isWatchMode, isWatchProductionMode } = this.programInfo;

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
    } else {
      if (isWatchMode) {
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
