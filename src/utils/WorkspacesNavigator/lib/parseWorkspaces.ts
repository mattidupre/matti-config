import path from 'node:path';
import { type PackageJson } from 'type-fest';

export const parseWorkspaces = (
  workspaces: PackageJson['workspaces'],
): undefined | Array<string> =>
  [].concat(workspaces || []).map((w) => path.join(w, 'package.json'));
