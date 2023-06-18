import { Program } from '../lib/Program';
import { pathDotPrefix } from '../utils/pathDotPrefix';
import path from 'node:path';
import { PackageInfo } from '../entities';

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
