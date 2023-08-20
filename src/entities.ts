import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PackageJson } from 'type-fest';

import { z } from 'zod';

export const CONFIG_APP_NAME = 'matti-config';

export const CONFIG_APP_ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

export const CONFIG_APP_SRC_DIR = path.join(CONFIG_APP_ROOT_DIR, 'src');

export const CONFIG_APP_DIST_DIR = path.join(CONFIG_APP_ROOT_DIR, 'dist');

export const CONFIG_APP_CONFIGS_DIR = path.join(CONFIG_APP_DIST_DIR, 'configs');

export const CONFIG_APP_CONFIGS_EXTNAME = '.mjs';

export const DEFAULT_CONFIG_COMMENT = [
  `This file is automatically generated by ${CONFIG_APP_NAME}.`,
  "Do not change it's content.",
];

export const RESOLVE_ALIASES: ReadonlyArray<[string, string]> = [
  ['~/assets/*', './public/assets/*'],
  ['~/*', './src/*'],
];

export const SOURCE_DIRNAME = 'src';

export const DIST_DIRNAME = 'dist';

export const STORYBOOK_DIRNAME = 'dist/storybook';

export const CONFIG_CACHE_DIRNAME = '.kit';

export const CONFIG_FILENAME = 'kit.config.json';

export const PROGRAMS_OPTIONS = {
  watch: {
    description: 'Dev (watch) mode',
    type: 'boolean',
    alias: 'dev',
    default: false,
  },
  watchProduction: {
    description: 'Production (watch) mode',
    type: 'boolean',
    default: false,
  },
  root: {
    description: 'Execute for root only',
    type: 'boolean',
    default: false,
  },
  all: {
    description: 'Execute for root and packages',
    type: 'boolean',
    default: false,
  },
  hard: {
    description: 'Also remove node_modules',
    type: 'boolean',
    default: false,
  },
} as const;

export const PROGRAMS: Record<
  string,
  {
    description: string;
    scriptPath: string;
    acceptedOptions: ReadonlyArray<Partial<keyof typeof PROGRAMS_OPTIONS>>;
  }
> = {
  configure: {
    description: 'Create top-level config files.',
    scriptPath: path.join(CONFIG_APP_DIST_DIR, 'programs/Configure'),
    acceptedOptions: ['root'],
  },
  link: {
    description: 'Link matching repos from parent folder.',
    scriptPath: path.join(CONFIG_APP_DIST_DIR, 'programs/Link'),
    acceptedOptions: ['root'],
  },
  build: {
    description: 'Build the package.',
    scriptPath: path.join(CONFIG_APP_DIST_DIR, 'programs/Build'),
    acceptedOptions: ['watch', 'watchProduction'],
  },
  storybook: {
    description: 'Build storybook.',
    scriptPath: path.join(CONFIG_APP_DIST_DIR, 'programs/Storybook'),
    acceptedOptions: ['watch'],
  },
  test: {
    description: 'Test the package.',
    scriptPath: path.join(CONFIG_APP_DIST_DIR, 'programs/Test'),
    acceptedOptions: ['watch'],
  },
  lint: {
    description: 'Lint the package.',
    scriptPath: path.join(CONFIG_APP_DIST_DIR, 'programs/Lint'),
    acceptedOptions: ['root'],
  },
  typeCheck: {
    description: 'Check all package types.',
    scriptPath: path.join(CONFIG_APP_DIST_DIR, 'programs/TypeCheck'),
    acceptedOptions: [],
  },
  clean: {
    description: 'Remove config files.',
    scriptPath: path.join(CONFIG_APP_DIST_DIR, 'programs/Clean'),
    acceptedOptions: ['root', 'hard'],
  },
  debug: {
    description: 'Debug.',
    scriptPath: path.join(CONFIG_APP_DIST_DIR, 'programs/Debug'),
    acceptedOptions: ['root', 'watch'],
  },
} as const;

export type ProgramType = keyof typeof PROGRAMS;

export const ENVIRONMENTS = ['test', 'dist', 'stories'] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

export const PACKAGE_TARGETS = [
  'browser',
  'react',
  'node',
  'universal',
] as const;

export type PackageTarget = (typeof PACKAGE_TARGETS)[number];

export const PACKAGE_TYPES = ['app', 'library'] as const;

export type PackageType = (typeof PACKAGE_TYPES)[number];

export const PackageConfigSchema = z
  .object({
    target: z.enum(['browser', 'react', 'node', 'universal']),
    type: z.enum(['app', 'library']),
    storybook: z.boolean().optional(),
  })
  .refine(
    ({ target, storybook }) =>
      !(['node', 'universal'].includes(target) && storybook),
    {
      message: 'Storybook can only be set if target is a frontend.',
    },
  )
  .refine(({ type, storybook }) => !(type !== 'library' && storybook), {
    message: 'Storybook can only be set if package is a library.',
  });

export type PackageConfig = z.infer<typeof PackageConfigSchema>;

export type ProgramInfo = {
  program: ProgramType;
  isWatchMode: boolean;
  isWatchProductionMode: boolean;
  isExecuteRoot: boolean;
  isExecuteAll: boolean;
  isHard: boolean;
  extraArgs: ReadonlyArray<string>;
};

export type RepoInfo = {
  cwd: string;
  rootDir: string;
  configsDir: string;
  configRootDir: string;
  isMonorepo: boolean;
  packageJson: PackageJson;
  rootJsExtension: '.js' | '.cjs' | '.mjs';
};

export type PackageInfo = RepoInfo & {
  name: string;
  packageJson: PackageJson;
  cacheDir: string;
  packageDir: string;
  sourceDir: string;
  distDir: string;
  packageType: PackageType;
  environments: ReadonlyArray<Environment>;
  target: PackageTarget;
  isPackageAtRoot: boolean;
  isPackageFrontend: boolean;
  packageConfig: PackageConfig;
  packageJsExtension: '.js' | '.cjs' | '.mjs';
};

export const createBuildCompleteMessage = (packageName: string) =>
  'BUILD COMPLETE';
// `${CONFIG_APP_NAME} / ${packageName}: BUILD COMPLETE`;
