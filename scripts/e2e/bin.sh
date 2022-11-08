#!/bin/bash

set -euxo pipefail

E2E_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
REPO_DIR="$E2E_DIR/../.."

cd "$REPO_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Repo has changes to the files! Commit or stash the changes to continue."
  exit 1
fi

export ERISED_MAIN_BRANCH=main-test
export ERISED_GITHUB_TOKEN=${ERISED_GITHUB_TOKEN:-GITHUB_TOKEN}

CURRENT_REF=$(git rev-parse --abbrev-ref HEAD)

function setup_environment () {
  git checkout main-test
  git reset --hard main

  mkdir -p packages/foo/
  mkdir -p packages/bar/

  echo 'console.log("foo!");' > packages/foo/foo.js
  echo 'console.log("bar!");' > packages/bar/bar.js

  git add packages/
  git commit -m 'feat: initialize monorepo'

  git checkout -b __e2e-example

  echo 'console.log("foo 2!");' > packages/foo/foo.js
  echo 'console.log("bar 2!");' > packages/bar/bar.js

  git add packages/
  git commit -m 'feat: make changes to foo & bar'
}

function reset_environment () {
  git checkout -f "$CURRENT_REF"

  for branch in $(git branch | grep __e2e) ; do
    git branch -D "$branch"
  done

  node scripts/e2e/cleanup-prs.js
}

setup_environment

set +e
bash ./scripts/e2e/test.sh
EXIT_CODE="$?"
set -e

reset_environment
exit "$EXIT_CODE"
