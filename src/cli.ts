#!/usr/bin/env node

import { readCliArgs } from './lib/readCliArgs.js';
import { Program } from './lib/Program.js';

(async () => Program.import(readCliArgs()))();
