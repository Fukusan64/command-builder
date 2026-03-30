import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const escapeDoubleQuotedArg = (arg: string) => arg.replace(/(["])/g, '\\$1');

const isAbortSignal = (v: unknown): v is AbortSignal =>
  v instanceof AbortSignal;

type ShellExecutor = (
  commands: string,
  signal?: AbortSignal,
) => Promise<string>;

type CommandBuilder = {
  // 実行（引数なしで呼ぶ）
  (): Promise<string>;
  // AbortSignal で実行（中断可能）
  (signal: AbortSignal): Promise<string>;
  // 引数追加
  // grep('hoge')
  // git('diff', '--name-only')
  // npm(w`run build`)
  (...args: string[]): CommandBuilder;
  (args: string[]): CommandBuilder;
  // ls.sort
  // ls['>'].fileName`
  [command: string]: CommandBuilder;
};

export const createShell = (shell: string | ShellExecutor = 'sh') => {
  let executor: ShellExecutor;

  if (typeof shell === 'string') {
    executor = async (command: string, signal?: AbortSignal) => {
      const result = await execAsync(command, { shell, signal });
      if (result.stderr) {
        throw new Error(result.stderr);
      }
      return result.stdout.trim();
    };
  } else {
    executor = shell;
  }

  const run = (chainedCommands: string, signal?: AbortSignal) =>
    executor(chainedCommands, signal);

  const f = (commandList: string[] = []): CommandBuilder =>
    new Proxy(() => commandList, {
      apply(target, _thisArg, argumentsList) {
        const first = argumentsList[0];
        const isFinalAbortCall =
          argumentsList.length === 1 && isAbortSignal(first);

        if (argumentsList.length === 0 || isFinalAbortCall) {
          const segments = target();
          let chainedCommands = segments[0];
          for (let i = 1; i < segments.length; i++) {
            const isBeforeRedirect =
              segments[i - 1].includes('>') || segments[i - 1].includes('<');
            const isRedirect =
              segments[i].includes('>') || segments[i].includes('<');
            if (isBeforeRedirect || isRedirect) {
              chainedCommands += ` ${segments[i]}`;
            } else {
              chainedCommands += ` | ${segments[i]}`;
            }
          }
          const signal = isFinalAbortCall ? (first as AbortSignal) : undefined;
          return run(chainedCommands, signal);
        }

        const next = [...target()];
        let args: string[];
        if (Array.isArray(argumentsList[0])) {
          args = argumentsList[0];
        } else {
          args = argumentsList as string[];
        }
        next[next.length - 1] +=
          ` ${args.map((arg) => `"${escapeDoubleQuotedArg(arg)}"`).join(' ')}`;
        return f(next);
      },

      get(target, prop) {
        if (typeof prop === 'symbol') throw new Error('Symbol is not allowed');
        return f([...target(), prop]);
      },
    }) as unknown as CommandBuilder;

  return f();
};

export function w(str: string): string[];
export function w(
  template: { raw: readonly string[] | ArrayLike<string> },
  ...substitutions: string[]
): string[];
export function w(
  arg1: string | { raw: readonly string[] | ArrayLike<string> },
  ...rest: string[]
): string[] {
  let str: string;
  if (typeof arg1 === 'string') {
    str = arg1;
  } else {
    str = String.raw({ raw: arg1.raw }, ...rest);
  }
  return str.split(/ +/);
}
