import { DEFAULT_CONFIG_COMMENT, CONFIG_APP_NAME } from '../entities';
import path from 'node:path';
import _ from 'lodash';
import fs from 'node:fs/promises';
import { JsonObject, JsonValue } from 'type-fest';
import { pathDotPrefix } from '../utils/pathDotPrefix';

type FileContentArg<T> = T | FileContentCallback<T>;

type FileContentCallback<T> = (filesQueue: FilesQueue) => T;

type FileEntry = [
  string,
  JsonObject,
  FileContentCallback<Array<string>>,
  QueueFileOptions,
];

type FilesQueue = {
  isWriting: boolean;
  files: Array<FileEntry>;
};

type QueueFileOptions = {
  comments?: undefined | boolean | string | Array<string>;
  meta?: JsonObject;
};

const JS_EXTENSIONS = ['.js', '.mjs', '.cjs'];
const JSON_EXTENSIONS = ['.json', '.jsonc'];

const renderObject = (obj: Record<string, any>, indent = 0) =>
  `{\n${Object.keys(obj).reduce(
    (str, [key, value]) =>
      `${str}  ${new Array(indent + 1).join('  ')}${key}: ${
        _.isObject(value)
          ? renderObject(value, indent + 1)
          : typeof value === 'string'
          ? `'${value}'`
          : value
      },\n`,
    '',
  )}}`;

const renderImport = (
  importVarNames: string | Record<string, string>,
  importPath: string,
  isEsm: boolean,
) => {
  const importVarString =
    typeof importVarNames === 'string'
      ? importVarNames
      : `{${Object.keys(importVarNames).reduce((str, [key, value]) => {
          return `${str}  ${key}${isEsm ? ' as ' : ': '}${value},\n`;
        }, '')}}`;
  return isEsm
    ? `import ${importVarString} from '${importPath}';`
    : `const ${importVarString} = require('${importPath}');`;
};

const renderExports = (
  exportStrings: string | Record<string, string>,
  isEsm: boolean,
) => {
  if (typeof exportStrings === 'string') {
    return isEsm
      ? `export default ${exportStrings};`
      : `module.exports = ${exportStrings};`;
  }
  if (isEsm) {
    return Object.keys(exportStrings)
      .reduce(
        (arr, [key, value]) => [...arr, `export const ${key} = ${value};`],
        [],
      )
      .join('\n');
  }
  return `module.exports = ${renderObject(exportStrings)}`;
};

export class FileWriter {
  private filesQueue: FilesQueue;

  // TODO: rmFile

  // TODO: rmDir

  constructor() {
    this.filesQueue = {
      isWriting: false,
      files: [],
    };
  }

  public queueJsCode(
    filePath: string,
    fileContent: FileContentArg<string | Array<string>>,
    fileOptions: QueueFileOptions = {},
  ) {
    this.checkExtension(JS_EXTENSIONS, filePath);
    return this.queueFile(filePath, fileContent, fileOptions);
  }

  public queueJsConfig(
    filePath: string,
    fileContent: FileContentArg<string>,
    fileOptions: QueueFileOptions & {
      basePath?: string;
      esm: boolean;
      exportType?: 'function' | 'object' | 'none';
    },
  ) {
    const {
      basePath = path.dirname(filePath),
      exportType = 'none',
      esm: isEsm = true,
    } = fileOptions;
    this.checkExtension(JS_EXTENSIONS, filePath, isEsm);
    const packageInfoPath = pathDotPrefix(
      path.join(
        path.relative(path.dirname(filePath), basePath),
        // Assume that the extension (i.e., JS, CJS, MJS) will be the same.
        `package-info${path.extname(filePath)}`,
      ),
    );

    return this.queueFile(filePath, fileContent, fileOptions, (configName) => {
      const configImport = renderImport(
        configName,
        `${CONFIG_APP_NAME}/configs/${configName}`,
        isEsm,
      );
      const infoImport = renderImport('packageInfo', packageInfoPath, isEsm);

      switch (exportType) {
        case 'none': {
          return [configImport];
        }
        case 'function': {
          return [
            configImport,
            infoImport,
            renderExports(`() => ${configName}(packageInfo)`, isEsm),
          ];
        }
        case 'object': {
          return [
            configImport,
            infoImport,
            renderExports(`${configName}(packageInfo)`, isEsm),
          ];
        }
        default: {
          throw new Error(`Invalid exportType "${exportType}".`);
        }
      }
    });
  }

