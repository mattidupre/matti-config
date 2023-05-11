import type { CLIArgs } from '../types';

export const buildArgs = (): CLIArgs => {
  const program = process.argv[2] as CLIArgs['program'];
  const watch = process.argv.includes('--watch');

  return { program, watch: !!watch };
};
