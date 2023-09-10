import path from 'node:path';
import { Transform } from 'node:stream';
import fg from 'fast-glob';
import { type PackageJson } from 'type-fest';
import { Memoize } from 'typescript-memoize';
import { readJson } from '../../lib/readJson.js';
import { readYaml } from '../../lib/readYaml.js';
import { StreamMemoizer } from './utils/StreamMemoizer.js';
import { stream } from 'event-iterator';
import { parseWorkspaces } from './lib/parseWorkspaces.js';
import { generateParentPackageDirs } from './lib/generateParentPackageDirs.js';

export type WorkspaceInfo = {
  isMonorepo: boolean;
  isRootPackage: boolean;
  absoluteRootDir: string;
  relativeRootDir: string;
  absolutePackageDir: string;
  relativePackageDir: string;
};

type DependencyGraphEntry = {
  name: string;
  directory: string;
  parentName: string;
  allParentNames: Array<string>;
  childNames: Array<string>;
  allChildNames: Array<string>;
};

type DependencyGraph = Map<string, DependencyGraphEntry>;

type WithWorkspaceCallback = (
  dependencyDir: string,
  dependencyName: string,
) => void | Promise<void>;

type WithWorkspaceOptions = {
  sequential?: boolean;
};

const wrapWithWorkspaceCallback = (
  options: WithWorkspaceOptions,
  callback: WithWorkspaceCallback,
): [WithWorkspaceCallback, () => Promise<undefined>] => {
  const callbacks: Array<() => Promise<void>> = [];

  return [
    (...args) => {
      callbacks.push(async () => {
        await callback(...args);
      });
    },
    () => {
      if (options.sequential) {
        return callbacks.reduce(
          (p, c) => p.then(() => c()),
          Promise.resolve(undefined),
        );
      }

      return Promise.all(callbacks.map((c) => c())).then(() => undefined);
    },
  ];
};

// TODO: Rename "package" terminology to "workspace".

export class WorkspacesNavigator {
  private readonly cwd: string;

  private streamMemoizer: StreamMemoizer;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Return true if workspaces is set at the root.
   */
  @Memoize()
  public async getIsMonorepo(): Promise<boolean> {
    return !!(await this.getWorkspacesConfig());
  }

  @Memoize()
  public async getNearestWorkspaceDir() {
    const parentPackageDir = generateParentPackageDirs(this.cwd).next().value;
    if (!parentPackageDir) {
      throw new Error('Nearest package not found.');
    }
    return parentPackageDir;
  }

  @Memoize()
  public async getRootDir(): Promise<string> {
    let firstPackageDir: string | undefined;

    for (const thisPackageDir of generateParentPackageDirs(this.cwd)) {
      firstPackageDir = thisPackageDir;
      // eslint-disable-next-line no-await-in-loop
      if (await WorkspacesNavigator.readWorkspaces(thisPackageDir)) {
        return thisPackageDir;
      }
    }

    return firstPackageDir;
  }

  @Memoize()
  public async getWorkspacesDirs(): Promise<Array<string>> {
    const workspaceDirs = [];
    for await (const dir of await this.getWorkspaceDirsIterator()) {
      workspaceDirs.push(dir);
    }
    return workspaceDirs;
  }

  /**
   * Crawl all workspaces sorted in order of dependencies.
   */
  public async withWorkspaces(
    options: WithWorkspaceOptions,
    callback: WithWorkspaceCallback,
  ) {
    const [wrappedCallback, getCallbackPromise] = wrapWithWorkspaceCallback(
      options,
      callback,
    );

    const sortedDependencies = await this.getSortedDependencies(
      await this.getWorkspacesDirs(),
    );

    await Promise.all(
      sortedDependencies.map(async (dependencyName) =>
        wrappedCallback(
          await this.getWorkspaceDir(dependencyName),
          dependencyName,
        ),
      ),
    );

    await getCallbackPromise();
  }

  /**
   * Crawl package dependency workspaces sorted in order of dependencies.
   */
  public async withDependencies(
    workspaceDir: string,
    options: WithWorkspaceOptions,
    callback: WithWorkspaceCallback,
  ) {
    const [wrappedCallback, getCallbackPromise] = wrapWithWorkspaceCallback(
      options,
      callback,
    );

    const workspaceJson = await WorkspacesNavigator.readPackageJson(
      workspaceDir,
    );

    const sortedDependencies = await this.getSortedDependencies(
      await this.getInternalDependencyPaths(workspaceJson),
    );

    await Promise.all(
      sortedDependencies.map(async (dependencyName) =>
        wrappedCallback(
          await this.getWorkspaceDir(dependencyName),
          dependencyName,
        ),
      ),
    );

    await getCallbackPromise();
  }

  private async getSortedDependencies(
    workspaceDirs: Array<string>,
    parentName?: string, // TODO
  ): Promise<Array<string>> {
    const graph: DependencyGraph = new Map();
    await Promise.all(
      workspaceDirs.map((dir) =>
        this.createDependenciesGraphRecursive(
          dir,
          graph,
          [].concat(parentName),
        ),
      ),
    );
    return this.flattenDependenciesGraphRecursive(graph);
  }

