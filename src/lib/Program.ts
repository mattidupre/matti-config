import {
  type ProgramInfo,
  type PackageInfo,
  type RepoInfo,
  CONFIG_APP_CONFIGS_EXTNAME,
} from '../entities.js';
import path from 'node:path';
import { WorkspacesNavigator } from '../utils/WorkspacesNavigator/index.js';
import { ConfigReader } from './ConfigReader.js';
import { FileWriter } from './FileWriter.js';
import { FileManager } from './FileManager.js';
import { ScriptRunner } from './ScriptRunner.js';
import { Logger } from './Logger.js';
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

  private readonly workspacesNavigator: InstanceType<
    typeof WorkspacesNavigator
  >;

  private readonly logger: InstanceType<typeof Logger>;

  public log: InstanceType<typeof Logger>['log'];

  constructor(programInfo: ProgramInfo) {
    this.programInfo = programInfo;
    this.cwd = process.cwd();
    this.programName = programInfo.program;
    this.configReader = new ConfigReader();
    this.fileWriter = new FileWriter();
    this.fileManager = new FileManager();
    // TODO: Tie this to current logger.
    this.scriptRunner = new ScriptRunner({ cwd: CONFIG_APP_DIST_DIR });
    this.workspacesNavigator = new WorkspacesNavigator(this.cwd);
    this.logger = new Logger({ color: 'cyan', heading: this.programName });
    this.log = this.logger.log.bind(this.logger);
  }

  public static async import(programInfo: ProgramInfo) {
    const { default: SomeClass } = await import(
      path.join(CONFIG_APP_PROGRAMS_DIR, `${programInfo.program}.js`)
    );
    const instance = new SomeClass(programInfo) as InstanceType<typeof Program>;
    try {
      await instance.run();
    } catch (err) {
      instance.logger.log({ level: 'error' }, err.message, err);
    }
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

  // Allows this.log to automatically include package name.
  private async callWithLogContext<TArgs extends Array<unknown>>(
    fn: undefined | { (...args: TArgs): unknown },
    subHeading: string,
    sequential: boolean,
    ...args: TArgs
  ) {
    if (!fn) {
      return;
    }
    const logger = this.logger.extend(({ heading }) => ({
      heading: [
        heading[0],
        subHeading + (sequential ? ' (sequential)' : ' (parallel)'),
      ],
    }));
    const ctx = new Proxy(this, {
      get(target, prop) {
        if (prop === 'temp') {
          return subHeading;
        }
        if (prop === 'logger') {
          return logger;
        }
        if (prop === 'log') {
          return logger.log.bind(logger);
        }
        // @ts-expect-error
        // eslint-disable-next-line prefer-rest-params
        return Reflect.get(...arguments);
      },
    });
    await logger.log('info', 'STARTING');
    try {
      await fn.apply(ctx, args);
    } catch (err) {
      await logger.log('error', err.message, '\n', err);
    }
    await logger.log('info', 'FINISHED');
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

    const callRoot = async () => {
      const repoInfo = await this.getRepoInfo();
      await this.callWithLogContext(withRoot, 'root', sequential, repoInfo);
    };

    const callPackage = async (packageDir) => {
      const packageInfo = await this.getPackageInfo(packageDir);
      await this.callWithLogContext(
        withPackage,
        packageInfo.name,
        sequential,
        packageInfo,
      );
    };

    const callDependency = async (dependencyDir) => {
      const packageInfo = await this.getPackageInfo(dependencyDir);
      await this.callWithLogContext(
        withDependency,
        `dep ${packageInfo.name}`,
        sequential,
        packageInfo,
      );
    };

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

    this.log('info', 'ALL PACKAGES FINISHED');
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
