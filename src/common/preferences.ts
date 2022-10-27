export interface Preferences {
  boundaryRules: string[];
}

export async function readPreferences(): Promise<Preferences> {
  return {
    boundaryRules: ['apps/*', 'packages/*', 'workspaces/*'],
  };
}
