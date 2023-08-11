import { Program } from '../lib/Program.js';
import { pathDotPrefix } from '../utils/pathDotPrefix.js';
import path from 'node:path';
import { PackageInfo } from '../entities.js';

export default class TypeCheck extends Program {
  public async run() {
    await this.withInfo({
      withPackage: this.typeCheckPackage,
    });
  }

  public async typeCheckPackage(packageInfo: PackageInfo) {
    const { cacheDir, sourceDir } = packageInfo;

    return this.scriptRunner.run('tsc', {
      args: [
        '--project',
        path.join(cacheDir, 'tsconfig-dist.json'),
        '--noEmit',
      ],
    });
  }
}
