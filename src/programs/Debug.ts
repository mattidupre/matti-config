import path from 'node:path';
import type { PackageInfo } from '../entities.js';
import { Program } from '../lib/Program.js';

export default class Build extends Program {
  public async run() {
    await this.withInfo({
      withRoot: this.debugRoot,
      withPackage: this.debugPackage,
      withDependency: this.debugDependency,
      sequential: true,
    });
  }

  private async debugRoot() {
    // await new Promise((resolve) => {
    //   setTimeout(resolve, 1000);
    // });
    await this.debugLog('ROOT');
  }

  private async debugPackage(packageInfo: PackageInfo) {
    // await new Promise((resolve) => {
    //   setTimeout(resolve, 1000);
    // });
    await this.debugLog(packageInfo.name);
  }

  private async debugDependency(packageInfo: PackageInfo) {
    // await new Promise((resolve) => {
    //   setTimeout(resolve, 1000);
    // });
    await this.debugLog(`>>${packageInfo.name}`);
  }

  private async debugLog(str: string) {
    const { rootDir } = await this.getRepoInfo();
    console.log(`DEBUG ${path.relative(rootDir, process.cwd())}:`, str);
  }
}
