import chalk from 'chalk';

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 } as const;
export type LogLevel = keyof typeof LOG_LEVELS;

const COLORS = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan'] as const;
type ColorValue = (typeof COLORS)[number];

type HeadingArr = [] | [string] | [string, string];

export type LoggerOptions = {
  color?: undefined | ColorValue;
  level?: undefined | LogLevel;
  multiline?: undefined | boolean;
  heading?: undefined | false | string | HeadingArr;
};

export type LogOptions = LogLevel | LoggerOptions;

type ParsedLoggerOptions = Required<
  Omit<LoggerOptions, 'heading'> & {
    heading: HeadingArr;
  }
>;

type FormatTextOptions = Partial<
  {
    color: undefined | ColorValue;
  } & Record<'bold' | 'italic' | 'underline' | 'inverse', undefined | boolean>
>;

const DEFAULT_OPTIONS = {
  color: undefined,
  level: 'debug',
  heading: undefined,
  multiline: false, // TODO: Change to singleline and otherwise always do multiline.
} as const satisfies LoggerOptions;

export class Logger {
  readonly options: ParsedLoggerOptions;

  constructor(options: LoggerOptions) {
    this.options = Logger.extendOptions(DEFAULT_OPTIONS, options);
  }

  public log(options: LogOptions, ...messages: ReadonlyArray<any>) {
    const parsedOptions = Logger.extendOptions(this.options, options);
    if (LOG_LEVELS[parsedOptions.level] > LOG_LEVELS[this.options.level]) {
      return;
    }
    Logger.log(parsedOptions, ...messages);
  }

  public extend(
    options:
      | LoggerOptions
      | { (prevOptions: ParsedLoggerOptions): LoggerOptions },
  ) {
    const newOptions =
      typeof options === 'function' ? options(this.options) : options;
    return new Logger(Logger.extendOptions(this.options, newOptions));
  }

  public static log(options: LogOptions, ...messages: ReadonlyArray<any>) {
    const parsedOptions = Logger.extendOptions(DEFAULT_OPTIONS, options);
    const { level, multiline } = parsedOptions;
    // eslint-disable-next-line no-console
    console[level](
      ...this.buildHeadings(parsedOptions),
      ...(multiline || LOG_LEVELS[level] <= 1 ? ['\n'] : []),
      ...this.buildMessages(parsedOptions, ...messages),
    );
  }

  private static extendOptions(
    prevOptions: ParsedLoggerOptions,
    newOptions: LogLevel | LoggerOptions,
  ) {
    const { color, level, heading, multiline } = (
      typeof newOptions === 'string' ? { level: newOptions } : newOptions
    ) as LoggerOptions;

    const parsedOptions = {
      ...prevOptions,
      color: color || prevOptions.color,
      level: level || prevOptions.level,
      multiline: multiline ?? prevOptions.multiline,
      heading:
        heading === false
          ? undefined
          : heading
          ? ([].concat(heading) as HeadingArr)
          : prevOptions.heading,
    } as const satisfies ParsedLoggerOptions;

    if (
      parsedOptions.color !== undefined &&
      !COLORS.includes(parsedOptions.color)
    ) {
      throw new Error(`Invalid color "${parsedOptions.color}".`);
    }

    if (LOG_LEVELS[parsedOptions.level] === undefined) {
      throw new Error(`Invalid log level "${parsedOptions.level}".`);
    }

    return parsedOptions;
  }

  private static buildHeadings({
    color,
    heading = [],
    level,
    multiline,
  }: ParsedLoggerOptions): Array<string> {
    const baseFormatTextOptions: Partial<FormatTextOptions> =
      level === 'error'
        ? { inverse: true, color: 'red' }
        : level === 'warn'
        ? { inverse: true, color: 'yellow' }
        : {
            color,
          };

    const text = this.formatText(
      {
        ...baseFormatTextOptions,
        suffix: multiline || LOG_LEVELS[level] <= 1 ? '' : ':',
      },
      this.formatText(
        {
          uppercase: true,
          bold: true,
        },
        heading[0],
        level === 'error' ? 'ERROR' : level === 'warn' ? 'WARNING' : undefined,
      ),
      this.formatText(
        {
          italic: true,
        },
        heading[1],
      ),
    );
    return text ? [text] : [];
  }

  private static buildMessages(
    { color, multiline, level }: ParsedLoggerOptions,
    ...messages: ReadonlyArray<any>
  ) {
    let parsedMessages = messages;

    parsedMessages = messages.map((message) => {
      if (typeof message === 'string') {
        return this.formatText({ color }, message);
      }
      return message;
    });

    if (multiline || LOG_LEVELS[level] <= 1) {
      parsedMessages = messages.reduce(
        (arr, message, index) => [
          ...arr,
          ...(index > 0 && index < messages.length - 1 ? ['\n'] : []),
          message,
        ],
        [],
      );
    }

    return parsedMessages;
  }

  private static formatText(
    {
      noPadding,
      suffix,
      uppercase,
      ...formatTextOptions
    }: Partial<FormatTextOptions> & {
      noPadding?: boolean;
      suffix?: string;
      uppercase?: boolean;
    },
    ...strings: ReadonlyArray<undefined | string>
  ) {
    let text = strings
      .filter((str) => str !== undefined && str !== '')
      .map((str) => (uppercase ? str.toUpperCase() : str))
      .join(' ');

    if (!text) {
      return '';
    }

    if (suffix) {
      text += suffix;
    }

    if (formatTextOptions.inverse && !noPadding) {
      text = ' ' + text + ' ';
    }

    text = Object.entries(formatTextOptions).reduce((c, [property, value]) => {
      if (!value) {
        return c;
      }
      if (property === 'color') {
        return c[value as any];
      }
      return c[property];
    }, chalk)(text);

    return text;
  }
}
