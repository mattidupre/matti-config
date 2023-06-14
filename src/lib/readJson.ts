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
  const packageJson = JSON.parse(String(fileString));

  return packageJson as TypeT;
};
