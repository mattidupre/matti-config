#!/usr/bin/env node

import rimraf from 'rimraf';
import path from 'node:path';
import fs from 'node:fs';
import { getRootInfo } from '../lib/getRootInfo';
import { withPackagePaths } from '../lib/withPackagePaths';
import { buildPackageConfig } from '../lib/buildPackageConfig';
import { bundleTypeScript, bundleTypeScriptEntry } from '../typeScript';
import { bundleESLint, bundleESLintEntry } from '../esLint/bundleESLint';
import { bundleVite } from '../vite/bundleVite';
import { bundleVitest } from '../vitest/bundleVitest';
import { bundleStorybook } from '../storybook/bundleStorybook';
import { buildPackageInfo } from '../lib/buildPackageInfo';

import type { PackageConfigParsed, BundledCode } from '../types';

export default async () => {
  const { rootDir, workspaces } = await getRootInfo();

  // Gather all package configurations.
  const allPackages: Array<PackageConfigParsed> = [];
  await withPackagePaths(rootDir, workspaces, async ({ packageDir }) => {
    const packageInfo = buildPackageInfo({ rootDir, packageDir });

    if (!fs.existsSync(packageInfo.packageConfigPath)) {
      return null;
    }

    allPackages.push(
      buildPackageConfig(
        packageInfo,
        JSON.parse(
          await fs.promises.readFile(packageInfo.packageConfigPath, 'utf8'),
        ),
      ),
    );
  });

  const allBundles: Array<BundledCode> = [];
  const allTSConfigPaths: Array<string> = [];

  // Build TypeScript bundles first.
  allBundles.push(
    ...allPackages
      .map((packageConfig) => {
        const typeScriptBundles = bundleTypeScript(packageConfig);
        allTSConfigPaths.push(
          ...typeScriptBundles.map(({ path: bundlePath }) => bundlePath),
        );
        return typeScriptBundles;
      })
      .flat(),
  );

  // Build all other bundles.
  allBundles.push(
    ...(await Promise.all(
      [
        ...allPackages.map((packageConfig) =>
          [
            ...bundleESLint(packageConfig, allTSConfigPaths),
            ...bundleTypeScript(packageConfig),
            ...bundleStorybook(packageConfig),
            bundleVite(packageConfig),
            bundleVitest(packageConfig),
          ].flat(),
        ),
        ...bundleESLintEntry(allPackages),
        ...bundleTypeScriptEntry(allPackages),
      ].flat(),
    )),
  );

  // Prepare package folder.
  await Promise.all(
    allPackages.map(async ({ packageInfo: { packageConfigDir } }) => {
      if (fs.existsSync(packageConfigDir)) {
        await new Promise((resolve, reject) => {
          rimraf(path.join(packageConfigDir, '*'), (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(undefined);
          });
        });
      } else {
        await fs.promises.mkdir(packageConfigDir, {
          recursive: true,
        });
      }
    }),
  );

  // Write all bundles to file. Deferred to end to prevent partial bundling on error.
  await Promise.all(
    allBundles.map(async ({ path: bundlePath, code }) => {
      const bundleDir = path.dirname(bundlePath);
      if (!fs.existsSync(bundleDir)) {
        await fs.promises.mkdir(bundleDir, {
          recursive: true,
        });
      }
      await fs.promises.writeFile(bundlePath, code);
    }),
  );

  // TODO: overwrite entries in package.json
};
