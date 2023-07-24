import path from 'node:path';
import fs from 'node:fs';
import YAML from 'yaml';

export const readYaml = async <TypeT>(
  absolutePath: string,
): Promise<undefined | TypeT> => {
  const packagePath = path.join(absolutePath);
  if (!fs.existsSync(packagePath)) {
    return Promise.resolve(undefined);
  }
  const fileString = await fs.promises.readFile(packagePath);
  const fileData = YAML.parse(String(fileString));

  return fileData as TypeT;
};
