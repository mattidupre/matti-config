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

const defaultLogger: RunOptions['log'] = (level, message) => {
  if (level === 'error') {
    process.stderr.write(message);
  } else {
    process.stdout.write(message);
  }
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
    {
      args = [],
      cwd,
      log = defaultLogger,
      forceColor,
      skipNpx,
    }: RunOptions = {},
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
        child.stdout.on('data', (data) => log('info', data.toString()));
        child.stderr.on('data', (data) => log('error', data.toString()));
      } catch (err) {
        handleError(err);
      }
    });
  }

  private terminate() {
    terminate(process.pid);
  }
}
