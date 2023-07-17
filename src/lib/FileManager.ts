import rimraf from 'rimraf';
import path from 'node:path';
import * as fs from 'node:fs/promises';
import fg from 'fast-glob';

export class FileManager {
  public async copyFiles(
    relativeInputGlobs: Array<string>,
    { sourceDir, distDir }: { sourceDir: string; distDir: string },
  ) {
    const fullInputPaths = await fg(
      relativeInputGlobs.map((inputPath) => path.join(sourceDir, inputPath)),
    );

    const fullPaths = fullInputPaths.map((inputPath) => [
      inputPath,
      path.join(distDir, path.relative(sourceDir, inputPath)),
    ]);

    return Promise.all(
      fullPaths
        .map(async ([from, to]) => {
          await fs.mkdir(path.dirname(to), { recursive: true });
          await fs.copyFile(from, to);
        })
        .flat(),
    );
  }

  public async rimraf(deletePath: string, options = {}) {
    return new Promise((resolve, reject) => {
      rimraf(deletePath, options, (err) => {
        if (err) {
          return reject(err);
        }
        resolve(undefined);
      });
    });
  }
}
