import fg from 'fast-glob';

type CallbackOptions = {
  rootDir: string;
  packageDir: string;
};

export const withPackagePaths = async <T extends unknown>(
  rootDir: string,
  workspaces: string | Array<string>,
  callback: ({ rootDir, packageDir }: CallbackOptions) => Promise<T>,
): Promise<Array<T>> => {
  const directoriesStream = fg.stream(workspaces, {
    cwd: rootDir,
    absolute: true,
    onlyDirectories: true,
  });

  const packagePromises: Array<Promise<T>> = [];

  directoriesStream.on('data', (packageDir: string) => {
    packagePromises.push(callback({ rootDir, packageDir }));
  });

  await new Promise((resolve) => {
    directoriesStream.on('finish', () => resolve(undefined));
  });

  return Promise.all(packagePromises);
};
