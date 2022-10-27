import {spawnSync} from 'node:child_process';
import {createLogger} from './utils';

const log = createLogger('erised:common:git');

export interface RepoContext {
  gitRootDirectory: string;
  currentBranch: string;
  mainBranchName: string;
}

function _exec(args: string[], options?: {fatal?: boolean; cwd?: string}) {
  const {fatal = true, cwd = process.cwd()} = options ?? {};

  const result = spawnSync('git', args, {cwd});
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

export function exec(args: string[], options: {context: RepoContext; fatal?: boolean}) {
  return _exec(args, {...options, cwd: options.context.gitRootDirectory});
}

export async function getRepoContext(): Promise<RepoContext> {
  return {
    gitRootDirectory: _exec(['rev-parse', '--show-toplevel']).stdout,
    currentBranch: _exec(['rev-parse', '--abbrev-ref', 'HEAD']).stdout,
    mainBranchName:
      _exec(['rev-parse', '--verify', 'origin/main'], {fatal: false}).code === 0
        ? 'main'
        : 'master',
  };
}

export function assertCleanWorkingTree(options: {context: RepoContext}) {
  const result = exec(['status', '--porcelain'], options);
  if (result.stdout.length) {
    throw new Error(
      `Git detects untracked changes, please discard or commit before proceeding.\n${result.stdout}`,
    );
  }
}

export function readCommonAncestor(options: {context: RepoContext}): string {
  return exec(
    ['merge-base', options.context.currentBranch, options.context.mainBranchName],
    options,
  ).stdout;
}

export function readChangedFilesSince(hash: string, options: {context: RepoContext}): string[] {
  const {stdout} = exec(['diff', '--name-only', hash], options);
  return stdout.split('\n').filter(Boolean);
}

export function readFirstUniqueCommitMessage(options: {context: RepoContext}): string {
  const commonAncestor = readCommonAncestor(options);
  const {stdout} = exec(['log', '--pretty=format:%H', `${commonAncestor}..HEAD`], options);
  if (!stdout) {
    throw new Error(`Failed to find any commits since common ancestor (${commonAncestor})`);
  }

  log(`collected hashes since ${commonAncestor}: \n${stdout}`);
  const [firstCommitHash] = stdout.split('\n').filter(Boolean).splice(-1);
  return exec(['log', '--pretty=format:%B', '-n', '1', firstCommitHash], options).stdout;
}
