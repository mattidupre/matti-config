import rimraf from 'rimraf';
import path from 'node:path';
import * as fs from 'node:fs/promises';
import fg from 'fast-glob';
import puppeteer from 'puppeteer';
import chokidar from 'chokidar';

export class FileManager {
  public async globFiles(
    relativeInputGlobs: Array<string>,
    { sourceDir, watch }: { sourceDir: string; watch: boolean },
    callback: (relativeFilePath: string) => void,
  ) {
    if (watch) {
      const watcher = chokidar.watch(relativeInputGlobs, {
        cwd: sourceDir,
        awaitWriteFinish: true,
      });

      watcher.on('add', (filePath) => callback(filePath));
      watcher.on('change', (filePath) => callback(filePath));

      return new Promise((resolve) => {
        watcher.on('close', () => resolve(null));
      });
    }

    const entries = await fg(relativeInputGlobs, {
      cwd: sourceDir,
    });

    await Promise.all(entries.map((filePath) => callback(filePath)));
  }

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
