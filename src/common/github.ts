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
  urlPathname: string;
  method: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  context: GitHubContext;
}): Promise<T> {
  log(`requesting ${options.urlPathname}`);

  const postHeaders = {'content-type': 'application/json'};

  const response = await fetch(`${options.context.githubApiBase}${options.urlPathname}`, {
    method: options.method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${options.context.githubToken}`,
      ...(options.method === 'GET' ? {} : postHeaders),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Failed to request ${options.urlPathname}:\n${await response.text()}`);
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

  await _request({
    urlPathname: `/repos/${githubRepo.owner}/${githubRepo.name}/pulls`,
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
  if (options.branch) queryParams.set('head', options.branch);
  queryParams.set('base', context.mainBranchName);

  return _request<PullRequest[]>({
    urlPathname: `/repos/${githubRepo.owner}/${githubRepo.name}/pulls?${queryParams}`,
    method: 'GET',
    context,
  });
}

export async function closePR(options: {
  pullRequestNumber: number;
  context: git.RepoContext & GitHubContext;
}): Promise<void> {
  const {pullRequestNumber, context} = options;
  const {owner, name} = context.githubRepo;

  return _request<void>({
    urlPathname: `/repos/${owner}/${name}/pulls/${pullRequestNumber}`,
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
    urlPathname: `/repos/${owner}/${name}/pulls/${pullRequestNumber}/reviews`,
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
