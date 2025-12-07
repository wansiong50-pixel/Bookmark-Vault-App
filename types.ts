export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  imageUrl?: string;
  tags: string[];
  collectionId: string; // 'all', 'favorites', or user defined
  isPrivate: boolean;
  isPinned: boolean;
  createdAt: number;
  note?: string;
}

export interface Collection {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string;
}

export interface UserPreferences {
  viewMode: 'grid' | 'list';
  sortBy: 'date' | 'name';
  privateModeUnlocked: boolean;
}

export interface AISearchResult {
  title: string;
  description: string;
  tags: string[];
}
