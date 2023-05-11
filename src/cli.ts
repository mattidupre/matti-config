#!/usr/bin/env node

import type { CLIArgs } from './types';
import { buildArgs } from './lib/buildArgs';
import path from 'node:path';

const validPrograms: Array<CLIArgs['program']> = [
  'configure',
  'build',
  'test',
  'storybook',
];

(async () => {
  const { program } = buildArgs();
  if (!validPrograms.includes(program)) {
    throw new Error(`Invalid program "${program}".`);
  }

  const scriptPath = path.join(__dirname, 'scripts', `${program}`);

  const { default: script } = await import(scriptPath);
  await script();
})();
