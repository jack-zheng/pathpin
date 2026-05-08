export interface Bookmark {
  id: string;
  title: string;
  path: string;
  usageCount: number;
  createdAt: string;
}

export interface Rule {
  id: string;
  type: 'url_contains' | 'title_contains';
  value: string;
}

export interface StorageData {
  bookmarks: Bookmark[];
  rules: Rule[];
}
