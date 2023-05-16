import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { fileExists } from '../../../utils/fileExists';
import { pathDotPrefix } from '../../../utils/pathDotPrefix';

// https://github.com/vitejs/vite/issues/10531

type Options = {
  sourceConfigPath: string;
  tempConfigPath: string;
  enabled: boolean;
};

const createTempConfig = async (
  { tempConfigPath, sourceConfigPath },
  isEnabled: boolean,
) => {
  if (!isEnabled) {
    return;
  }

  const referenceConfigPath = pathDotPrefix(
    path.relative(path.dirname(tempConfigPath), sourceConfigPath),
  );

  await fs.promises.writeFile(
    tempConfigPath,
    [
      '// AUTOMATICALLY GENERATED TEMPORARY FILE',
      '// created by build script',
      '// see https://github.com/vitejs/vite/issues/10531',
      JSON.stringify(
        {
          files: [],
          references: [
            {
              path: referenceConfigPath,
            },
          ],
        },
        null,
        2,
      ),
    ].join('\n'),
  );
};

const deleteTempConfig = async ({ tempConfigPath }, isEnabled: boolean) => {
  if (!isEnabled) {
    return;
  }
  fs.promises.unlink(tempConfigPath);
};

export const shimTSConfig = (options: Options): Plugin => {
  const isEnabled = options.enabled && !fs.existsSync(options.tempConfigPath);
  return {
    name: 'vite-plugin-matti-kit-shim-ts-config',
    config: async () => {
      if (await fileExists(options.tempConfigPath)) {
        await deleteTempConfig(options, isEnabled);
      }
      await createTempConfig(options, isEnabled);
    },
    closeBundle: () => deleteTempConfig(options, isEnabled),
    watchChange: () => createTempConfig(options, isEnabled),
  };
};
