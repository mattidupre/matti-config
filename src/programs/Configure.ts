import { Program } from '../lib/Program';
import typeScriptConfig from '../configs/typeScriptConfig';
import esLintConfig from '../configs/esLintConfig';
import prettierConfig from '../configs/prettierConfig';
import { pathDotPrefix } from '../utils/pathDotPrefix';
import path from 'node:path';
import { PackageInfo, RepoInfo } from '../entities';

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
      path.join(rootDir, '.eslintrc.js'),
      Configure.esLintEntry(
        rootDir,
        packagesInfoArr.map(({ cacheDir }) =>
          path.join(cacheDir, `.eslintrc-package.js`),
        ),
      ),
    );

    this.fileWriter.queueJsObject(
      path.join(rootDir, '.prettierrc.js'),
      prettierConfig(),
    );
  }

  private async configurePackage(packageInfo: PackageInfo) {
    const { environments, cacheDir, packageDir, packageConfig } = packageInfo;

    this.fileWriter.queueJsObject(
      path.join(cacheDir, 'package-info.js'),
      packageInfo,
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
      path.join(cacheDir, 'tsconfig-package.json'),
      Configure.typeScriptEntry(
        cacheDir,
        environments.map((environment) =>
          path.join(cacheDir, `tsconfig-${environment}.json`),
        ),
      ),
      { comments: true },
    );

    this.fileWriter.queueJsCode(
      path.join(cacheDir, '.eslintrc-package.js'),
      Configure.esLintEntry(
        cacheDir,
        environments.map((environment) =>
          path.join(cacheDir, `.eslintrc-${environment}.js`),
        ),
      ),
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

    environments.forEach((environment) => {
      this.fileWriter.queueJsObject(
        path.join(cacheDir, `.eslintrc-${environment}.js`),
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

          return esLintConfig(packageInfo, environment, tsConfigPaths) as any;
        },
      );
    });

    this.fileWriter.queueJsConfig(
      path.join(cacheDir, 'vite.config.js'),
      'viteConfig',
    );

    this.fileWriter.queueJsConfig(
      path.join(cacheDir, 'vitest.config.js'),
      'vitestConfig',
    );

    if (packageConfig.storybook) {
      this.fileWriter.queueJsConfig(
        path.join(cacheDir, '.storybook', 'main.js'),
        'storybookConfig',
        { basePath: cacheDir, exportObject: true },
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

  private static esLintEntry(baseDir: string, configPaths: Array<string>) {
    return [
      `module.exports = {`,
      `  root: true,`,
      `  ignorePatterns: ['*.js'],`,
      `  overrides: [`,
      ...configPaths.map(
        (configPath) =>
          `    ...require('${pathDotPrefix(
            path.join(path.relative(baseDir, configPath)),
          )}'),`,
      ),
      `  ]`,
      `};`,
    ];
  }
}
