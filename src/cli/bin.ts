import {Command} from 'commander';
import {version} from '../../package.json';
import createLogger from 'debug';
import {executeMirror} from './mirror';
import * as git from '../common/git';
import {executeUpload} from './upload';
import {executeStatus} from './status';
import chalk from 'chalk';

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
    .option('--github-api-base <url>', 'the GitHub API URL to use', 'https://api.github.com')
    .option('-t, --github-token <token>', 'the GitHub API token to use')
    .action(async options => {
      if (!options.githubToken) options.githubToken = process.env.ERISED_GITHUB_TOKEN;
      log('executing upload with options', options);

      const context = {
        ...options,
        ...(await git.getRepoContext()),
      };

      await executeUpload({context});
    });

  program
    .command('status')
    .description('Lists the status of all local branches and PRs.')
    .option('--github-api-base <url>', 'the GitHub API URL to use', 'https://api.github.com')
    .option('-t, --github-token <token>', 'the GitHub API token to use')
    .action(async options => {
      if (!options.githubToken) options.githubToken = process.env.ERISED_GITHUB_TOKEN;
      log('executing status with options', options);

      const context = {
        ...options,
        ...(await git.getRepoContext()),
      };

      await executeStatus({context});
    });

  program
    .command('cleanup')
    .description('Deletes any local branches that have been completed.')
    .action(options => {
      log('cleanup', options);
    });

  await program.parseAsync(process.argv);

  process.stdout.write(`\n${chalk.bold('Done!')} 🎉\n`);
}

main().catch(err => {
  console.error(err.stack);
  process.exit(1);
});