  private async createDependenciesGraphRecursive(
    workspaceDir: string,
    graph: DependencyGraph,
    allParentNames: Array<string>,
  ) {
    const workspaceJson = await WorkspacesNavigator.readPackageJson(
      workspaceDir,
    );

    const { name: workspaceName } = workspaceJson;
    const childNames: DependencyGraphEntry['childNames'] = [];
    const allChildNames: DependencyGraphEntry['allChildNames'] = [];
    graph.set(workspaceName, {
      name: workspaceName,
      directory: workspaceDir,
      parentName: allParentNames.slice[allParentNames.length - 1],
      allParentNames,
      childNames,
      allChildNames,
    });

    const dependencies = await this.getInternalDependencies(workspaceJson);

    await Promise.all(
      dependencies.map(async ([dependencyName, dependencyDir]) => {
        if (allParentNames.includes(dependencyName)) {
          throw new Error(`"${dependencyName}" is a circular dependency.`);
        }

        childNames.push(dependencyName);
        allChildNames.push(dependencyName);

        if (!graph.has(dependencyName)) {
          childNames.push(
            ...(await this.createDependenciesGraphRecursive(
              dependencyDir,
              graph,
              [...allParentNames, workspaceName],
            )),
          );
        } else {
          const dependencyGraphEntry = graph.get(dependencyName);
          dependencyGraphEntry.allParentNames.push(workspaceName);
          allChildNames.push(...dependencyGraphEntry.childNames);
        }
      }),
    );

    return childNames;
  }

  private flattenDependenciesGraphRecursive(
    dependencyGraph: DependencyGraph,
    names: Array<string> = Array.from(dependencyGraph.keys()),
    start: Array<string> = [],
  ) {
    // FROM: https://stackoverflow.com/a/54347328

    const processed = [...start];
    const unprocessed = [];

    names.forEach((name) => {
      if (
        // If an instance has no dependencies, this will also return true.
        dependencyGraph.get(name).childNames.every((v) => processed.includes(v))
      ) {
        processed.push(name);
      } else {
        unprocessed.push(name);
      }
    });

    return unprocessed.length
      ? this.flattenDependenciesGraphRecursive(
          dependencyGraph,
          unprocessed,
          processed,
        )
      : processed;
  }

  /**
   * Get the path to a workspace by package.json name.
   */
  @Memoize()
  public async getWorkspaceDir(
    workspaceName: string,
  ): Promise<undefined | string> {
    const rootDir = await this.getRootDir();

    if (workspaceName === 'root') {
      return rootDir;
    }

    const rootPackageJson = await WorkspacesNavigator.readPackageJson(rootDir);
    if (rootPackageJson?.name === workspaceName) {
      return rootDir;
    }

    for await (const dir of await this.getWorkspaceDirsIterator()) {
      const packageJson = await WorkspacesNavigator.readPackageJson(dir);
      if (packageJson?.name === workspaceName) {
        return dir;
      }
    }

    return undefined;
  }

  public async getWorkspaceDirsIterator(): Promise<AsyncIterable<string>> {
    if (!this.streamMemoizer) {
      this.streamMemoizer = new StreamMemoizer(async () => {
        const [rootDir, workspaces] = await Promise.all([
          this.getRootDir(),
          this.getWorkspacesConfig(),
        ]);
        return fg
          .stream(parseWorkspaces(workspaces), {
            cwd: rootDir,
            onlyFiles: true,
            absolute: true,
          })
          .pipe(
            new Transform({
              objectMode: true,
              transform(filePath, _, callback) {
                callback(null, path.dirname(filePath.toString()));
              },
            }),
          );
      });
    }

    return stream.call(await this.streamMemoizer.get());
  }

  @Memoize()
  private async getInternalDependencies(packageJson: PackageJson) {
    const { dependencies, devDependencies, peerDependencies } = packageJson;

    return (
      await Promise.all(
        Object.keys({
          ...(dependencies ?? {}),
          ...(devDependencies ?? {}),
          ...(peerDependencies ?? {}),
        }).map(async (dependencyName) => [
          dependencyName,
          await this.getWorkspaceDir(dependencyName),
        ]),
      )
    ).filter(([, dependencyName]) => dependencyName !== undefined);
  }

  @Memoize()
  private async getInternalDependencyPaths(packageJson: PackageJson) {
    return (await this.getInternalDependencies(packageJson)).map(
      ([, dependencyPath]) => dependencyPath,
    );
  }

  /**
   * Get the "workspaces" property of the root package.json.
   */
  @Memoize()
  private async getWorkspacesConfig(): Promise<PackageJson['workspaces']> {
    return WorkspacesNavigator.readWorkspaces(await this.getRootDir());
  }

  @Memoize()
  private static async readWorkspaces(
    absoluteRootDir: string,
  ): Promise<undefined | PackageJson['workspaces'] | Array<string>> {
    const [packageJson, workspaceYaml] = await Promise.all([
      WorkspacesNavigator.readPackageJson(absoluteRootDir),
      WorkspacesNavigator.readWorkspaceYaml(absoluteRootDir),
    ]);
    return workspaceYaml?.packages ?? packageJson?.workspaces ?? undefined;
  }

  @Memoize()
  private static readPackageJson(absolutePackageDir: string) {
    return readJson<PackageJson>(path.join(absolutePackageDir, 'package.json'));
  }

  @Memoize()
  private static readWorkspaceYaml(absolutePackageDir: string) {
    return readYaml<{ packages: Array<string> }>(
      path.join(absolutePackageDir, 'pnpm-workspace.yaml'),
    );
  }
}
