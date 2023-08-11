import 'vitest/globals';

export interface CustomMatchers<R> extends Record<string, any> {
  toHaveBeenCalledAfter(
    mock: import('vitest').MockInstance<any, any[]>,
    failIfNoFirstInvocation?: boolean,
  ): R;

  toHaveBeenCalledBefore(
    mock: import('vitest').MockInstance<any, any[]>,
    failIfNoSecondInvocation?: boolean,
  ): R;

  toHaveBeenCalledExactlyOnceWith(...args: unknown[]): R;
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Assertion<T = any> extends CustomMatchers<T> {}
}
