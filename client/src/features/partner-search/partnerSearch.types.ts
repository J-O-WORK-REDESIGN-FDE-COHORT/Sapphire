// T010: TypeScript types for the Find a Partner feature — SCRUM-26 / SCRUM-27

export interface PartnerSearchInput {
  query?: string;
  semanticQuery?: string;
  page?: number;
  pageSize?: number;
}

export interface PartnerServiceItem {
  id: string;
  name: string;
  description: string;
  category: string;
  partnerName: string;
}

export interface HybridSearchResult {
  keywordResults: PartnerServiceItem[];
  semanticResults: PartnerServiceItem[];
  totalKeywordResults: number;
  totalSemanticResults: number;
}

export interface SearchQueryParams {
  q?: string;
  semanticQ?: string;
  page?: string;
  pageSize?: string;
}
