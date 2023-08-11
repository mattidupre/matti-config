import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const resolveModule = (modulePath: string) =>
  require.resolve(modulePath);
