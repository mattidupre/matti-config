import { defineConfig, mergeConfig } from 'vitest/config';
import { type PackageInfo, CONFIG_APP_CONFIGS_EXTNAME } from '../entities';
import path from 'node:path';
import viteConfig from './viteConfig';
import { pathDotPrefix } from '../utils/pathDotPrefix';

export default async (packageInfo: PackageInfo) => {
  const { target, cacheDir, packageJsExtension, packageDir } = packageInfo;

  const vitestSetup = pathDotPrefix(
    path.join(
      path.relative(packageDir, cacheDir),
      `vitestSetup${packageJsExtension}`,
    ),
  );

  const extensions = target === 'react' ? ['ts', 'tsx'] : ['ts'];
  const extensionsString =
    extensions.length === 1 ? extensions[0] : `{${extensions.join(',')}}`;

  console
    .log

    // 'HERE: ',
    // vitestSetup,
    // '\n',
    // process.cwd(),
    // '\n',
    // require.resolve('./vitestSetup'),
    ();

  return mergeConfig(
    await viteConfig(packageInfo),
    defineConfig({
      test: {
        environment: 'happy-dom', // TODO: Set this based on config.
        include: [`./src/**/*.test.${extensionsString}`],
        globals: true,
        setupFiles: [vitestSetup],
        passWithNoTests: true,
      },
    }),
  );
};
