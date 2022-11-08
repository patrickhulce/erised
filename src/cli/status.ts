import {determineBoundaries, getBoundaryBranchName} from '../common/boundary';
import * as git from '../common/git';
import {createLogger} from '../common/utils';
import {getPRReviews, getPRs, GitHubContext} from '../common/github';
import {readPreferences} from '../common/preferences';

interface BranchStatus {
  pullRequestUrl: string;
  isLocalUpToDate: boolean;
  isRemoteUpToDate: boolean;
  isMerged: boolean;
  isApproved: boolean;
}

export const log = createLogger('erised:cli:status');

function getUpdatedTimeOfRef(ref: string, context: git.RepoContext): Date {
  const {code, stdout: lastUpdatedAtStr} = git.exec(['log', '-1', '--format=%cd'], {
    context,
    fatal: false,
  });
  if (code !== 0) return new Date(`1970-01-02`);
  return new Date(lastUpdatedAtStr);
}

export async function executeStatus(options: {context: git.RepoContext & GitHubContext}) {
  const {context} = options;

  // Read the boundary rules from preferences.
  const {boundaryRules} = await readPreferences();

  // Gather the set of changed files from master ancestor.
  const commonAncestor = git.readCommonAncestor({context});
  const changedFiles = git.readChangedFilesSince(commonAncestor, {context});

  // Determine the set of branches that should exist and their associated files.
  const changesets = determineBoundaries(boundaryRules, changedFiles);

  // Determine when the current branch was last updated.
  const lastUpdatedAt = git.isCleanWorkingTree({context})
    ? getUpdatedTimeOfRef('HEAD', context)
    : new Date();

  // For each branch...
  const statusByBranch = new Map<string, BranchStatus>();
  for (const changeset of changesets) {
    // Get branch name and start
    const branch = getBoundaryBranchName(changeset.boundary, context);
    const status: BranchStatus = {
      pullRequestUrl: `https://github.com/${context.githubRepo.owner}/${context.githubRepo.name}/compare/${context.mainBranchName}...${branch}`,
      isLocalUpToDate: false,
      isRemoteUpToDate: false,
      isMerged: false,
      isApproved: false,
    };
    statusByBranch.set(branch, status);

    // Determine whether it's up-to-date with local version.
    const branchUpdatedAt = getUpdatedTimeOfRef(branch, context);
    log(`branch updated at`, branchUpdatedAt, 'vs', lastUpdatedAt);
    status.isLocalUpToDate = branchUpdatedAt.getTime() >= lastUpdatedAt.getTime();

    // Determine whether it's up-to-date with remote version.
    const remoteUpdatedAt = getUpdatedTimeOfRef(
      `${context.githubRepo.remoteName}/${branch}`,
      context,
    );
    log(`remote updated at`, remoteUpdatedAt, 'vs', branchUpdatedAt);
    status.isRemoteUpToDate = remoteUpdatedAt.getTime() >= branchUpdatedAt.getTime();

    // Determine whether it's been merged already.
    const pullRequestsForBranch = await getPRs({branch, context});
    const mergedPullRequest = pullRequestsForBranch.find(pr => pr.merged_at);
    if (mergedPullRequest) {
      log(`found merged PR for`, branch, 'at', mergedPullRequest.html_url, mergedPullRequest.head);
      status.isMerged = true;
      status.isApproved = true;
      status.pullRequestUrl = mergedPullRequest.html_url;
    }

    // Determine whether it's approved / requested changes.
    const openPullRequest = pullRequestsForBranch.find(pr => pr.state === 'open');
    if (!status.isMerged && openPullRequest) {
      log(`found open PR for`, branch, 'at', openPullRequest.html_url, openPullRequest.head);
      const reviews = await getPRReviews({pullRequestNumber: openPullRequest.number, context});
      const upToDateReviews = reviews.filter(
        review => new Date(review.submitted_at).getTime() >= remoteUpdatedAt.getTime(),
      );
      const hasOneApproving = upToDateReviews.some(review => review.state === 'APPROVED');
      const hasNoChangeRequests = upToDateReviews.every(
        review => review.state !== 'CHANGES_REQUESTED',
      );

      status.isApproved = hasOneApproving && hasNoChangeRequests;
      status.pullRequestUrl = openPullRequest.html_url;
    }
  }

  process.stdout.write(`💻 | 🌐 | 🧐 / URL\n`);
  process.stdout.write(`-- | -- | --------\n`);
  for (const [branch, status] of statusByBranch) {
    const localStatus = status.isLocalUpToDate ? '✅' : '⛔';
    const remoteStatus = status.isRemoteUpToDate ? '✅' : '⛔';
    const reviewStatus = status.isMerged ? '⤴️' : status.isApproved ? '✅' : '⛔';
    const line = `${localStatus} | ${remoteStatus} | ${reviewStatus} / ${branch.replace(
      /.*\.erised\./,
      '',
    )} (${status.pullRequestUrl})`;

    process.stdout.write(`${line}\n`);
  }
}
