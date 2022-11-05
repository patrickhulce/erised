import debug from 'debug';

export function createLogger(namespace: string): (...args: unknown[]) => void {
  const log = process.env.CI ? console.log : debug(namespace);
  return (...args) => log(...args);
}
