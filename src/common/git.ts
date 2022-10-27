import {spawnSync} from 'node:child_process';
import {createLogger} from './utils';

const log = createLogger('erised:common:git');

export function exec(args: string[], options?: {fatal?: boolean}) {
  const {fatal = true} = options ?? {};

  const result = spawnSync('git', args);
  if (fatal && result.status !== 0) {
    const errorOutput = result.stderr.toString().slice(0, 1000);
    const stdOutput = result.stdout.toString().slice(0, 1000);
    throw new Error(`Git command "${args.join(' ')}" failed:\n${errorOutput}\n${stdOutput}`);
  }

  return {
    code: result.status ?? 0,
    stdout: result.stdout.toString().trim(),
    stderr: result.stderr.toString().trim(),
  };
}

export function readMainBranchName() {
  return exec(['rev-parse', '--verify', 'origin/main'], {fatal: false}).code === 0
    ? 'main'
    : 'master';
}

export function assertCleanWorkingTree() {
  const result = exec(['status', '--porcelain']);
  if (result.stdout.length) {
    throw new Error(
      `Git detects untracked changes, please discard or commit before proceeding.\n${result.stdout}`,
    );
  }
}

export function readCurrentBranch(): string {
  return exec(['rev-parse', '--abbrev-ref', 'HEAD']).stdout;
}

export function readCommonAncestor(): string {
  return exec(['merge-base', readCurrentBranch(), readMainBranchName()]).stdout;
}

export function readChangedFilesSince(hash: string): string[] {
  const {stdout} = exec(['diff', '--name-only', hash]);
  return stdout.split('\n').filter(Boolean);
}

export function readFirstUniqueCommitMessage(): string {
  const commonAncestor = readCommonAncestor();
  const {stdout} = exec(['log', '--pretty=format:%H', `${commonAncestor}..HEAD`]);
  if (!stdout) {
    throw new Error(`Failed to find any commits since common ancestor (${commonAncestor})`);
  }

  log(`collected hashes since ${commonAncestor}: \n${stdout}`);
  const [firstCommitHash] = stdout.split('\n').filter(Boolean).splice(-1);
  return exec(['log', '--pretty=format:%B', '-n', '1', firstCommitHash]).stdout;
}
