import { Readable } from 'node:stream';

export class StreamMemoizer {
  private createStream: () =>
    | NodeJS.ReadableStream
    | Promise<NodeJS.ReadableStream>;

  private stream: Promise<NodeJS.ReadableStream>;

  private readableStreams: Set<InstanceType<typeof Readable>> = new Set();

  private values: Array<unknown> = [];

  private isStreamClosed = false;

  constructor(createStream: StreamMemoizer['createStream']) {
    this.createStream = createStream;
  }

  async get() {
    this.initStream();

    const readableStream = new Readable({
      objectMode: true,
    });
    // eslint-disable-next-line no-underscore-dangle
    readableStream._read = () => {};

    this.values.forEach((v) => {
      readableStream.push(v);
    });

    if (this.isStreamClosed) {
      readableStream.push(null);
    } else {
      this.readableStreams.add(readableStream);
    }

    return readableStream;
  }

  async initStream() {
    if (!this.stream) {
      this.stream = Promise.resolve(this.createStream());

      const stream = await this.stream;
      stream.on('data', (v) => {
        this.readableStreams.forEach((readableStream) =>
          readableStream.push(v),
        );
        this.values.push(v);
      });

      stream.on('end', () => {
        this.readableStreams.forEach((readableStream) =>
          readableStream.push(null),
        );
      });

      stream.on('close', () => {
        this.isStreamClosed = true;
      });
    }
  }
}
