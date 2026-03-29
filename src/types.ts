// ---- Actor Input ----

export interface ActorInput {
  /** Newline-separated search queries or full Google Search URLs */
  queries: string;
  /** Pages to scrape per query (~10 organic results per page) */
  maxPagesPerQuery?: number;
  /** Google domain country code, e.g. "us" → google.com, "de" → google.de */
  countryCode?: string;
  /** Interface language (hl param), e.g. "en", "de" */
  languageCode?: string;
  /** Restrict results to a language (lr param), e.g. "en", "de" */
  searchLanguage?: string;
  /** Use mobile User-Agent and mobile SERP */
  mobileResults?: boolean;
  /** Save raw HTML in the dataset record */
  saveHtml?: boolean;
  /** Wrap query in quotes for exact-match search */
  forceExactMatch?: boolean;
  /** Restrict to site, e.g. "reddit.com" */
  site?: string;
  /** Quick date range filter, e.g. "d7", "m1", "y1" */
  quickDateRange?: string;
  /** Apify proxy configuration */
  proxyConfiguration?: Record<string, unknown>;
  /** Max parallel queries in flight */
  maxConcurrency?: number;
}

// ---- URL Builder ----

export interface SearchUrlParams {
  query: string;
  /** 0-based page index */
  page: number;
  countryCode: string;
  languageCode: string;
  searchLanguage: string;
  forceExactMatch: boolean;
  site: string;
  quickDateRange: string;
}

// ---- Parser Output ----

export interface OrganicResult {
  position: number;
  title: string;
  url: string;
  displayedUrl: string;
  description: string;
  emphasizedKeywords: string[];
  siteLinks: SiteLink[];
}

export interface SiteLink {
  title: string;
  url: string;
}

export interface FeaturedSnippet {
  title: string;
  url: string;
  description: string;
  type: 'paragraph' | 'list' | 'table' | 'video' | 'unknown';
}

export interface PaidResult {
  position: number;
  title: string;
  url: string;
  displayedUrl: string;
  description: string;
}

export interface PeopleAlsoAskItem {
  question: string;
}

// ---- Dataset Record ----

export interface SearchResultRecord {
  searchQuery: {
    term: string;
    url: string;
  };
  pageNumber: number;
  organicResults: OrganicResult[];
  featuredSnippet?: FeaturedSnippet;
  peopleAlsoAsk: PeopleAlsoAskItem[];
  relatedQueries: string[];
  paidResults: PaidResult[];
  resultsCountText?: string;
  hasNextPage: boolean;
  scrapedAt: string;
  html?: string;
  error?: string;
}
