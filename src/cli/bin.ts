import {Command} from 'commander';
import {version} from '../../package.json';
import createLogger from 'debug';
import * as git from '../common/git';
import {readPreferences} from '../common/preferences';
import {determineBoundaries} from '../common/boundary';

const log = createLogger('erised:cli:run');

async function main() {
  const program = new Command();
  program
    .name('erised')
    .description('CLI to mirror branches to GitHub for isolation benefits.')
    .version(version);

  program
    .command('mirror')
    .description('Reflects a local primary branch into mirrored local, segmented branches.')
    .action(async options => {
      log('executing mirror with options', options);

      // Check to make sure tree is clean (no pending changes).
      git.assertCleanWorkingTree();

      // Read the boundary rules from preferences.
      const {boundaryRules} = await readPreferences();

      // Gather the set of changed files from master ancestor.
      const commonAncestor = git.readCommonAncestor();
      const changedFiles = git.readChangedFilesSince(commonAncestor);

      // Determine the set of branches to create and their associated files.
      const changesets = determineBoundaries(boundaryRules, changedFiles);
      // Determine the branch name and commit message to use (first distinct commit).
      const currentBranch = git.readCurrentBranch();
      const message = git.readFirstUniqueCommitMessage();

      log({commonAncestor, changedFiles, changesets, currentBranch, message});

      // For each changeset...
      for (const changeset of changesets) {
        // Checkout a clean new branch from master ancestor.
        const cleanedBoundary = changeset.boundary.replace(/[^a-z0-9]+/g, '_');
        const branchName = `${currentBranch}.erised.${cleanedBoundary}`;
        log('checking out current branch');
        git.exec(['checkout', '-f', currentBranch]);
        log('checking out branch name', branchName);
        git.exec(['branch', '-D', branchName], {fatal: false});
        git.exec(['checkout', '-b', branchName]);

        // Add the set of files just for that branch.
        log('checking out branch name', branchName);
        git.exec(['reset', git.readMainBranchName()]);
        git.exec(['add', ...changeset.changedFiles]);

        // Create a commit based on the message from before.
        log(`committing ${changeset.changedFiles.length} changes`);
        git.exec(['commit', '--no-verify', '-m', message]);
      }
    });

  program
    .command('upload')
    .description('Uploads the branches to GitHub as PRs.')
    .action(options => {
      log('upload', options);
    });

  program
    .command('status')
    .description('Lists the status of all local branches and PRs.')
    .action(options => {
      log('status', options);
    });

  program
    .command('merge')
    .description('Merges any PRs with approvals.')
    .action(options => {
      log('status', options);
    });

  program
    .command('cleanup')
    .description('Deletes any local branches that have been completed.')
    .action(options => {
      log('cleanup', options);
    });

  await program.parseAsync(process.argv);

  process.stdout.write(`Done!\n`);
}

main().catch(err => {
  console.error(err.stack);
  process.exit(1);
});
