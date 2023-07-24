import fg from 'fast-glob';
import path from 'node:path';
import type { PackageInfo } from '../entities';
import type { PackageJson } from 'type-fest';
import { DIST_DIRNAME } from '../entities';

export default async (packageInfo: PackageInfo): Promise<PackageJson> => {
  const { sourceDir, packageJson, packageType, target } = packageInfo;
  const {
    name,
    version,
    bin,
    main,
    scripts,
    exports: _,
    typesVersions: __,
    ...packageJsonRest
  } = packageJson;

  const entryNames = (
    await fg(['*.ts'], {
      cwd: sourceDir,
    })
  ).map((entryName) => entryName.replace(/\.[^/.]+$/, ''));

  const isFrontendLibrary =
    packageType === 'library' && (target === 'browser' || target === 'react');

  // Allows moduleResultion=node to still grab types.
  const typesVersions: PackageJson['typesVersions'] = {
    '*': Object.fromEntries(
      entryNames.map((entryName) => [
        entryName === 'index' ? '.' : `${entryName}`,
        [`./${path.join(DIST_DIRNAME, entryName)}.d.ts`],
      ]),
    ),
  };

  const exports: PackageJson['exports'] = {
    ...Object.fromEntries(
      entryNames.map((entryName) => [
        entryName === 'index' ? '.' : `./${entryName}`,
        {
          types: `./${path.join(DIST_DIRNAME, entryName)}.d.ts`,
          import: `./${path.join(DIST_DIRNAME, entryName)}.mjs`,
          require: `./${path.join(DIST_DIRNAME, entryName)}.cjs`,
        },
      ]),
    ),
    ...(isFrontendLibrary
      ? {
          './assets/*': './dist/assets/*',
          './style.css': './dist/style.css',
        }
      : {}),
  };

  return {
    name,
    version,
    bin,
    main,
    types: './dist/index.d.ts',
    exports,
    typesVersions,
    scripts,
    ...packageJsonRest,
  };
};
