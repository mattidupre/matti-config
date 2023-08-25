import { Program } from '../lib/Program.js';

export default class Dev extends Program {
  public async run() {
    await Program.import({
      ...this.programInfo,
      program: 'Clean',
      isWatchMode: false,
    });

    await Program.import({
      ...this.programInfo,
      program: 'Configure',
      isWatchMode: false,
    });

    await Program.import({
      ...this.programInfo,
      program: 'Build',
      isWatchMode: true,
    });
  }
}
