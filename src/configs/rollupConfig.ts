import type { PackageInfo } from '../entities';
import type { RollupOptions } from 'rollup';
import path from 'node:path';
import typescript from '@rollup/plugin-typescript';
import fg from 'fast-glob';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import yaml from '@rollup/plugin-yaml';
import alias from '@rollup/plugin-alias';
import { RESOLVE_ALIASES } from '../entities';

export default (packageInfo: PackageInfo): RollupOptions => {
  const { sourceDir, distDir, cacheDir, packageDir, packageJson } = packageInfo;

  const entries = Object.fromEntries(
    RESOLVE_ALIASES.map(([from, to]) => [
      path.dirname(from),
      path.join(packageDir, path.dirname(to)),
    ]),
  );

  return {
    // external: target === 'node' ? [/node_modules/] : [],
    external: [/node_modules/, ...Object.keys(packageJson.dependencies)],
    input: Object.fromEntries(
      fg
        .sync('*.ts', {
          cwd: sourceDir,
        })
        .map((relativeInputPath) => [
          relativeInputPath.slice(
            0,
            relativeInputPath.length - path.extname(relativeInputPath).length,
          ),
          path.join(sourceDir, relativeInputPath),
        ]),
    ),
    output: [
      {
        dir: distDir,
        format: 'commonjs',
        entryFileNames: '[name].cjs',
        preserveModules: true,
      },
      {
        dir: distDir,
        format: 'module',
        entryFileNames: '[name].mjs',
        preserveModules: true,
      },
    ],
    plugins: [
      alias({ entries }),
      yaml(),
      typescript({
        tsconfig: path.join(cacheDir, 'tsconfig-dist.json'),
      }),
      nodeResolve(),
      commonjs(),
    ],
  };
};
