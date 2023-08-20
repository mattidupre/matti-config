import fs from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import fg from 'fast-glob';
import type { PackageJson } from 'type-fest';
import { Memoize } from 'typescript-memoize';
import { readJson } from '../../lib/readJson.js';
import { readYaml } from '../../lib/readYaml.js';
import { StreamMemoizer } from './StreamMemoizer.js';
import { stream } from 'event-iterator';

export type WorkspaceInfo = {
  isMonorepo: boolean;
  isRootPackage: boolean;
  absoluteRootDir: string;
  relativeRootDir: string;
  absolutePackageDir: string;
  relativePackageDir: string;
};

// TODO: Rename "package" terminology to "workspace".

function* generateParentPackageDirs(initialDir: string) {
  let prevDir: string;
  let thisDir = initialDir;
  while (thisDir !== prevDir) {
    if (fs.existsSync(path.join(thisDir, 'package.json'))) {
      yield thisDir;
    }
    prevDir = thisDir;
    thisDir = path.normalize(path.join(thisDir, '..'));
  }
}

const parseWorkspaces = (
  workspaces: PackageJson['workspaces'],
): undefined | Array<string> =>
  [].concat(workspaces || []).map((w) => path.join(w, 'package.json'));

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
    return !!(await this.getWorkspaces());
  }

  @Memoize()
  public async getNearestPackage() {
    return generateParentPackageDirs(this.cwd).next().value;
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
  public async getWorkspacesDirs(): Promise<undefined | Array<string>> {
    const workspaceDirs = [];
    for await (const dir of await this.getWorkspaceDirsIterator()) {
      workspaceDirs.push(dir);
    }
    return workspaceDirs;
  }

  /**
   * Get the "workspaces" property of the root package.json.
   */
  @Memoize()
  private async getWorkspaces(): Promise<PackageJson['workspaces']> {
    return WorkspacesNavigator.readWorkspaces(await this.getRootDir());
  }

  /**
   * Get the path to a workspace by package.json name.
   */
  @Memoize()
  public async getWorkspaceDir(
    workspaceName: string,
  ): Promise<undefined | string> {
    if (workspaceName === 'root') {
      return this.getRootDir();
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
          this.getWorkspaces(),
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
  private static async readWorkspaces(
    absolutePackagePath: string,
  ): Promise<undefined | PackageJson['workspaces'] | Array<string>> {
    const [packageJson, workspaceYaml] = await Promise.all([
      WorkspacesNavigator.readPackageJson(absolutePackagePath),
      WorkspacesNavigator.readWorkspaceYaml(absolutePackagePath),
    ]);
    return workspaceYaml?.packages ?? packageJson?.workspaces ?? undefined;
  }

  @Memoize()
  private static readPackageJson(absolutePackagePath: string) {
    return readJson<PackageJson>(
      path.join(absolutePackagePath, 'package.json'),
    );
  }

  @Memoize()
  private static readWorkspaceYaml(absolutePackagePath: string) {
    return readYaml<{ packages: Array<string> }>(
      path.join(absolutePackagePath, 'pnpm-workspace.yaml'),
    );
  }
}