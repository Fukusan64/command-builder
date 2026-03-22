import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const escapeQuotation = (arg: string) => arg.replace(/'/g, "\\'");

type CommandBuilder = {
  // 実行（引数なしで呼ぶ）
  (): Promise<string>;
  // 引数追加
  (...args: string[]): CommandBuilder;
  (args: string[]): CommandBuilder;
  // `proxy.get()` で `shell.ls` みたいに任意のプロパティをコマンドとして扱う
  [command: string]: CommandBuilder;
};

export const createShell = (
  shell: string | ((commands: string) => Promise<string>) = 'sh',
) => {
  let executor: (commands: string) => Promise<string>;

  if (typeof shell === 'string') {
    executor = async (command: string) => {
      const result = await execAsync(command, { shell });
      if (result.stderr) {
        throw new Error(result.stderr);
      }
      return result.stdout.trim();
    };
  } else {
    executor = shell;
  }

  const f = (commands: string[] = []): CommandBuilder =>
    new Proxy(() => commands, {
      apply(target, _thisArg, argumentsList) {
        if (argumentsList.length === 0) {
          const commands = target();
          let chainedCommands = commands[0];
          for (let i = 1; i < commands.length; i++) {
            const isBeforeRedirect =
              commands[i - 1].includes('>') || commands[i - 1].includes('<');
            const isRedirect =
              commands[i].includes('>') || commands[i].includes('<');
            if (isBeforeRedirect || isRedirect) {
              chainedCommands += ` ${commands[i]}`;
            } else {
              chainedCommands += ` | ${commands[i]}`;
            }
          }
          return executor(chainedCommands);
        } else {
          const commands = [...target()];
          let args: string[];
          if (Array.isArray(argumentsList[0])) {
            args = argumentsList[0];
          } else {
            args = argumentsList;
          }
          commands[commands.length - 1] +=
            ` ${args.map((arg) => `'${escapeQuotation(arg)}'`).join(' ')}`;
          return f(commands);
        }
      },

      get(target, prop) {
        if (typeof prop === 'symbol') throw new Error('Symbol is not allowed');
        const commands = [...target(), prop];
        return f(commands);
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
  return str.split(' ');
}
