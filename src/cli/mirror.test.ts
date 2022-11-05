import {
  addCommitsToTestRepository,
  DEFAULT_OPTIONS,
  setupTestRepository,
  teardownTestRepository,
  TestState,
} from '../common/test-utils';
import {executeMirror} from './mirror';
import * as git from '../common/git';

describe('erised mirror', () => {
  let state: TestState;

  afterEach(async () => {
    await teardownTestRepository(state);
  });

  it('splits a single commit into several fresh branches', async () => {
    state = await setupTestRepository({
      ...DEFAULT_OPTIONS,
      branchName: 'example_branch',
      commits: [
        {
          message: 'feat: commit',
          modifiedFiles: ['packages/foo/example.js', 'packages/bar/example.js'],
        },
      ],
    });

    await executeMirror(state);

    const branches = git.readBranches(state);
    expect(branches).toContain('example_branch.erised.packages_foo');
    expect(branches).toContain('example_branch.erised.packages_bar');

    const branchFooCommit = git.exec(['show', 'example_branch.erised.packages_foo'], state).stdout;
    expect(branchFooCommit).toContain('feat: commit'); // Uses commit message.
    expect(branchFooCommit).toContain('packages/foo/example.js'); // Includes correct file.
    expect(branchFooCommit).not.toContain('packages/bar/example.js'); // Excludes correct file.

    const branchBarCommit = git.exec(['show', 'example_branch.erised.packages_bar'], state).stdout;
    expect(branchBarCommit).toContain('feat: commit'); // Uses commit message.
    expect(branchBarCommit).toContain('packages/bar/example.js'); // Includes correct file.
    expect(branchBarCommit).not.toContain('packages/foo/example.js'); // Excludes correct file.
  });

  it('squashes multiple commits into one per branch', async () => {
    state = await setupTestRepository({
      ...DEFAULT_OPTIONS,
      branchName: 'example_branch',
      commits: [
        {
          message: 'feat: commit',
          modifiedFiles: ['packages/foo/example.js', 'packages/bar/example.js'],
        },
        {
          message: 'feat: commit-a',
          modifiedFiles: ['packages/foo/example-a.js'],
        },
        {
          message: 'feat: commit-b',
          modifiedFiles: ['packages/foo/example-b.js'],
        },
      ],
    });

    await executeMirror(state);

    const branches = git.readBranches(state);
    expect(branches).toContain('example_branch.erised.packages_foo');
    expect(branches).toContain('example_branch.erised.packages_bar');

    const branchFooCommit = git.exec(['show', 'example_branch.erised.packages_foo'], state).stdout;
    expect(branchFooCommit).toContain('feat: commit'); // Uses 1st commit message.
    expect(branchFooCommit).toContain('packages/foo/example.js'); // Includes original file.
    expect(branchFooCommit).toContain('packages/foo/example-a.js'); // Includes next commit file.
    expect(branchFooCommit).toContain('packages/foo/example-b.js'); // Includes next commit file.
    expect(branchFooCommit).not.toContain('packages/bar/example.js'); // Excludes other branch files.

    const branchBarCommit = git.exec(['show', 'example_branch.erised.packages_bar'], state).stdout;
    expect(branchBarCommit).toContain('feat: commit'); // Uses commit message.
    expect(branchBarCommit).toContain('packages/bar/example.js'); // Includes correct file.
  });

  it('works as update', async () => {
    state = await setupTestRepository({
      ...DEFAULT_OPTIONS,
      branchName: 'example_branch',
      commits: [
        {
          message: 'feat: commit',
          modifiedFiles: ['packages/foo/example.js', 'packages/bar/example.js'],
        },
      ],
    });

    await executeMirror(state);

    await addCommitsToTestRepository(state, [
      {
        message: 'feat: commit-a',
        modifiedFiles: ['packages/foo/example-a.js'],
      },
      {
        message: 'feat: commit-b',
        modifiedFiles: ['packages/foo/example-b.js'],
      },
    ]);

    await executeMirror(state);

    const branches = git.readBranches(state);
    expect(branches).toContain('example_branch.erised.packages_foo');
    expect(branches).toContain('example_branch.erised.packages_bar');

    const branchFooCommit = git.exec(['show', 'example_branch.erised.packages_foo'], state).stdout;
    expect(branchFooCommit).toContain('feat: commit'); // Uses 1st commit message.
    expect(branchFooCommit).toContain('packages/foo/example.js'); // Includes original file.
    expect(branchFooCommit).toContain('packages/foo/example-a.js'); // Includes next commit file.
    expect(branchFooCommit).toContain('packages/foo/example-b.js'); // Includes next commit file.
    expect(branchFooCommit).not.toContain('packages/bar/example.js'); // Excludes other branch files.

    const branchBarCommit = git.exec(['show', 'example_branch.erised.packages_bar'], state).stdout;
    expect(branchBarCommit).toContain('feat: commit'); // Uses commit message.
    expect(branchBarCommit).toContain('packages/bar/example.js'); // Includes correct file.
  });
});
