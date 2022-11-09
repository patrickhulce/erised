import * as git from './git';
import fetch from 'node-fetch';
import {createLogger} from './utils';

export const log = createLogger('erised:common:github');

export interface GitHubContext {
  githubApiBase: string;
  githubToken: string;
}

export interface PullRequest {
  html_url: string;
  number: number;
  title: string;
  updated_at: string;
  merged_at?: string;
  created_at: string;
  state: 'open' | 'closed';
  head: {
    sha: string;
    ref: string;
  };
}

export interface PullRequestReview {
  state: 'APPROVED' | 'CHANGES_REQUESTED';
  submitted_at: string;
}

async function _request<T = void>(options: {
  url: string;
  method: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  context: GitHubContext;
}): Promise<T> {
  log(`requesting ${options.url}`);

  const withBodyHeaders = {'content-type': 'application/json'};

  const response = await fetch(`${options.context.githubApiBase}${options.url}`, {
    method: options.method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${options.context.githubToken}`,
      ...(options.body ? withBodyHeaders : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Failed to request ${options.url}:\n${await response.text()}`);
  }

  if (response.headers.get('content-type')?.includes('json')) return response.json();
  // @ts-expect-error - We rely on content type matching the expected type.
  return response.text().catch(err => `Unexpected error: ${err.stack}`);
}

export async function createPR(options: {
  title: string;
  body: string;
  branch: string;

  context: git.RepoContext & GitHubContext;
}) {
  const {context} = options;
  const {githubRepo} = context;

  return _request<PullRequest>({
    url: `/repos/${githubRepo.owner}/${githubRepo.name}/pulls`,
    method: 'POST',
    body: {
      title: options.title,
      body: options.body,
      head: options.branch,
      base: context.mainBranchName,
    },
    context,
  });
}

export async function getPRs(options: {
  branch?: string;

  context: git.RepoContext & GitHubContext;
}): Promise<PullRequest[]> {
  const {context} = options;
  const {githubRepo} = context;

  const queryParams = new URLSearchParams();
  queryParams.set('state', 'all');
  queryParams.set('base', context.mainBranchName);
  if (options.branch) queryParams.set('head', `${githubRepo.owner}:${options.branch}`);

  const response = await _request<PullRequest[]>({
    url: `/repos/${githubRepo.owner}/${githubRepo.name}/pulls?${queryParams}`,
    method: 'GET',
    context,
  });

  return response.filter(pr => !options.branch || pr.head.ref === options.branch);
}

export async function closePR(options: {
  pullRequestNumber: number;
  context: git.RepoContext & GitHubContext;
}): Promise<void> {
  const {pullRequestNumber, context} = options;
  const {owner, name} = context.githubRepo;

  return _request<void>({
    url: `/repos/${owner}/${name}/pulls/${pullRequestNumber}`,
    method: 'PATCH',
    body: {state: 'closed'},
    context,
  });
}

export async function getPRReviews(options: {
  pullRequestNumber: number;
  context: git.RepoContext & GitHubContext;
}): Promise<PullRequestReview[]> {
  const {pullRequestNumber, context} = options;
  const {owner, name} = context.githubRepo;

  return _request<PullRequestReview[]>({
    url: `/repos/${owner}/${name}/pulls/${pullRequestNumber}/reviews`,
    method: 'GET',
    context,
  });
}

export function createMockPullRequest(): PullRequest {
  return {
    html_url: 'http://example.com/',
    number: 123,
    title: 'Fix: Add a Pull Request',
    state: 'open',
    head: {
      sha: 'abcdef',
      ref: 'example_branch',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
