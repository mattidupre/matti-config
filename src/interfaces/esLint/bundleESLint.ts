import type { PackageConfigParsed, BundledCode } from '../../types';
import { pathDotPrefix } from '../../utils/pathDotPrefix';
import path from 'node:path';
import { configureESLint } from './configureESLint';

const packageEntryFile = '.eslintrc-all.js';

export const bundleESLint = (
  packageConfig: PackageConfigParsed,
  tsConfigPaths: Array<string>,
): Array<BundledCode> => {
  const {
    packageInfo: { rootDir, packageDir, packageConfigDir },
  } = packageConfig;

  const bundles: Array<BundledCode> = packageConfig.environments.map(
    (environment) => ({
      type: 'configureESLint',
      isIndex: false,
      path: `.eslintrc-${environment}.js`,
      code: `module.exports = ${JSON.stringify(
        configureESLint(packageConfig, environment, tsConfigPaths),
        null,
        2,
      )};`,
    }),
  );

  bundles.push({
    type: 'configureESLint',
    isIndex: true,
    path: packageEntryFile,
    code: [
      `const path = require('path');`,
      `const parseConfig = (config) => ({`,
      `  ...config,`,
      // `  files: config.files.map((f) => `,
      // `    './' + path.join('${pathDotPrefix(
      //   path.relative(rootDir, packageDir),
      // )}', f),`,
      // `  ),`,
      `});`,
      `module.exports = [`,
      ...bundles.map(
        ({ path: bundlePath }) => `  parseConfig(require('./${bundlePath}')),`,
      ),
      `];`,
    ]
      .flat()
      .join('\n'),
  });

  return bundles.map(({ path: bundlePath, ...bundle }) => ({
    path: path.join(packageConfig.packageInfo.packageConfigDir, bundlePath),
    ...bundle,
  }));
};

export const bundleESLintEntry = (
  packageConfigs: Array<PackageConfigParsed>,
): Array<BundledCode> => {
  if (!packageConfigs.length) {
    return [];
  }
  const [
    {
      packageInfo: { rootDir },
    },
  ] = packageConfigs;
  return [
    {
      type: 'configureESLint',
      isIndex: true,
      path: path.join(rootDir, '.eslintrc.js'),
      code: [
        `module.exports = {`,
        `  root: true,`,
        `  ignorePatterns: ['*.js'],`,
        `  overrides: [`,
        ...packageConfigs.map((packageConfig) => [
          `    ...require('./${path.join(
            path.relative(
              packageConfig.packageInfo.rootDir,
              packageConfig.packageInfo.packageConfigDir,
            ),
            packageEntryFile,
          )}'),`,
        ]),
        `  ]`,
        `};`,
        // `console.log(JSON.stringify(module.exports, null, 2));`,
      ]
        .flat()
        .join('\n'),
    },
  ];
};
