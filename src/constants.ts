import path from 'node:path';

// TODO: Register all root and package base files here.

export const CONFIG_APP_NAME = 'matti-kit';

export const CONFIG_APP_DIR = path.resolve(path.resolve(__dirname), '../dist');

export const CONFIG_APP_CONFIGS_DIR = path.join(CONFIG_APP_DIR, 'configs');

export const CONFIG_APP_CONFIGS_EXTNAME = '.js';

export const CONFIG_EXTNAME = '.js';

export const DEFAULT_CONFIG_COMMENT = [
  `This file is automatically generated by ${CONFIG_APP_NAME}.`,
  "Do not change it's content.",
];

export const SOURCE_DIRNAME = 'src';

export const DIST_DIRNAME = 'dist';

export const CONFIG_CACHE_DIRNAME = '.kit';

export const CONFIG_FILENAME = 'kit.config.json';

export const ENVIRONMENTS = ['test', 'dist', 'stories', 'config'] as const;

export const PACKAGE_TARGETS = [
  'browser',
  'react',
  'node',
  'universal',
] as const;

export const PACKAGE_TYPES = ['app', 'library'] as const;

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
    scriptPath: path.join(__dirname, 'programs/Configure'),
    acceptedOptions: ['root'],
  },
  build: {
    description: 'Build the package.',
    scriptPath: path.join(__dirname, 'programs/Build'),
    acceptedOptions: ['dev'],
  },
  test: {
    description: 'Test the package.',
    scriptPath: path.join(__dirname, 'programs/Test'),
    acceptedOptions: ['dev'],
  },
  storybook: {
    description: 'Run Storybook.',
    scriptPath: path.join(__dirname, 'programs/Storybook'),
    acceptedOptions: ['dev'],
  },
  clean: {
    description: 'Remove node_modules and configs.',
    scriptPath: path.join(__dirname, 'programs/Clean'),
    acceptedOptions: ['root'],
  },
} as const;

export const PROGRAMS_OPTIONS = {
  dev: {
    description: 'Dev (watch) mode',
    type: 'boolean',
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
} as const;
