import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const createShell = (shell: string | ((commands: string) => Promise<string>) = 'sh') => {
  let executor: (commands: string) => Promise<string>;

  if (typeof shell === 'string') {
    executor = async (command: string) => {
      const result = await execAsync(command, { shell });
      if (result.stderr) {
        throw new Error(result.stderr);
      }
      return result.stdout;
    }
  } else {
    executor = shell;
  }

  const f = (commands: string[] = []): any => new Proxy(() => commands, {
    apply(target, _thisArg, argumentsList) {
      if (argumentsList.length === 0) {
        const commands = target();
        let chainedCommands = commands[0];
        for (let i = 1; i < commands.length; i++) {
          const isBeforeRedirect = commands[i - 1].includes('>') || commands[i - 1].includes('<');
          const isRedirect = commands[i].includes('>') || commands[i].includes('<');
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
    }
  });

  return f();
}

const $ = createShell('bash');
console.log(await $.echo('console.log("Hello, world!")').node());