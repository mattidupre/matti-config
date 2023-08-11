import execSh from 'exec-sh';
import terminate from 'terminate';
import { spawn, ChildProcess } from 'node:child_process';
import { Writable } from 'node:stream';

type Options = {
  args?: Array<string>;
  cwd?: string;
  onOutput?: (message: string) => void;
};

export class ScriptRunner {
  public readonly cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;

    process.on('exit', this.terminate);
    process.on('error', this.terminate);
    process.on('SIGINT', this.terminate);
  }

  async run(script: string, { args = [], cwd, onOutput }: Options = {}) {
    const argStrings = args.map((arg) => arg.toString());

    return new Promise<void>(async (resolve, reject) => {
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

      let child: ChildProcess;

      try {
        child = spawn('npx', [script, ...argStrings], {
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
