import path from 'node:path';
import fs from 'node:fs';

export const readJson = async <TypeT>(
  absolutePath: string,
): Promise<undefined | TypeT> => {
  if (!fs.existsSync(absolutePath)) {
    return Promise.resolve(undefined);
  }
  const fileString = await fs.promises.readFile(absolutePath);
  const fileData = JSON.parse(String(fileString));

  return fileData as TypeT;
};
