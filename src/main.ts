import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

type CommandBuilder = {
  // 実行（引数なしで呼ぶ）
  (): Promise<string>;
  // 引数追加（1引数で呼ぶ）
  (argument: string): CommandBuilder;
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

  const f = (commands: string[] = []): CommandBuilder => {
    return new Proxy(() => commands, {
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
          commands[commands.length - 1] += ` '${argumentsList[0]}'`;
          return f(commands);
        }
      },

      get(target, prop) {
        if (typeof prop === 'symbol') throw new Error('Symbol is not allowed');
        const commands = [...target(), prop];
        return f(commands);
      },
    }) as unknown as CommandBuilder;
  };

  return f();
};
