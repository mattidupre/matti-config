#!/usr/bin/env node

import type { ProgramType } from './entities';
import { Program } from './lib/Program';
import { pick } from 'lodash';
import yargs from 'yargs';
import type { ProgramInfo } from './entities';
import { PROGRAMS, PROGRAMS_OPTIONS } from './entities';

const getProgramInfo = (): ProgramInfo => {
  let result = yargs(process.argv.slice(2))
    .strict()
    .usage('Usage: $0 <command> [options]');

  Object.entries(PROGRAMS).forEach(
    ([key, { description, acceptedOptions }]) => {
      result = result.command(
        key,
        description,
        pick(PROGRAMS_OPTIONS, acceptedOptions),
      );
    },
  );

  const {
    _: [program],
    dev: isDevMode,
    root: isExecuteRoot,
    all: isExecuteAll,
    hard: isHard,
  } = result.argv as unknown as {
    _: [ProgramType];
    dev: boolean;
    all: boolean;
    root: boolean;
    hard: boolean;
  };

  return {
    program,
    isDevMode,
    isExecuteRoot,
    isExecuteAll,
    isHard,
  };
};

(async () => Program.import(getProgramInfo()))();
