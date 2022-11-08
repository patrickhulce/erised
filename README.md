# erised

Command-line utility to mirror a single, local branch containing changes to many different projects into many separate commits / branches that can be landed independently. Useful for large monorepos with strict CI isolation requirements.

## Usage

```bash
# Setup Erised.
npm install -g @patrickhulce/erised
export ERISED_GITHUB_TOKEN=<get a personal token from GitHub>

# Start a commit affecting multiple subprojects in a monorepo.
touch apps/app-a/server.js
touch apps/app-b/server.js
git checkout -b my_feature_branch
git add apps/app-a apps/app-b
git commit -m 'fix: eliminates a critical memory leak'

# Use erised to split the branch into many isolated branches automatically.
erised mirror

# Upload those branches as PRs to GitHub.
erised upload

# Need to make a change? Just edit your original branch and run mirror again.
touch apps/app-b/server.js
git add apps/app-b/server.js
git commit -m 'oops a bug!'
erised mirror

# Check in on the status of PRs and update.
erised status
erised upload
```

## Development

```bash
npm i # Install deps.
npm test # Run test scripts.

npm run build:watch # Continuously build the source files into the binary.
npm start -- mirror # Run erised with your commands.
```

## TODO

- cleanup command
  - delete/cleanup branches
- merge command
  - automatically merge the PRs that can be merged
- idempotent mirror (create a staging branch and only rename if there's a diff)
- `--all` flag to handle all erised-managed branches at once
