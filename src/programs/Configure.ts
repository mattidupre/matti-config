import { Program } from '../lib/Program';
import typeScriptConfig from '../configs/typeScriptConfig';
import * as esLintConfig from '../configs/esLintConfig';
import * as vsCodeConfig from '../configs/vsCodeConfig';
import nxConfig from '../configs/nxConfig';
import prettierConfig from '../configs/prettierConfig';
import * as packageJsonConfig from '../configs/packageJsonConfig';
import { pathDotPrefix } from '../utils/pathDotPrefix';
import path from 'node:path';
import _ from 'lodash';
import { PackageInfo, RepoInfo } from '../entities';

// TODO: .gitignore

// TODO: Tell VS Code to use matti-config eslint
// .vscode -> settings.json
// {
//   "eslint.nodePath": require.resolve("eslint")
// }

// TODO: Tell VS Code to use matti-config prettier

export default class Configure extends Program {
  public async run() {
    await this.withInfo({
      withRoot: this.configureRoot,
      withPackage: this.configurePackage,
    });

    await this.fileWriter.writeFiles();
  }

  private async configureRoot(repoInfo: RepoInfo) {
    const { rootDir } = repoInfo;
    const [packagesInfoArr] = await Promise.all([
      this.withIterator(
        () => this.getActivePackageDirsIterator(),
        this.getPackageInfo,
        this,
      ),
    ]);

    this.fileWriter.queueJson(
      path.join(rootDir, 'package.json'),
      await packageJsonConfig.rootConfig(repoInfo),
    );

    const vsCodeConfigPath = path.join(rootDir, '.vscode', 'settings.json');
    this.fileWriter.queueJson(
      vsCodeConfigPath,
      _.defaultsDeep(
        vsCodeConfig.rootConfig(repoInfo),
        (await this.fileReader.readJson(vsCodeConfigPath)) ?? {},
      ),
    );

    this.fileWriter.queueJson(
      path.join(rootDir, 'tsconfig.json'),
      Configure.typeScriptEntry(
        rootDir,
        packagesInfoArr.map(({ cacheDir }) =>
          path.join(cacheDir, `tsconfig-package.json`),
        ),
      ),
      { comments: true },
    );

    this.fileWriter.queueJsCode(
      path.join(rootDir, `.eslintrc.cjs`),
      Configure.esLintEntry(
        rootDir,
        packagesInfoArr.map(({ cacheDir }) =>
          path.join(cacheDir, `.eslintrc-package.cjs`),
        ),
        true,
      ),
    );

    this.fileWriter.queueJson(
      path.join(rootDir, `.prettierrc.json`),
      prettierConfig(),
    );
  }

