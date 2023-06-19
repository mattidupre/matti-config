import rimraf from 'rimraf';

export class FileDeleter {
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
