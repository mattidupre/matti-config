import path from 'node:path';
import { defaultsDeep } from 'lodash';
import { SOURCE_DIRNAME, type PackageInfo } from '../entities';

const configureTarget = (
  packageInfo: PackageInfo,
  name: string,
  command: string,
  targetOptions: Record<string, unknown> = {},
) => {
  const { packageDir } = packageInfo;
  return {
    [name]: defaultsDeep(
      {
        executor: 'nx:run-commands',
        options: {
          cwd: packageDir,
          command,
        },
      },
      targetOptions,
    ),
  };
};

export default (packageInfo: PackageInfo) => {
  const { packageType, rootDir, packageDir } = packageInfo;

  const defaultTarget = {
    executor: 'nx:run-commands',
    options: {
      cwd: packageDir,
    },
  } as const;

  return {
    root: path.relative(rootDir, packageDir),
    sourceRoot: path.join(SOURCE_DIRNAME, path.relative(rootDir, packageDir)),
    projectType: packageType === 'app' ? 'application' : packageType,
    targets: {
      dev: defaultsDeep({}, defaultTarget, {
        options: {
          command: 'npx matti-config build --dev',
          parallel: true,
        },
      }),
      build: defaultsDeep({}, defaultTarget, {
        options: {
          command: 'npx matti-config build',
          parallel: true,
        },
        dependsOn: ['^build'],
      }),
      debug: defaultsDeep({}, defaultTarget, {
        options: {
          command: 'npx matti-config debug',
        },
      }),
    },
  };
};
