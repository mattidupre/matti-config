import path from 'node:path';
import fs from 'node:fs';

export const readJson = async <TypeT>(
  absolutePath: string,
): Promise<undefined | TypeT> => {
  const packagePath = path.join(absolutePath);
  if (!fs.existsSync(packagePath)) {
    return Promise.resolve(undefined);
  }
  const fileString = await fs.promises.readFile(packagePath);
  const fileData = JSON.parse(String(fileString));

  return fileData as TypeT;
};
