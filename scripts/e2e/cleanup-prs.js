const git = require('../../dist/src/common/git');
const github = require('../../dist/src/common/github');

async function main() {
  const repoContext = await git.getRepoContext();
  const githubContext = {
    githubToken: process.env.ERISED_GITHUB_TOKEN ?? '',
    githubApiBase: 'https://api.github.com',
  };
  const context = {...githubContext, ...repoContext};

  const pullRequests = await github.getPRs({context});
  const e2ePRs = pullRequests.filter(pr => pr.head.ref.includes('__e2e'));

  if (!e2ePRs.length) {
    console.log('No e2e pull requests found!');
  }

  for (const pr of e2ePRs) {
    if (pr.state === 'closed') continue;

    console.log(`Closing pull request #${pr.number} (${pr.html_url})`);
    await github.closePR({pullRequestNumber: pr.number, context});
  }
}

main().catch(err => {
  process.stderr.write(err.stack);
  process.exit(1);
});
