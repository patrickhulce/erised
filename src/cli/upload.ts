import {filterBoundaryBranches} from '../common/boundary';
import * as git from '../common/git';
import {createLogger} from '../common/utils';

export const log = createLogger('erised:cli:upload');

async function createPR(options: {
  githubApiBase: string;
  githubToken: string;

  title: string;
  body: string;
  branch: string;

  context: git.RepoContext;
}) {
  const {githubApiBase, githubToken, context} = options;

  await fetch(`${githubApiBase}/repos/${context.githubRepo.owner}/${context.githubRepo.name}`, {
    method: 'POST',
    headers: {accept: 'application/vnd.github+json', authorization: `Bearer ${githubToken}`},
    body: JSON.stringify({
      title: options.title,
      body: options.body,
      head: options.branch,
      base: context.mainBranchName,
    }),
  });
}

export async function executeUpload(options: {
  context: git.RepoContext;
  githubApiBase: string;
  githubToken: string;
}) {
  const {context} = options;

  // Check to make sure tree is clean (no pending changes).
  git.assertCleanWorkingTree({context});

  // Determine the set of erised branches that are related to the current branch.
  const allBranches = git.readBranches({context});
  const erisedBranches = filterBoundaryBranches(allBranches, context);

  // Determine the branch name and commit message to use (first distinct commit).
  const commitMessage = git.readFirstUniqueCommitMessage({context});
  const [title, body] = commitMessage.split('\n', 2);

  // TODO: Assert that those branches are up-to-date with the current branch.

  // For each branch...
  for (const branch of erisedBranches) {
    // Push the branch up to GitHub.
    git.exec(['checkout', '-f', branch], {context});
    git.exec(['push', '-f', '-u', context.githubRepo.remoteName, branch], {context});

    // TODO: check if PR already exists.

    // Create the PR.
    await createPR({...options, branch, title, body});
  }

  // Return to starting branch.
  git.exec(['checkout', '-f', context.currentBranch], {context});
}
