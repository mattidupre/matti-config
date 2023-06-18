import { DEFAULT_CONFIG_COMMENT } from '../entities';
import path from 'node:path';
import { isFunction } from 'lodash';
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

  public queueJsObject(
    filePath: string,
    fileContent: FileContentArg<JsonValue>,
    fileOptions: QueueFileOptions = {},
  ) {
    this.checkExtension(JS_EXTENSIONS, filePath);
    return this.queueFile(
      filePath,
      fileContent,
      fileOptions,
      (content) => `module.exports = ${JSON.stringify(content, null, 2)};`,
    );
  }

  public queueJsConfig(
    filePath: string,
    fileContent: FileContentArg<string>,
    fileOptions: QueueFileOptions & {
      basePath?: string;
      exportObject?: boolean;
    } = {},
  ) {
    const { basePath = path.dirname(filePath), exportObject = false } =
      fileOptions;
    this.checkExtension(JS_EXTENSIONS, filePath);
    const packageInfoPath = pathDotPrefix(
      path.join(
        path.relative(path.dirname(filePath), basePath),
        // Assume that the extension (i.e., JS, CJS, MJS) will be the same.
        `package-info${path.extname(filePath)}`,
      ),
    );
    return this.queueFile(filePath, fileContent, fileOptions, (configName) => [
      `const { ${configName} } = require('matti-config');`,
      `const packageInfo = require('${packageInfoPath}');`,
      `module.exports = ${
        exportObject ? '' : '() => '
      }${configName}(packageInfo);`,
    ]);
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

    const buildFileContent = isFunction(fileContentArg)
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

  private checkExtension(extension: string | Array<string>, filePath: string) {
    const extensions = [].concat(extension);
    if (extensions.every((ext) => !filePath.endsWith(ext))) {
      throw new Error(`File path must end with "${extensions.join(' or ')}".`);
    }
  }
}
