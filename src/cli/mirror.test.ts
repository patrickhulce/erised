import {
  DEFAULT_OPTIONS,
  setupTestRepository,
  teardownTestRepository,
  TestState,
} from '../common/test-utils';
import {executeMirror} from './mirror';

describe('erised mirror', () => {
  let state: TestState;

  afterEach(async () => {
    await teardownTestRepository(state);
  });

  it('splits a single commit into several fresh branches', async () => {
    state = await setupTestRepository({
      ...DEFAULT_OPTIONS,
      modifiedFiles: ['packages/foo/example.js', 'packages/bar/example.js'],
      commits: ['feat: commit'],
    });

    await executeMirror(state);
  });
});
