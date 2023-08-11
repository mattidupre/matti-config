import { dirname } from 'path';
import { fileURLToPath } from 'url';
import path from 'node:path';
import alias from '@rollup/plugin-alias';
import typescript from '@rollup/plugin-typescript';
import fg from 'fast-glob';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const modulesDir = path.join(
  dirname(fileURLToPath(import.meta.url)),
  'node_modules',
);
const sourceDir = './src';
const distDir = './dist';

const config = {
  external: [/node_modules/],
  input: Object.fromEntries(
    fg
      .sync(['*.ts', './configs/*.ts', './programs/*.ts'], {
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
    // {
    //   sourcemap: true,
    //   dir: distDir,
    //   format: 'commonjs',
    //   entryFileNames: '[name].cjs',
    //   preserveModules: true,
    // },
    {
      sourcemap: true,
      dir: distDir,
      format: 'module',
      entryFileNames: '[name].js',
      preserveModules: true,
    },
  ],
  plugins: [
    alias({
      entries: [
        {
          find: 'tslib',
          replacement: path.join(modulesDir, 'tslib/tslib.es6.mjs'),
        },
      ],
    }),
    typescript(),
    nodeResolve(),
    commonjs(),
  ],
};

export default config;
