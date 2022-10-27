import * as git from '../common/git';
import {readPreferences} from '../common/preferences';
import {determineBoundaries} from '../common/boundary';
import {createLogger} from '../common/utils';

export const log = createLogger('erised:cli:mirror');

export async function executeMirror(options: {context: git.RepoContext}) {
  const {context} = options;

  // Check to make sure tree is clean (no pending changes).
  git.assertCleanWorkingTree({context});

  // Read the boundary rules from preferences.
  const {boundaryRules} = await readPreferences();

  // Gather the set of changed files from master ancestor.
  const commonAncestor = git.readCommonAncestor({context});
  const changedFiles = git.readChangedFilesSince(commonAncestor, {context});

  // Determine the set of branches to create and their associated files.
  const changesets = determineBoundaries(boundaryRules, changedFiles);
  // Determine the branch name and commit message to use (first distinct commit).
  const message = git.readFirstUniqueCommitMessage({context});

  // For each changeset...
  for (const changeset of changesets) {
    // Checkout a clean new branch from master ancestor.
    log('checking out current branch');
    git.exec(['checkout', '-f', context.currentBranch], {context});

    const cleanedBoundary = changeset.boundary.replace(/[^a-z0-9]+/g, '_');
    const branchName = `${context.currentBranch}.erised.${cleanedBoundary}`;
    log('checking out new branch', branchName);
    git.exec(['branch', '-D', branchName], {fatal: false, context});
    git.exec(['checkout', '-b', branchName], {context});

    // Add the set of files just for that branch.
    log(`adding changed files to ${branchName}`);
    git.exec(['reset', context.mainBranchName], {context});
    git.exec(['add', ...changeset.changedFiles], {context});

    // Create a commit based on the message from before.
    log(`committing ${changeset.changedFiles.length} changes`);
    git.exec(['commit', '--no-verify', '-m', message], {context});
  }
}