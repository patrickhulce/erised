import chalk, {ChalkFunction} from 'chalk';
import debug from 'debug';

export function createLogger(namespace: string): (...args: unknown[]) => void {
  const log = process.env.CI ? console.log : debug(namespace);
  return (...args) => log(...args);
}

export function logWithColor(
  messages: Array<[string, ChalkFunction]>,
  options?: {skipNewline: boolean},
): void {
  process.stdout.write(messages.map(([message, fn]) => fn(message)).join(chalk.reset('')));
  if (!options?.skipNewline) process.stdout.write('\n');
}
