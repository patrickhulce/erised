import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as git from './git';
import * as express from 'express';
import * as http from 'http';
import bodyParser from 'body-parser';
import {createLogger} from './utils';
import {PullRequest} from './github';

const log = createLogger('erised:common:test-utils');

export interface TestState {
  tmpDirectory: string;
  tmpRemoteDirectory: string;

  context: git.RepoContext;

  mockPullRequests: Array<unknown>;
  mockGitHubServer: http.Server;
  mockGitHubUrl: string;
}

export const DEFAULT_OPTIONS = {
  baseFiles: [
    'packages/foo/a.js',
    'packages/foo/b.js',
    'packages/bar/c.js',
    'packages/bar/d.js',
    'packages/baz/e.js',
    'packages/baz/f.js',
  ],
  branchName: 'example_branch',
  mainBranchName: 'main',
  pullRequests: [] as PullRequest[],
  commits: [
    {
      message: 'feat: add features to foo & bar\n\nhere are some details',
      modifiedFiles: ['packages/foo/a.js', 'packages/bar/c.js'],
    },
  ],
};

export async function setupTestRepository(options: typeof DEFAULT_OPTIONS): Promise<TestState> {
  const tmpDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'erised-tests'));
  const tmpRemoteDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'erised-tests'));

  for (const file of options.baseFiles) {
    const filePath = path.join(tmpDirPath, file);
    const dirPath = path.dirname(filePath);

    await fs.mkdir(dirPath, {recursive: true});
    await fs.writeFile(filePath, 'content');
  }

  const context: git.RepoContext = {
    globalCommitCount: 0,
    gitRootDirectory: tmpDirPath,
    githubRepo: {remoteName: 'origin', name: 'erised', owner: 'patrickhulce'},
    currentBranch: options.branchName,
    mainBranchName: options.mainBranchName,
  };

  // Setup the repo with initial files.
  git.exec(['init'], {context});
  git.exec(['add', '-A'], {context});
  git.exec(['commit', '-m', 'feat: initial commit'], {context});
  git.exec(['branch', '-m', context.mainBranchName], {context});

  // Create a branch and add some commits to it.
  git.exec(['checkout', '-b', context.currentBranch], {context});
  await _createCommits(options.commits, context);

  // Setup fake remote.
  git.exec(['init'], {context: {...context, gitRootDirectory: tmpRemoteDirectory}});
  git.exec(['remote', 'add', 'origin', `${tmpRemoteDirectory}/.git`], {context});

  const hithubApp = express.default();
  hithubApp.use(bodyParser.json());
  const mockPullRequests: unknown[] = [];
  hithubApp.get('/repos/:owner/:repo/pulls', (req, res) => {
    log(`request received to list ${req.query.head} pull requests`);
    res.send(options.pullRequests.filter(pr => pr.head.ref === req.query.head));
  });
  hithubApp.post('/repos/:owner/:repo/pulls', (req, res) => {
    log(`request received to create ${req.params.owner}/${req.params.repo} pull request`);
    mockPullRequests.push(req.body);
    res.sendStatus(201);
  });
  const mockGitHubServer = http.createServer(hithubApp);
  await new Promise<void>(resolve => mockGitHubServer.listen(0, resolve));
  const address = mockGitHubServer.address() as import('net').AddressInfo;
  const mockGitHubUrl = `http://localhost:${address.port}`;

  return {
    tmpDirectory: tmpDirPath,
    tmpRemoteDirectory,
    context,

    mockPullRequests,
    mockGitHubServer,
    mockGitHubUrl,
  };
}

export async function teardownTestRepository(state: TestState): Promise<void> {
  await fs.rm(state.tmpDirectory, {recursive: true, force: true});
  await fs.rm(state.tmpRemoteDirectory, {recursive: true, force: true});

  state.mockGitHubServer.closeAllConnections();
  await new Promise<void>(resolve => state.mockGitHubServer.close(() => resolve()));
}

export async function addCommitsToTestRepository(
  state: TestState,
  commits: typeof DEFAULT_OPTIONS['commits'],
): Promise<void> {
  const {context} = state;

  await _createCommits(commits, context);
}

async function _createCommits(
  commits: {message: string; modifiedFiles: string[]}[],
  context: git.RepoContext,
) {
  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];

    for (const file of commit.modifiedFiles) {
      const filePath = path.join(context.gitRootDirectory, file);
      await fs.writeFile(filePath, `content #${context.globalCommitCount}.${i}`);
    }

    git.exec(['add', ...commit.modifiedFiles], {context});
    git.exec(['commit', '-m', commit.message], {context});
  }
}