  public queueJsObject(
    filePath: string,
    fileContent: FileContentArg<JsonValue>,
    fileOptions: QueueFileOptions & {
      esm: boolean;
    },
  ) {
    this.checkExtension(JS_EXTENSIONS, filePath);
    return this.queueFile(filePath, fileContent, fileOptions, (content) =>
      renderExports(JSON.stringify(content, null, 2), fileOptions.esm),
    );
  }

  public queueJson(
    filePath: string,
    fileContent: FileContentArg<JsonValue>,
    fileOptions: QueueFileOptions = {},
  ) {
    const parsedFileOptions = {
      ...fileOptions,
      // Default remove comments if not jsonc file.
      comments: fileOptions.comments ?? !filePath.endsWith('.json'),
    };
    this.checkExtension(JSON_EXTENSIONS, filePath);
    return this.queueFile(filePath, fileContent, parsedFileOptions, (content) =>
      JSON.stringify(content, null, 2),
    );
  }

  private queueFile<T>(
    filePath: string,
    fileContentArg: FileContentArg<T>,
    fileOptions: QueueFileOptions,
    callback: (fileContent: T) => string | Array<string> = (value) =>
      value as any,
  ) {
    if (this.filesQueue.isWriting) {
      throw new Error('Cannot queue files while writing');
    }

    const parsedFileOptions = {
      ...fileOptions,
      comments: fileOptions.comments ?? true,
    };

    const buildFileContent = _.isFunction(fileContentArg)
      ? (filesQueue) =>
          this.toContentArray(callback(fileContentArg(filesQueue)))
      : () => this.toContentArray(callback(fileContentArg));

    this.filesQueue.files.push([
      filePath,
      parsedFileOptions?.meta ?? {},
      buildFileContent,
      parsedFileOptions,
    ]);
  }

  public async writeFiles() {
    this.filesQueue.isWriting = true;
    await Promise.all(
      this.filesQueue.files.map((fileEntry) =>
        this.writeFile(fileEntry, this.filesQueue),
      ),
    );
    this.filesQueue.files.length = 0;
    this.filesQueue.isWriting = false;
  }

  private async writeFile(
    [filePath, _, buildFileContent, fileOptions]: FileEntry,
    filesQueue: FilesQueue,
  ) {
    const { comments } = fileOptions;
    const fileContent = [
      ...(comments
        ? [
            this.parseComments(DEFAULT_CONFIG_COMMENT, filePath).join('\n'),
            this.parseComments(comments, filePath).join('\n'),
          ]
        : []),
      buildFileContent(filesQueue).join('\n'),
    ]
      .flat()
      .filter((content) => content?.length > 0)
      .join('\n\n');

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${fileContent}\n`);
  }

  private parseComments(
    comments: QueueFileOptions['comments'],
    filePath: string,
  ): Array<string> {
    if (!comments || comments === true) {
      return [];
    }
    const parsedComments = this.toContentArray(comments);
    const extName = path.extname(filePath);
    if ([...JS_EXTENSIONS, ...JSON_EXTENSIONS].includes(extName)) {
      return parsedComments.map((c) => `// ${c}`);
    }
    return [];
  }

  private toContentArray(input: unknown): Array<string> {
    if (!input) {
      return [];
    }
    if (typeof input === 'string') {
      return [input];
    }
    if (Array.isArray(input)) {
      return input;
    }
    throw new Error('Unrecognized input type.');
  }

  private checkExtension(
    extensions: string | Array<string>,
    filePath: string,
    isEsm?: boolean,
  ) {
    const extensionsArr = [].concat(extensions);
    const extension = extensionsArr.find((ext) => filePath.endsWith(ext));
    if (isEsm === true && extension === '.cjs') {
      throw new Error(`Cannot export ESM to .cjs file.`);
    }
    if (isEsm === false && extension === '.mjs') {
      throw new Error(`Cannot export non-ESM to .mjs file.`);
    }
    if (!extension) {
      throw new Error(
        `File path must end with "${extensionsArr.join(' or ')}".`,
      );
    }
    return extension;
  }
}
