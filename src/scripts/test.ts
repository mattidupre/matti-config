#!/usr/bin/env node

import execSh from 'exec-sh';
import configure from './configure';
import { buildArgs } from '../lib/buildArgs';
import path from 'node:path';
import { buildPackageInfo } from '../lib/buildPackageInfo';
import { getRootInfo } from '../lib/getRootInfo';

export default async () => {
  await configure();
  const { rootDir } = await getRootInfo();
  const packageDir = process.cwd();

  const { packageConfigDir, configDir } = buildPackageInfo({
    rootDir,
    packageDir,
  });

  const vitestConfigPath = path.join(packageConfigDir, 'vitest.config.cjs');
  const { watch } = buildArgs();

  execSh(
    `yarn run vitest ${
      watch ? 'watch' : 'run'
    } --config ${vitestConfigPath} --dir ${packageDir}`,
    { cwd: configDir },
  );
};
