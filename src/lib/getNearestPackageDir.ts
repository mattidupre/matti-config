import fs from 'node:fs';
import path from 'node:path';

export const getNearestPackageDir = (startDir: string) => {
  let prevDir;
  let thisDir = startDir;
  while (thisDir !== prevDir) {
    if (fs.existsSync(path.join(thisDir, 'package.json'))) {
      return thisDir;
    }
    prevDir = thisDir;
    thisDir = path.normalize(path.join(thisDir, '..'));
  }
  throw new Error('Not package.json found.');
};
