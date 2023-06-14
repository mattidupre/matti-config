import {
  ENVIRONMENTS,
  PACKAGE_TARGETS,
  PACKAGE_TYPES,
  PROGRAMS,
} from './constants';

export type Environment = (typeof ENVIRONMENTS)[number];

export type PackageTarget = (typeof PACKAGE_TARGETS)[number];

export type PackageType = (typeof PACKAGE_TYPES)[number];

export type PackageConfigFile = {
  target: PackageTarget;
  type: PackageType;
};

export type RepoInfo = {
  cwd: string;
  rootDir: string;
  configsDir: string;
  configDir: string;
  isMonorepo: boolean;
};

export type PackageInfo = RepoInfo & {
  name: string;
  cacheDir: string;
  packageDir: string;
  sourceDir: string;
  distDir: string;
  packageType: string;
  environments: ReadonlyArray<Environment>;
  target: PackageTarget;
  isPackageAtRoot: boolean;
};

export type ConfigType =
  | 'configureESLint'
  | 'configureTypeScript'
  | 'configureVite'
  | 'configureVitest'
  | 'configureStorybook';

export type ProgramType = keyof typeof PROGRAMS;

export type ProgramInfo = {
  program: ProgramType;
  isDevMode: boolean;
  isExecuteRoot: boolean;
  isExecuteAll: boolean;
};

export type KitConfig = PackageConfigFile;

export type PackageJson = { name: string; workspaces?: string | string[] };
