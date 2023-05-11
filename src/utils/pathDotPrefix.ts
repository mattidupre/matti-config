import path from 'node:path';

export const pathDotPrefix = (originalPath: string) =>
  originalPath.slice(0, 3) === '../'
    ? originalPath
    : `.${path.sep}${originalPath}`;
