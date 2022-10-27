import {
  DEFAULT_OPTIONS,
  setupTestRepository,
  teardownTestRepository,
  TestState,
} from '../common/test-utils';
import {executeMirror} from './mirror';
import * as git from '../common/git';

describe('erised mirror', () => {
  let state: TestState;

  const getBranches = () =>
    git
      .exec(['branch'], state)
      .stdout.split('\n')
      .map(line => line.trim());

  afterEach(async () => {
    await teardownTestRepository(state);
  });

  it('splits a single commit into several fresh branches', async () => {
    state = await setupTestRepository({
      ...DEFAULT_OPTIONS,
      modifiedFiles: ['packages/foo/example.js', 'packages/bar/example.js'],
      branchName: 'example_branch',
      commits: ['feat: commit'],
    });

    await executeMirror(state);

    const branches = getBranches();
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
});
