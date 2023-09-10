#!/usr/bin/env node

import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import { readCliArgs } from './lib/readCliArgs.js';
import { Program } from './lib/Program.js';
import { getPort } from './lib/getPort.js';
import { CONFIG_APP_NAME } from './entities.js';
import { Logger } from './lib/Logger.js';

const IS_FORKED_ENV_KEY = `${CONFIG_APP_NAME.toUpperCase()}__IS_FORKED`;
const IS_FORKED = !!process.env[IS_FORKED_ENV_KEY];

const INSPECT_PORT_ENV_KEY = `${CONFIG_APP_NAME.toUpperCase()}__INSPECT_PORT`;
const INSPECT_PORT = Number.parseInt(
  process.env[INSPECT_PORT_ENV_KEY] ?? '-1',
  10,
);

const IS_DEV = process.argv.includes('--dev') || process.argv.includes('dev');

// Make sure CLI isn't executed from within this repo.
if (process.cwd().startsWith(fileURLToPath(import.meta.url))) {
  throw new Error(`Do not execute ${CONFIG_APP_NAME} inside itself.`);
}

const createInspectFlags = (inspectPort: number) => {
  if (inspectPort === -1) {
    return [];
  }
  return [
    '--inspect',
    // `--inspect-brk`,
    '--inspect-publish-uid=http',
    `--inspect-port=${inspectPort}`,
  ];
};

const getInspectUrl = async (inspectPort: number) => {
  // can also use chrome://inspect/#devices
  if (inspectPort >= 0) {
    const [{ devtoolsFrontendUrl }] = await (
      await fetch(`http://127.0.0.1:${inspectPort}/json/list`, {
        method: 'get',
      })
    ).json();
    return devtoolsFrontendUrl;
  }
  return undefined;
};

(async () => {
  if (!IS_FORKED) {
    // Re-run Node with the appropriate flags.
    const [, jsPath, ...args] = process.argv;

    const inspectPort = IS_DEV ? await getPort('root') : -1;

    const env = {
      ...process.env,
      [IS_FORKED_ENV_KEY]: '1',
      [INSPECT_PORT_ENV_KEY]: String(inspectPort),
    };

    const execArgv = [
      process.execArgv,
      '--enable-source-maps',
      ...createInspectFlags(inspectPort),
    ].flat();

    fork(jsPath, args, {
      env,
      execArgv,
    }).once('close', process.exit);
  } else {
    try {
      Logger.log('info', await getInspectUrl(INSPECT_PORT));
    } catch (err) {
      Logger.log('error', err);
    }
    await Program.import(readCliArgs());
  }
})();
