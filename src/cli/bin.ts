import {Command} from 'commander';
import {version} from '../../package.json';
import createLogger from 'debug';
import {executeMirror} from './mirror';
import * as git from '../common/git';

export const log = createLogger('erised:cli:run');

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

      const context = await git.getRepoContext();
      await executeMirror({context});
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
