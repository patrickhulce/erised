interface BoundarySet {
  boundary: string;
  changedFiles: string[];
}

function determineBoundary(boundaryRules: string[], changedFile: string): BoundarySet | undefined {
  const fileParts = changedFile.split('/').filter(Boolean);

  // Search for a matching rule, most specific to least specific.
  for (const rule of boundaryRules.sort((a, b) => b.length - a.length)) {
    const ruleParts = rule.split('/').filter(Boolean);

    // If the rule is longer than the file, it can't match. Skip.
    if (ruleParts.length > fileParts.length) continue;

    // Otherwise we want to check that each segment matches.
    const match: string[] = [];
    for (let i = 0; i < fileParts.length; i++) {
      if (fileParts[i] === ruleParts[i]) match.push(fileParts[i]);
      else if (ruleParts[i] === '*') match.push(fileParts[i]);
    }

    if (match.length === ruleParts.length)
      return {boundary: match.join('/'), changedFiles: [changedFile]};
  }
}

export function determineBoundaries(
  boundaryRules: string[],
  changedFiles: string[],
): Array<BoundarySet> {
  const boundariesByName = new Map<string, BoundarySet>();
  const catchallBoundary = {boundary: '*', changedFiles: []};

  for (const changedFile of changedFiles) {
    const {boundary} = determineBoundary(boundaryRules, changedFile) ?? catchallBoundary;
    const existingChangedFiles = boundariesByName.get(boundary)?.changedFiles ?? [];
    boundariesByName.set(boundary, {
      boundary,
      changedFiles: [...existingChangedFiles, changedFile],
    });
  }

  return Array.from(boundariesByName.values()).sort((a, b) => a.boundary.localeCompare(b.boundary));
}

export function getBoundaryBranchName(boundary: string, context: {currentBranch: string}): string {
  const cleanedBoundary = boundary.replace(/[^a-z0-9]+/g, '_');
  return `${context.currentBranch}.erised.${cleanedBoundary}`;
}

export function filterBoundaryBranches(
  allBranches: string[],
  context: {currentBranch: string},
): string[] {
  return allBranches.filter(branch => branch.startsWith(`${context.currentBranch}.erised.`));
}
