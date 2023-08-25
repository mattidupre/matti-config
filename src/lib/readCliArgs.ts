import _ from 'lodash';
import yargs from 'yargs';
import { type ProgramInfo, PROGRAMS, PROGRAMS_OPTIONS } from '../entities.js';

export const readCliArgs = (): ProgramInfo => {
  let breakIndex = process.argv.indexOf('--');
  if (breakIndex === -1) {
    breakIndex = Infinity;
  }

  const args = process.argv.slice(2, breakIndex);
  const extraArgs = process.argv.slice(breakIndex + 1);

  let result = yargs(args)
    // .strict()
    .usage('Usage: $0 <command> [options]');

  Object.entries(PROGRAMS).forEach(
    ([key, { description, acceptedOptions }]) => {
      result = result.command(
        key,
        description,
        _.pick(PROGRAMS_OPTIONS, acceptedOptions),
      );
    },
  );

  const programArg: string = (result.argv as any)._[0] ?? '';

  const program = Object.keys(PROGRAMS).find(
    (p) => p.toLowerCase() === programArg.toLowerCase(),
  );

  if (!program) {
    throw new Error(`Program "${programArg}" not found.`);
  }

  const {
    watch: isWatchMode,
    watchProduction: isWatchProductionMode,
    root: isExecuteRoot,
    all: isExecuteAll,
    hard: isHard,
  } = result.argv as Partial<Record<keyof typeof PROGRAMS_OPTIONS, boolean>> &
    Record<string, any>;

  return {
    program,
    isWatchMode,
    isWatchProductionMode: isWatchProductionMode ?? isWatchMode,
    isExecuteRoot,
    isExecuteAll,
    isHard,
    extraArgs,
  };
};
