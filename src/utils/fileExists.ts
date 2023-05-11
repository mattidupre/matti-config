import fs from 'node:fs';

export const fileExists = (filePath: string) =>
  fs.promises
    .stat(filePath)
    .then(() => true)
    .catch((err) => {
      if (err.code === 'ENOENT') {
        return false;
      }
      return err;
    });
