#!/bin/bash

set -euxo pipefail

npm start -- mirror
git branch | grep packages | grep foo
git branch | grep packages | grep bar

npm start -- upload
npm start -- status

echo 'console.log("foo 3!");' > packages/foo/foo.js
git add packages/
git commit -m 'update foo again'

npm start -- status
npm start -- mirror

npm start -- status
npm start -- upload

npm start -- status
