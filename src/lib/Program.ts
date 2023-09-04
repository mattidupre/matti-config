import {
  type ProgramInfo,
  type PackageInfo,
  type RepoInfo,
  CONFIG_APP_CONFIGS_EXTNAME,
} from '../entities.js';
import path from 'node:path';
import chalk from 'chalk';
import { WorkspacesNavigator } from '../utils/WorkspacesNavigator/index.js';
import { ConfigReader } from './ConfigReader.js';
import { FileWriter } from './FileWriter.js';
import { FileManager } from './FileManager.js';
import { ScriptRunner } from './ScriptRunner.js';
import {
  PROGRAMS,
  CONFIG_CACHE_DIRNAME,
  CONFIG_APP_ROOT_DIR,
  CONFIG_APP_CONFIGS_DIR,
  CONFIG_APP_PROGRAMS_DIR,
  CONFIG_APP_DIST_DIR,
  SOURCE_DIRNAME,
  DIST_DIRNAME,
} from '../entities.js';
import { Memoize } from 'typescript-memoize';

export class Program {
  protected readonly programInfo: ProgramInfo;

  protected readonly cwd: string;

  protected readonly programName: keyof typeof PROGRAMS;

  protected readonly configReader: InstanceType<typeof ConfigReader>;

  protected readonly fileWriter: InstanceType<typeof FileWriter>;

  protected readonly fileManager: InstanceType<typeof FileManager>;

  protected readonly scriptRunner: InstanceType<typeof ScriptRunner>;

  protected readonly workspacesNavigator: InstanceType<
    typeof WorkspacesNavigator
  >;

  constructor(programInfo: ProgramInfo) {
    this.programInfo = programInfo;
    this.cwd = process.cwd();
    this.programName = programInfo.program;
    this.configReader = new ConfigReader();
    this.fileWriter = new FileWriter();
    this.fileManager = new FileManager();
    this.scriptRunner = new ScriptRunner(CONFIG_APP_DIST_DIR);
    this.workspacesNavigator = new WorkspacesNavigator(this.cwd);
  }

  public static async import(programInfo: ProgramInfo) {
    const { default: SomeClass } = await import(
      path.join(CONFIG_APP_PROGRAMS_DIR, `${programInfo.program}.js`)
    );
    const instance = new SomeClass(programInfo) as InstanceType<typeof Program>;
    console.log(`Running ${programInfo.program}`);
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

    const packageJson = await this.configReader.readPackageJson(rootDir);

    return {
      cwd: this.cwd,
      rootDir,
      packageJson,
      configRootDir: CONFIG_APP_ROOT_DIR,
      configsDir: CONFIG_APP_CONFIGS_DIR,
      isMonorepo,
      rootJsExtension: CONFIG_APP_CONFIGS_EXTNAME,
    };
  }

  public async getPackageInfo(packageDir: string): Promise<PackageInfo> {
    const [repoInfo, isPackageAtRoot, packageConfig, packageJson] =
      await Promise.all([
        this.getRepoInfo(),
        this.getIsAtRoot(packageDir),
        this.configReader.readPackageConfig(packageDir),
        this.configReader.readPackageJson(packageDir),
      ]);

    const { name } = packageJson;
    const { rootDir } = repoInfo;
    const { type: packageType, target } = packageConfig;
    const cacheDir = path.join(packageDir, CONFIG_CACHE_DIRNAME);
    const sourceDir = path.join(packageDir, SOURCE_DIRNAME);
    const distDir = path.join(packageDir, DIST_DIRNAME);
    // TODO: package node_modules dir "modulesDir"
    const isPackageFrontend = ['browser', 'react'].includes(target);
    const environments: PackageInfo['environments'] = [
      'dist',
      'test',
      ...(isPackageFrontend ? (['stories'] as const) : ([] as const)),
    ];
    const packageJsExtension = CONFIG_APP_CONFIGS_EXTNAME;

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
      packageJson,
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
    withDependency,
    sequential,
  }: {
    withRoot?: (repoInfo: RepoInfo) => Promise<void>;
    withPackage?: (packageInfo: PackageInfo) => Promise<void>;
    withDependency?: (packageInfo: PackageInfo) => Promise<void>;
    sequential?: boolean;
  }) {
    const {
      programInfo: { isExecuteAll, isExecuteRoot },
    } = this;
    const isAtRoot = await this.getIsAtRoot();

    const callRoot = async () => withRoot?.call(this, await this.getRepoInfo());

    const callPackage = async (packageDir) =>
      withPackage?.call(this, await this.getPackageInfo(packageDir));

    const callDependency = async (dependencyDir) =>
      withDependency?.call(this, await this.getPackageInfo(dependencyDir));

    if (isAtRoot || isExecuteAll) {
      await callRoot();
      await this.workspacesNavigator.withWorkspaces(
        { sequential },
        callPackage,
      );
    } else if (isExecuteRoot) {
      await callRoot();
    } else {
      const packageDir =
        await this.workspacesNavigator.getNearestWorkspaceDir();
      await this.workspacesNavigator.withDependencies(
        packageDir,
        { sequential },
        callDependency,
      );
      await callPackage(packageDir);
    }
  }

  public async log(titleStr: string, messageStr?: string) {
    const program = chalk.bold(this.programInfo.program.toUpperCase() + ':');
    const title = messageStr ? ' ' + titleStr.toUpperCase() : '';
    const message = ' ' + (messageStr ?? titleStr);

    console.log(
      chalk.cyan(chalk.inverse(' ' + program + title + ' ') + message),
    );
  }

  public async getIsAtRoot(packageDir?: string) {
    const [rootDir, currentPackageDir = null] = await Promise.all([
      this.workspacesNavigator.getRootDir(),
      packageDir ?? this.workspacesNavigator.getNearestWorkspaceDir(),
    ]);
    return !path.relative(rootDir, currentPackageDir);
  }

  // TODO: Get rid of everything below.

  public async getActivePackageDirsIterator() {
    const [{ isMonorepo, rootDir }, currentPackageDir] = await Promise.all([
      this.getRepoInfo(),
      this.workspacesNavigator.getNearestWorkspaceDir(),
    ]);

    if (!isMonorepo) {
      return [rootDir] as Iterable<string>;
    }
    if (currentPackageDir && path.relative(currentPackageDir, rootDir)) {
      return [currentPackageDir] as Iterable<string>;
    }
    return this.workspacesNavigator.getWorkspaceDirsIterator();
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
    return Promise.all(allPromises);
  }
}
