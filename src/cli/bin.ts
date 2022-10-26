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
    .command('init')
    .description('Splits a branch into many local branches.')
    .action(options => {
      log('init', options);
    });

  program
    .command('update')
    .description('Updates many branches to reflect latest primary trunk changes.')
    .action(options => {
      log('update', options);
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
