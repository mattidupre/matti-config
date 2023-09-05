#!/usr/bin/env node

import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import { readCliArgs } from './lib/readCliArgs.js';
import { Program } from './lib/Program.js';
import { getPort } from './lib/getPort.js';
import { CONFIG_APP_NAME } from './entities.js';
import { Logger } from './lib/Logger.js';

const IS_FORKED_ENV_KEY = `${CONFIG_APP_NAME.toUpperCase()}__IS_FORKED`;
const IS_FORKED = process.env[IS_FORKED_ENV_KEY] === 'TRUE';
const IS_DEV = process.argv.includes('--dev') || process.argv.includes('dev');

// Make sure CLI isn't executed from within this repo.
if (process.cwd().startsWith(fileURLToPath(import.meta.url))) {
  throw new Error(`Do not execute ${CONFIG_APP_NAME} inside itself.`);
}

const createInspectFlags = async () => {
  const inspectPort = await getPort('root');
  Logger.log('debug', `Node Debugger listening on port ${inspectPort}.`);
  return [
    '--inspect',
    '--inspect-publish-uid=http',
    `--inspect-port=${inspectPort}`,
  ];
};

(async () => {
  if (!IS_FORKED) {
    // Re-run Node with the appropriate flags.
    const [, jsPath, ...args] = process.argv;

    const env = {
      ...process.env,
      [IS_FORKED_ENV_KEY]: 'TRUE',
    };

    const execArgv = [
      process.execArgv,
      '--enable-source-maps',
      IS_DEV ? await createInspectFlags() : [],
    ].flat();

    fork(jsPath, args, {
      env,
      execArgv,
    }).once('close', process.exit);
  } else {
    await Program.import(readCliArgs());
  }
})();
