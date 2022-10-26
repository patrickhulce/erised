export function createLogger(namespace: string): (...args: unknown[]) => void {
  return (...args) => console.log(`[${namespace}]`, ...args);
}
