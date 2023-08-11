import path from 'node:path';
import type { RepoInfo } from '../entities.js';

export const rootConfig = ({ configRootDir }: RepoInfo) => ({
  'prettier.prettierPath': path.join(configRootDir, 'node_modules', 'prettier'),
  'prettier.configPath': '.prettierrc.json',
  'eslint.nodePath': path.join(configRootDir, 'node_modules'),
  'eslint.options': {
    resolvePluginsRelativeTo: path.join(configRootDir, 'node_modules'),
    overrideConfigFile: '.eslintrc.cjs',
  },
});
