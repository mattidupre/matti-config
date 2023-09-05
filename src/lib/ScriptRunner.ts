import terminate from 'terminate';
import { spawn } from 'node:child_process';

type ConstructorOptions = {
  cwd: string;
};

type RunOptions = {
  args?: Array<string>;
  cwd?: string;
  log?: (level: 'info' | 'error', message: string) => void;
  forceColor?: boolean;
  skipNpx?: boolean;
};

export class ScriptRunner {
  public cwd: string;

  constructor({ cwd }: ConstructorOptions) {
    this.cwd = cwd;

    process.on('exit', this.terminate);
    process.on('error', this.terminate);
    process.on('SIGINT', this.terminate);
  }

  async run(
    script: string,
    { args = [], cwd, log, forceColor, skipNpx }: RunOptions = {},
  ) {
    const [scriptBase, ...argStrings] = [
      ...(skipNpx ? [script] : ['npx', script]),
      ...(forceColor ? ['--color', 'always'] : []),
      ...args.map((arg) => arg.toString()),
    ];

    return new Promise<void>((resolve, reject) => {
      let isResolved = false;

      const handleError = (err: Error) => {
        if (!isResolved) {
          isResolved = true;
          reject(err);
        } else {
          throw err;
        }
      };

      const handleExit = () => {
        if (!isResolved) {
          isResolved = true;
          resolve();
        }
      };

      try {
        const child = spawn(scriptBase, argStrings, {
          shell: true,
          cwd: cwd ?? this.cwd,
        });

        child.on('error', handleError);
        child.on('exit', handleExit);
        child.stdout.on('data', (data) => {
          if (log) {
            return log('info', data.toString().trim());
          }
          return process.stdout.write(data);
        });
        child.stderr.on('data', (data) => {
          if (log) {
            return log('error', data.toString().trim());
          }
          return process.stderr.write(data);
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
