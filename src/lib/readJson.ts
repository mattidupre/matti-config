import fs from 'node:fs';
import { jsonc } from 'jsonc';

export const readJson = async <TypeT>(
  absolutePath: string,
): Promise<undefined | TypeT> => {
  if (!fs.existsSync(absolutePath)) {
    return Promise.resolve(undefined);
  }
  const fileString = await fs.promises.readFile(absolutePath);
  const fileData = jsonc.parse(String(fileString));

  return fileData as TypeT;
};
