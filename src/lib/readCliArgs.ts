import _ from 'lodash';
import yargs from 'yargs';
import {
  type ProgramInfo,
  PROGRAMS,
  PROGRAMS_OPTIONS,
  ProgramType,
} from '../entities.js';

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

  const {
    _: [program],
    watch: isWatchMode,
    watchProduction: isWatchProductionMode,
    root: isExecuteRoot,
    all: isExecuteAll,
    hard: isHard,
  } = result.argv as unknown as {
    _: [ProgramType, ...any];
  } & Partial<Record<keyof typeof PROGRAMS_OPTIONS, boolean>> &
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
