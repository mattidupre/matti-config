export type Environment = 'test' | 'dist' | 'stories' | 'config';

export type PackageTarget = 'browser' | 'react' | 'node' | 'universal';

export type PackageType = 'app' | 'library';

export type PackageConfig = {
  target: PackageTarget;
  type: PackageType;
};

export type PackageInfo = {
  rootDir: string;
  sourceDir: string;
  packageDir: string;
  configDir: string;
  configName: string;
  packageConfigDir: string;
  packageConfigPath: string;
  packageConfigPathBundled: string;
};

export type PackageConfigParsed = {
  packageConfig: PackageConfig;
  packageInfo: PackageInfo;
  environments: Array<Environment>;
};

export type ConfigType =
  | 'configureESLint'
  | 'configureTypeScript'
  | 'configureVite'
  | 'configureVitest'
  | 'configureStorybook';

export type BundledCode = {
  type: ConfigType;
  isIndex: boolean;
  path: string;
  code: string;
};

export type CLIArgs = {
  program: 'configure' | 'build' | 'test' | 'storybook';
  watch: boolean;
};

export type KitConfig = PackageConfig;

export type PackageJson = { name: string; workspaces?: string | string[] };

export type TSConfig = {
  compilerOptions?: Record<string, unknown>;
  include?: Array<string>;
  exclude?: Array<string>;
};

export type ESLintConfig = Record<string, unknown>;

export { UserConfig as ViteConfig } from 'vite';

export { UserConfig as VitestConfig } from 'vitest';

export type { StorybookViteConfig as StorybookConfig } from '@storybook/builder-vite';
