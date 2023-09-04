import fs from 'node:fs';
import path from 'node:path';

export function* generateParentPackageDirs(initialDir: string) {
  let prevDir: string;
  let thisDir = initialDir;
  while (thisDir !== prevDir) {
    if (fs.existsSync(path.join(thisDir, 'package.json'))) {
      yield thisDir;
    }
    prevDir = thisDir;
    thisDir = path.normalize(path.join(thisDir, '..'));
  }
}
