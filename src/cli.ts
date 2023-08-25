#!/usr/bin/env node

import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import { readCliArgs } from './lib/readCliArgs.js';
import { Program } from './lib/Program.js';
import { CONFIG_APP_NAME, CONFIG_CLI_FLAGS } from './entities.js';

// Make sure CLI isn't executed within its own folder.
if (process.cwd().startsWith(fileURLToPath(import.meta.url))) {
  throw new Error(`Do not execute ${CONFIG_APP_NAME} inside itself.`);
}

if (!CONFIG_CLI_FLAGS.every((flag) => process.execArgv.includes(flag))) {
  // Re-run Node with the appropriate flags.
  const [, jsPath, ...args] = process.argv;
  fork(jsPath, args, {
    execArgv: [...CONFIG_CLI_FLAGS, ...process.execArgv],
  }).once('close', process.exit);
} else {
  // Import the respective program and call it.
  (async () => Program.import(readCliArgs()))();
}
