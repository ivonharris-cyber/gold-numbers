// Minimal Node.js module shims so tests typecheck under the root tsconfig
// (which sets "types": [] and pulls in no @types/node). Only the surface
// the tests actually use is declared — replace with @types/node if the
// project ever adds it as a devDependency.

declare module 'node:test' {
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function describe(name: string, fn: () => void): void;
}

declare module 'node:assert/strict' {
  const assert: {
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    throws(fn: () => unknown, message?: string): void;
    doesNotThrow(fn: () => unknown, message?: string): void;
    ok(value: unknown, message?: string): void;
    match(value: string, pattern: RegExp, message?: string): void;
    notDeepEqual(actual: unknown, expected: unknown, message?: string): void;
  };
  export default assert;
}

declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
}

declare module 'node:url' {
  export function fileURLToPath(url: string): string;
}

declare module 'node:path' {
  export function dirname(p: string): string;
  export function join(...parts: string[]): string;
}

declare const process: { cwd(): string };
