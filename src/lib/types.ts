export interface Bookmark {
  id: string;
  user_id: string;
  url: string;
  title: string;
  description: string | null;
  favicon_url: string | null;
  created_at: string;
}

export interface UrlMetadata {
  title: string;
  description: string | null;
  favicon_url: string | null;
}
