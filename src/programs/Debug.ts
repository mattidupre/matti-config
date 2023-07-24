import path from 'node:path';
import type { PackageInfo } from '../entities';
import { Program } from '../lib/Program';

export default class Build extends Program {
  public async run() {
    await this.withInfo({
      withRoot: this.debugRoot,
      withPackage: this.debugPackage,
    });
  }

  private async debugRoot() {
    await this.debugLog('ROOT');
  }

  private async debugPackage(packageInfo: PackageInfo) {
    await this.debugLog(packageInfo.name);
  }

  private async debugLog(str: string) {
    const { rootDir } = await this.getRepoInfo();
    console.log(`DEBUG ${path.relative(rootDir, process.cwd())}:`, str);
  }
}
