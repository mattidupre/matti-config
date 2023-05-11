#!/usr/bin/env node

// https://github.com/storybookjs/storybook/blob/v7.0.0-alpha.54/code/lib/cli/src/build.ts
// https://github.com/storybookjs/storybook/tree/v7.0.0-alpha.54/code/lib/core-server/src

import execSh from 'exec-sh';
import configure from './configure';
import path from 'node:path';
import { buildPackageInfo } from '../lib/buildPackageInfo';
import { getRootInfo } from '../lib/getRootInfo';

const PORT = 3000;

export default async () => {
  await configure();
  const { rootDir } = await getRootInfo();
  const packageDir = process.cwd();
  const { packageConfigDir, configDir } = buildPackageInfo({
    rootDir,
    packageDir,
  });
  const storybookConfigPath = path.join(packageConfigDir, '.storybook');

  execSh(
    [
      `yarn run storybook dev`,
      `--config-dir ${storybookConfigPath}`,
      `--port ${PORT}`,
      `--no-open`,
    ].join(' '),
    { cwd: configDir },
  );
};
