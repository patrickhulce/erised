import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as git from './git';

export interface TestState {
  tmpDirectory: string;
  context: git.RepoContext;
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
  modifiedFiles: ['packages/foo/a.js', 'packages/bar/c.js'],
  branchName: 'example_branch',
  mainBranchName: 'main',
  commits: ['feat: add features to foo & bar\n\nhere are some details'],
};

export async function setupTestRepository(options: typeof DEFAULT_OPTIONS): Promise<TestState> {
  const tmpDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'erised-tests'));

  for (const file of options.baseFiles) {
    const filePath = path.join(tmpDirPath, file);
    const dirPath = path.dirname(filePath);

    await fs.mkdir(dirPath, {recursive: true});
    await fs.writeFile(filePath, 'content');
  }

  const context: git.RepoContext = {
    gitRootDirectory: tmpDirPath,
    currentBranch: options.branchName,
    mainBranchName: options.mainBranchName,
  };

  git.exec(['init'], {context});
  git.exec(['add', '-A'], {context});
  git.exec(['commit', '-m', 'feat: initial commit'], {context});
  git.exec(['branch', '-m', context.mainBranchName], {context});
  console.log(git.exec(['status'], {context}));

  for (let i = 0; i < options.commits.length; i++) {
    const commit = options.commits[i];

    for (const file of options.modifiedFiles) {
      const filePath = path.join(tmpDirPath, file);
      await fs.writeFile(filePath, `content #${i}`);
    }

    console.log(tmpDirPath);
    git.exec(['add', ...options.modifiedFiles], {context});
    git.exec(['commit', '-m', commit], {context});
  }

  return {tmpDirectory: tmpDirPath, context: context};
}

export async function teardownTestRepository(state: TestState): Promise<void> {
  await fs.rm(state.tmpDirectory, {recursive: true, force: true});
}
