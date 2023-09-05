/* eslint-disable @typescript-eslint/no-unused-vars */
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
    this.debugLog('root');
  }

  private async debugPackage() {
    // await new Promise((resolve) => {
    //   setTimeout(resolve, 1000);
    // });
    this.debugLog('package');
  }

  private async debugDependency() {
    // await new Promise((resolve) => {
    //   setTimeout(resolve, 1000);
    // });
    this.debugLog('dependency');
  }

  private async debugLog(str: string) {
    this.log('debug', str);
  }
}
