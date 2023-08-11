import path from 'node:path';
import _ from 'lodash';
import { SOURCE_DIRNAME, type PackageInfo } from '../entities';

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
      watch: _.defaultsDeep({}, defaultTarget, {
        options: {
          command: 'npx matti-config build --watch',
          parallel: true,
        },
      }),
      build: _.defaultsDeep({}, defaultTarget, {
        options: {
          command: 'npx matti-config build',
          parallel: true,
        },
        dependsOn: ['^build'],
      }),
      debug: _.defaultsDeep({}, defaultTarget, {
        options: {
          command: 'npx matti-config debug',
        },
      }),
    },
  };
};
