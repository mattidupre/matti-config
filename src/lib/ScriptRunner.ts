import execSh from 'exec-sh';

type Options = {
  args?: Array<string>;
  cwd?: string;
};

export class ScriptRunner {
  public readonly cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  async run(script: string, { args = [], cwd }: Options = {}) {
    const command = ['npx', script]
      .concat(args.map((arg) => arg.toString()))
      .join(' ');

    try {
      await execSh.promise(command, {
        cwd: cwd ?? this.cwd,
      });
    } catch (err) {
      console.error(err);
      process.exit();
    }
  }
}
