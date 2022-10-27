import {Command} from 'commander';
import {version} from '../../package.json';
import createLogger from 'debug';

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
    .action(options => {
      log('mirror', options);

      // Check to make sure tree is clean (no pending changes).
      // Read the boundaries from preferences (ENV?).
      // Gather the set of changed files from master ancestor.
      // Determine the set of branches to create and their associated files.
      // Determine the commit message to use (first distinct commit).
      // For each branch...
      //    - Checkout a clean new branch from master ancestor. (throw if already existing)
      //    - Add the set of files for that branch.
      //    - Create a commit based on the message from before.
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

  const parsed = await program.parseAsync(process.argv);

  log(parsed);
}

main().catch(err => {
  console.error(err.stack);
  process.exit(1);
});
