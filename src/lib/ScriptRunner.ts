import terminate from 'terminate';
import { spawn } from 'node:child_process';

type Options = {
  args?: Array<string>;
  cwd?: string;
  onOutput?: (message: string) => void;
  forceColor?: boolean;
  skipNpx?: boolean;
};

export class ScriptRunner {
  public readonly cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;

    process.on('exit', this.terminate);
    process.on('error', this.terminate);
    process.on('SIGINT', this.terminate);
  }

  async run(
    script: string,
    { args = [], cwd, onOutput, forceColor, skipNpx }: Options = {},
  ) {
    const [scriptBase, ...argStrings] = [
      ...(skipNpx ? [script] : ['npx', script]),
      ...(forceColor ? ['--color', 'always'] : []),
      ...args.map((arg) => arg.toString()),
    ];

    return new Promise<void>((resolve, reject) => {
      let isResolved = false;

      const handleError = (err: Error) => {
        console.error(err);
        if (!isResolved) {
          isResolved = true;
          reject(err);
        }
      };

      const handleExit = () => {
        if (!isResolved) {
          isResolved = true;
          resolve();
        }
      };

      const handleOutput = (data: Buffer) => {
        onOutput?.(data.toString());
      };

      try {
        const child = spawn(scriptBase, argStrings, {
          shell: true,
          cwd: cwd ?? this.cwd,
        });

        child.on('error', handleError);
        child.on('exit', handleExit);
        child.stdout.on('data', (data) => {
          process.stdout.write(data);
          handleOutput(data);
        });
        child.stderr.on('data', (data) => {
          process.stderr.write(data);
          handleOutput(data);
        });
      } catch (err) {
        handleError(err);
      }
    });
  }

  private terminate() {
    terminate(process.pid);
  }
}
