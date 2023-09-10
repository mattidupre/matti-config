import fg from 'fast-glob';
import path from 'node:path';
import type { PackageInfo, RepoInfo } from '../entities.js';
import type { PackageJson } from 'type-fest';
import { DIST_DIRNAME } from '../entities.js';
import _ from 'lodash';

export const rootConfig = async ({ packageJson }: RepoInfo) => {
  const { type: _ } = packageJson;
  return {
    type: 'module',
    ...packageJson,
  };
};

const PACKAGE_JSON_OMIT = ['exports', 'typesVersions', 'type'] as const;

export const packageConfig = async (
  packageInfo: PackageInfo,
): Promise<PackageJson> => {
  const {
    sourceDir,
    packageJson,
    packageType,
    target,
    configRootDir,
    packageDir,
  } = packageInfo;
  const {
    name,
    version,
    bin,
    main,
    scripts: originalScripts,
    peerDependencies: originalPeerDependencies,
    ...packageJsonRest
    // Note: Omit<PackageJson, ...> returns every value as JsonValue.
  } = _.omit(packageJson, ['exports', 'typesVersions', 'type']) as PackageJson;

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
          import: `./${path.join(DIST_DIRNAME, entryName)}.js`,
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

  const peerDependencies = {
    ...originalPeerDependencies,
    'matti-config': `file:${path.relative(packageDir, configRootDir)}`,
  };

  const scripts = {
    ...originalScripts,
    m: 'npx matti-config',
    dev: 'npx matti-config clean && npx matti-config configure && npx matti-config build --watch',
  };

  return {
    name,
    type: 'module',
    version,
    bin,
    main,
    types: './dist/index.d.ts',
    exports,
    typesVersions,
    peerDependencies,
    scripts,
    ...packageJsonRest,
  };
};
