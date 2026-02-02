export type SearchResultType = 'lead' | 'client' | 'service' | 'liability' | 'litigation';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  route: string;
}

export interface GroupedSearchResults {
  leads: SearchResult[];
  clients: SearchResult[];
  services: SearchResult[];
  liabilities: SearchResult[];
  litigation: SearchResult[];
}
