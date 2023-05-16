#!/usr/bin/env node

import configure from './configure';
import { buildArgs } from '../lib/buildArgs';
import path from 'node:path';
import { buildPackageInfo } from '../lib/buildPackageInfo';
import { getRootInfo } from '../lib/getRootInfo';
import {
  build as viteBuild,
  createServer as createViteServer,
  defineConfig as defineViteConfig,
} from 'vite';

// TODO: Also build storybook.

export default async () => {
  await configure();
  const { rootDir } = await getRootInfo();
  const packageDir = process.cwd();
  const { packageConfigDir } = buildPackageInfo({ rootDir, packageDir });
  const viteConfigPath = path.join(packageConfigDir, 'vite.config.cjs');

  const { watch } = buildArgs();

  const config = await import(viteConfigPath).then(({ default: buildConfig }) =>
    buildConfig().then((viteConfig) =>
      defineViteConfig({
        ...viteConfig,
        build: {
          ...viteConfig.build,
          watch,
        },
      }),
    ),
  );

  if (!config?.build?.lib && watch) {
    const server = await createViteServer({
      configFile: viteConfigPath,
    });
    await server.listen();
    server.printUrls();
    return;
  } else {
    await viteBuild(config);
  }
};
