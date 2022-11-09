import * as git from '../common/git';
import {readPreferences} from '../common/preferences';
import {determineBoundaries, getBoundaryBranchName} from '../common/boundary';
import {createLogger, logWithColor} from '../common/utils';
import chalk from 'chalk';

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

  logWithColor([
    [`Determined there are `, chalk.dim],
    [`${changesets.length} branches`, chalk.bold],
    [` to be mirrored:\n`, chalk.dim],
  ]);

  // For each changeset...
  for (const changeset of changesets) {
    // Checkout a clean new branch from master ancestor.
    log('checking out current branch');
    git.exec(['checkout', '-f', context.currentBranch], {context});

    const branchName = getBoundaryBranchName(changeset.boundary, context);
    logWithColor(
      [
        [`  Mirroring `, chalk.dim],
        [branchName, chalk.bold],
        [`...`, chalk],
      ],
      {skipNewline: true},
    );
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

    logWithColor([['done!', chalk.green]]);
  }

  // Return to starting branch.
  git.exec(['checkout', '-f', context.currentBranch], {context});
}
