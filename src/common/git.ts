import {spawnSync} from 'node:child_process';
import {createLogger} from './utils';
import * as path from 'path';

const log = createLogger('erised:common:git');

export interface RepoContext {
  gitRootDirectory: string;
  currentBranch: string;
  mainBranchName: string;
  globalCommitCount: number;
  githubRepo: {name: string; owner: string; remoteName: string};
}

function _exec(args: string[], options?: {fatal?: boolean; gitWorkTree?: string}) {
  const {fatal = true, gitWorkTree = process.cwd()} = options ?? {};

  const result = spawnSync('git', args, {
    cwd: gitWorkTree,
    env: {...process.env, GIT_WORK_TREE: gitWorkTree, GIT_DIR: path.join(gitWorkTree, '.git')},
  });

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
  log(`executing "git ${args.map(s => s.slice(0, 40)).join(' ')}"`);
  if (args[0] === 'commit') options.context.globalCommitCount++;
  return _exec(args, {...options, gitWorkTree: options.context.gitRootDirectory});
}

export function readBranches(options: {context: RepoContext}) {
  return exec(['branch'], options)
    .stdout.split('\n')
    .map(line => line.trim());
}

export async function getRepoContext(): Promise<RepoContext> {
  const remoteMatchRegex = /github\.com[:\/](\w+)\/(\w+)\.git/;
  const remotes = _exec(['remote', '-v']).stdout;
  const githubRemoteLine = remotes.split('\n').find(line => line.match(remoteMatchRegex));
  if (!githubRemoteLine) throw new Error(`GitHub remote not found in repository:\n${remotes}`);

  const [remoteName, connection] = githubRemoteLine.split(/\s+/);
  const [, repoOwner, repoName] = connection.match(remoteMatchRegex) || [];
  if (!repoOwner || !repoName) {
    throw new Error(`Unable to extract repository owner from "${connection}"`);
  }

  return {
    globalCommitCount: 0,
    gitRootDirectory: _exec(['rev-parse', '--show-toplevel']).stdout,
    currentBranch: _exec(['rev-parse', '--abbrev-ref', 'HEAD']).stdout,
    mainBranchName:
      _exec(['rev-parse', '--verify', 'main'], {fatal: false}).code === 0 ? 'main' : 'master',
    githubRepo: {remoteName, owner: repoOwner, name: repoName},
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