  private async configurePackage(packageInfo: PackageInfo) {
    const {
      environments: unsortedEnvironments,
      rootDir,
      cacheDir,
      packageDir,
      packageConfig,
      packageJsExtension,
      packageType,
    } = packageInfo;

    this.fileWriter.queueJson(
      path.join(packageDir, 'package.json'),
      await packageJsonConfig.packageConfig(packageInfo),
      { comments: false },
    );

    // Make sure tsconfig-dist runs last so it appears last in tsconfig-package.
    // This is so test and storybook files have a chance to be globbed first,
    // since tsconfig-dist is a catch-all.
    const environments = [
      ...unsortedEnvironments.filter((e) => e !== 'dist'),
      'dist',
    ] as typeof unsortedEnvironments;

    this.fileWriter.queueJsObject(
      path.join(cacheDir, `package-info${packageJsExtension}`),
      packageInfo,
      { esm: true },
    );

    // Add a tsconfig.json file to the package root for Vite.
    // TODO: When vite allows custom paths, get rid of this.
    if (!packageInfo.isPackageAtRoot) {
      this.fileWriter.queueJson(
        path.join(packageDir, 'tsconfig.json'),
        Configure.typeScriptEntry(packageDir, [
          path.join(cacheDir, `tsconfig-package.json`),
        ]),
        { comments: 'Vite does not allow custom tsconfig.json paths.' },
      );
    }

    this.fileWriter.queueJson(
      path.join(packageDir, 'project.json'),
      nxConfig(packageInfo),
      { comments: false },
    );

    this.fileWriter.queueJson(
      path.join(cacheDir, 'tsconfig-package.json'),
      Configure.typeScriptEntry(
        cacheDir,
        environments.map((environment) =>
          path.join(cacheDir, `tsconfig-${environment}.json`),
        ),
      ),
      { comments: true },
    );

    environments.forEach((environment) => {
      this.fileWriter.queueJson(
        path.join(cacheDir, `tsconfig-${environment}.json`),
        typeScriptConfig(packageInfo, environment),
        {
          meta: {
            useWithESLintParserOptions: true,
          },
          comments: true,
        },
      );
    });

    this.fileWriter.queueJsCode(
      path.join(cacheDir, `.eslintrc-package.cjs`),
      Configure.esLintEntry(
        cacheDir,
        environments.map((environment) =>
          path.join(cacheDir, `.eslintrc-${environment}.cjs`),
        ),
      ),
    );

    environments.forEach((environment) => {
      this.fileWriter.queueJsObject(
        path.join(cacheDir, `.eslintrc-${environment}.cjs`),
        (filesQueue) => {
          // Get all tsConfig files to pass to typescript-eslint parserOptions.
          //   see https://github.com/typescript-eslint/typescript-eslint/issues/2094
          // TODO: When typescript-eslint supports tsconfig project references, get rid of this.
          const tsConfigPaths = filesQueue.files
            .filter(
              ([_, { useWithESLintParserOptions }]) =>
                useWithESLintParserOptions,
            )
            .map(([filePath]) => filePath);

          return esLintConfig.packageConfig(
            packageInfo,
            environment,
            tsConfigPaths,
          ) as any;
        },
        { esm: false },
      );
    });

    this.fileWriter.queueJsConfig(
      path.join(cacheDir, `vite.config.mjs`),
      'viteConfig',
      { basePath: cacheDir, exportType: 'function', esm: true },
    );

    this.fileWriter.queueJsConfig(
      path.join(cacheDir, `rollup.config.mjs`),
      'rollupConfig',
      { basePath: cacheDir, exportType: 'function', esm: true },
    );

    this.fileWriter.queueJsConfig(
      path.join(cacheDir, `vitest.config.mjs`),
      'vitestConfig',
      { basePath: cacheDir, exportType: 'function', esm: true },
    );

    this.fileWriter.queueJsConfig(
      path.join(cacheDir, `vitestSetup.mjs`),
      'vitestSetup',
      { basePath: cacheDir, exportType: 'none', esm: true },
    );

    if (packageConfig.storybook) {
      this.fileWriter.queueJsConfig(
        path.join(cacheDir, '.storybook', `main.mjs`),
        'storybookConfig',
        { basePath: cacheDir, exportType: 'object', esm: true },
      );
    }
  }

  private static typeScriptEntry(baseDir: string, configPaths: Array<string>) {
    return {
      files: [],
      references: configPaths.map((configPath) => ({
        path: pathDotPrefix(path.relative(baseDir, configPath)),
      })),
    };
  }

  private static esLintEntry(
    baseDir: string,
    configPaths: Array<string>,
    root: boolean = false,
  ) {
    const childRequires = configPaths.map(
      (configPath) =>
        `...[].concat(require('${pathDotPrefix(
          path.join(path.relative(baseDir, configPath)),
        )}'))`,
    );
    if (root) {
      return [
        `module.exports = {`,
        `  root: true,`,
        `  overrides: [`,
        ...childRequires.map((childRequire) => `    ${childRequire},`),
        `  ],`,
        `};`,
      ];
    }
    return [
      `module.exports = [`,
      ...childRequires.map((childRequire) => `  ${childRequire},`),
      `];`,
    ];
  }
}
