import {
  DEFAULT_OPTIONS,
  setupTestRepository,
  teardownTestRepository,
  TestState,
} from '../common/test-utils';
import {executeMirror} from './mirror';
import {executeUpload} from './upload';

describe('erised upload', () => {
  let state: TestState;

  afterEach(async () => {
    await teardownTestRepository(state);
  });

  it('creates a PR for each branch', async () => {
    state = await setupTestRepository({
      ...DEFAULT_OPTIONS,
      branchName: 'example_branch',
      commits: [
        {
          message: 'feat: commit\nbody line1\nbody line2',
          modifiedFiles: ['packages/foo/example.js', 'packages/bar/example.js'],
        },
      ],
    });

    await executeMirror(state);
    await executeUpload({...state, githubApiBase: state.mockGitHubUrl, githubToken: 'TOKEN'});

    expect(state.mockPullRequests).toMatchObject([
      {head: 'example_branch.erised.packages_bar'},
      {head: 'example_branch.erised.packages_foo'},
    ]);

    expect(state.mockPullRequests[0]).toMatchObject({
      title: 'feat: commit',
      body: 'body line1\nbody line2',
    });
  });
});
