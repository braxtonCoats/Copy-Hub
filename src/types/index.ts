export interface CopyItem {
  id: string;
  key: string;
  figmaText: string;
  savedText: string;
  lastSynced: string | null;
  status: 'synced' | 'modified' | 'new';
}

export interface Page {
  id: string;
  name: string;
  path: string;
  copyItems: CopyItem[];
  lastSynced: string | null;
}

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  basePath: string;
}
