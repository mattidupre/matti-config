import type { ProgramInfo, PackageInfo, RepoInfo } from '../entities';
import path from 'node:path';
import { WorkspacesNavigator } from '../utils/WorkspacesNavigator';
import { FileReader } from './FileReader';
import { FileWriter } from './FileWriter';
import { FileDeleter } from './FileDeleter';
import { ScriptRunner } from './ScriptRunner';
import {
  PROGRAMS,
  CONFIG_CACHE_DIRNAME,
  CONFIG_APP_ROOT_DIR,
  CONFIG_APP_CONFIGS_DIR,
  CONFIG_APP_DIST_DIR,
  SOURCE_DIRNAME,
  DIST_DIRNAME,
} from '../entities';
import { Memoize } from 'typescript-memoize';

export class Program {
  protected readonly programInfo: ProgramInfo;
  protected readonly cwd: string;
  protected readonly programName: keyof typeof PROGRAMS;
  protected readonly fileReader: InstanceType<typeof FileReader>;
  protected readonly fileWriter: InstanceType<typeof FileWriter>;
  protected readonly fileDeleter: InstanceType<typeof FileDeleter>;
  protected readonly scriptRunner: InstanceType<typeof ScriptRunner>;
  private readonly workspacesNavigator: InstanceType<
    typeof WorkspacesNavigator
  >;

  constructor(programInfo: ProgramInfo) {
    this.programInfo = programInfo;
    this.cwd = process.cwd();
    this.programName = programInfo.program;
    this.fileReader = new FileReader();
    this.fileWriter = new FileWriter();
    this.fileDeleter = new FileDeleter();
    this.scriptRunner = new ScriptRunner(CONFIG_APP_DIST_DIR);
    this.workspacesNavigator = new WorkspacesNavigator(this.cwd);
  }

  public static async import(programInfo: ProgramInfo) {
    const { default: SomeClass } = await import(
      PROGRAMS[programInfo.program].scriptPath
    );
    const instance = new SomeClass(programInfo) as InstanceType<typeof Program>;
    return instance.run();
  }

  public run() {
    // TODO: Make sure we're only calling once at a time.
  }

  @Memoize()
  public async getRepoInfo(): Promise<RepoInfo> {
    const [rootDir, isMonorepo] = await Promise.all([
      this.workspacesNavigator.getRootDir(),
      this.workspacesNavigator.getIsMonorepo(),
    ]);

    return {
      cwd: this.cwd,
      rootDir,
      configRootDir: CONFIG_APP_ROOT_DIR,
      configsDir: CONFIG_APP_CONFIGS_DIR,
      isMonorepo,
      rootJsExtension: '.js',
    };
  }

  public async getPackageInfo(packageDir: string): Promise<PackageInfo> {
    const [
      repoInfo,
      isPackageAtRoot,
      packageConfig,
      { name, type: packageJsonType },
    ] = await Promise.all([
      this.getRepoInfo(),
      this.getIsAtRoot(packageDir),
      this.fileReader.readPackageConfig(packageDir),
      this.fileReader.readPackageJson(packageDir),
    ]);
    const { rootDir } = repoInfo;
    const { type: packageType, target } = packageConfig;
    const cacheDir = path.join(packageDir, CONFIG_CACHE_DIRNAME);
    const sourceDir = path.join(packageDir, SOURCE_DIRNAME);
    const distDir = path.join(packageDir, DIST_DIRNAME);
    const isPackageFrontend = ['browser', 'react'].includes(target);
    const environments: PackageInfo['environments'] = [
      'dist',
      'test',
      ...(isPackageFrontend ? (['stories'] as const) : ([] as const)),
    ];
    const packageJsExtension = '.cjs';

    return {
      ...repoInfo,
      name,
      cwd: this.cwd,
      rootDir,
      packageDir,
      sourceDir,
      distDir,
      cacheDir,
      packageConfig,
      packageType,
      isPackageAtRoot,
      target,
      isPackageFrontend,
      environments,
      packageJsExtension,
    };
  }

  public async withInfo({
    withRoot,
    withPackage,
  }: {
    withRoot?: (repoInfo: RepoInfo) => Promise<void>;
    withPackage?: (packageInfo: PackageInfo) => Promise<void>;
  }) {
    const { programInfo: programOptions } = this;
    const isAtRoot = await this.getIsAtRoot();

    const withRootCallback = async () =>
      withRoot?.call(this, await this.getRepoInfo());
    const withPackagesCallback = async () =>
      this.withIterator(
        () => this.getActivePackageDirsIterator(),
        async (packageDir: string) =>
          withPackage?.call(this, await this.getPackageInfo(packageDir)),
        this,
      );

    if (isAtRoot || programOptions.isExecuteAll) {
      await Promise.all([withRootCallback(), withPackagesCallback()]);
    } else if (programOptions.isExecuteRoot) {
      await withRootCallback();
    } else {
      await withPackagesCallback();
    }
  }

  public async getIsAtRoot(packageDir?: string) {
    const [rootDir, currentPackageDir = null] = await Promise.all([
      this.workspacesNavigator.getRootDir(),
      packageDir ?? this.workspacesNavigator.getNearestPackage(),
    ]);
    return !path.relative(rootDir, currentPackageDir);
  }

  public async getActivePackageDirsIterator() {
    const [{ isMonorepo, rootDir }, currentPackageDir] = await Promise.all([
      this.getRepoInfo(),
      this.workspacesNavigator.getNearestPackage(),
    ]);

    if (!isMonorepo) {
      return [rootDir] as Iterable<string>;
    } else if (currentPackageDir && path.relative(currentPackageDir, rootDir)) {
      return [currentPackageDir] as Iterable<string>;
    } else {
      return this.workspacesNavigator.getWorkspaceDirsIterator();
    }
  }

  public async withIterator<T1, T2>(
    iterator: () => Promise<AsyncIterable<T1> | Iterable<T1>>,
    callback: (value: T1) => T2,
    thisContext?: unknown,
  ) {
    const allPromises: Array<Promise<T2>> = [];
    for await (const value of await iterator()) {
      allPromises.push(Promise.resolve(callback.call(thisContext, value)));
    }
    return await Promise.all(allPromises);
  }
}
