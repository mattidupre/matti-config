import path from 'node:path';
import pm from 'picomatch';
import { pathDotPrefix } from '../utils/pathDotPrefix';
import type { Environment } from '../types';

const globsByEnvironment: Record<Environment, Array<string>> = {
  config: ['./*'],
  dist: ['./src/**/*'],
  test: ['./src/**/*.test.*'],
  stories: ['./src/**/*.stories.*'],
};

const isMatch = (subjectGlob: Array<string>, testGlob: Array<string>) => {
  const removePathDot = (str) => (str.startsWith('./') ? str.slice(2) : str);
  const isMatch = pm(testGlob.map(removePathDot));
  const result = subjectGlob.map(removePathDot).every((g) => isMatch(g));
  return result;
};

type Options = {
  baseDir: string;
  extension?: string;
};

const parseGlob = ({ baseDir, extension }: Options, glob: string) => {
  return pathDotPrefix(
    path.join(
      baseDir,
      extension ? glob.replace(/(?:(?<!\/)\.?\*)?$/, extension) : glob,
    ),
  );
};

// throw new Error(`HERE:

//   FOR TYPESCRIPT ONLY, NOT ESLINT

//   DIST:
//   "include": [
//     "../src/**/*"
//   ],
//   "exclude": [
//     "../src/**/*.test.*",
//     "../src/**/*.stories.*"
//   ]

//   TEST:
//   "include": ["../src/**/*"],
//   "exclude": ["../src/**/*.stories.*"]

//   STORIES:
//   "include": ["../src/**/*"],
//   "exclude": ["../src/**/*.test.*"]
// `);

export const buildGlobsByEnvironment = (
  options: Options,
  environment: Environment,
) => {
  const pg = (g: string) => parseGlob(options, g);
  const result = [
    globsByEnvironment[environment].map(pg),
    Object.values(globsByEnvironment)
      .filter(
        (excludeGlob) =>
          isMatch(excludeGlob, globsByEnvironment[environment]) &&
          !isMatch(globsByEnvironment[environment], excludeGlob),
      )
      .flat()
      .map(pg),
  ] as const;
  // console.log('\n\n', environment.toUpperCase(), options.extension, '\n', JSON.stringify(result))
  return result;
};
