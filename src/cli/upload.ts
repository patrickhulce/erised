import {filterBoundaryBranches} from '../common/boundary';
import * as git from '../common/git';
import {createLogger} from '../common/utils';
import {createPR, getPRs, GitHubContext} from '../common/github';

export const log = createLogger('erised:cli:upload');

export async function executeUpload(options: {context: git.RepoContext & GitHubContext}) {
  const {context} = options;

  // Check to make sure tree is clean (no pending changes).
  git.assertCleanWorkingTree({context});

  // Determine the set of erised branches that are related to the current branch.
  const allBranches = git.readBranches({context});
  const erisedBranches = filterBoundaryBranches(allBranches, context);

  // Determine the branch name and commit message to use (first distinct commit).
  const commitMessage = git.readFirstUniqueCommitMessage({context});
  const [title, ...bodyLines] = commitMessage.split('\n');
  const body = bodyLines.join('\n');

  // TODO: Assert that those branches are up-to-date with the current branch.

  // For each branch...
  for (const branch of erisedBranches) {
    // Push the branch up to GitHub.
    git.exec(['checkout', '-f', branch], {context});
    git.exec(['push', '-f', '-u', context.githubRepo.remoteName, branch], {context});

    const existingPRs = await getPRs({branch, context});
    const existingPR = existingPRs.find(pr => pr.state === 'open' || pr.merged_at);
    if (existingPR) {
      log(`PR already opened for ${branch}, ${existingPR.html_url}`);
    } else {
      await createPR({...options, branch, title, body});
    }
  }

  // Return to starting branch.
  git.exec(['checkout', '-f', context.currentBranch], {context});
}
