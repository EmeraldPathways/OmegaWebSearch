import { Actor } from 'apify';
import { ActorInput } from './types';
import { buildSearchUrl } from './url-builder';
import { googleGet, sleep } from './http-client';
import { parseSerp } from './parser';

// Runs `fn` over `items` with at most `concurrency` tasks in flight at once
async function withConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let i = 0;
  async function worker(): Promise<void> {
    while (i < items.length) {
      const item = items[i++]!;
      await fn(item);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
}

void (async () => {
  await Actor.init();

  const input = await Actor.getInput<ActorInput>();

  if (!input?.queries?.trim()) {
    throw new Error('Input validation failed: "queries" must be a non-empty string with at least one search term.');
  }

  const {
    queries,
    maxPagesPerQuery = 1,
    countryCode = 'us',
    languageCode = 'en',
    searchLanguage = '',
    mobileResults = false,
    saveHtml = false,
    forceExactMatch = false,
    site = '',
    quickDateRange = '',
    proxyConfiguration: proxyInput,
    maxConcurrency = 3,
  } = input;

  // Always use a proxy — Google blocks bare datacenter IPs immediately.
  // If the user supplied explicit proxy config, use that; otherwise fall back
  // to Apify's built-in proxy pool (datacenter). For best results the user
  // should configure residential proxies in the input.
  const proxyConfig = await Actor.createProxyConfiguration(
    proxyInput ?? { useApifyProxy: true }
  );

  if (!proxyInput) {
    console.warn(
      '[main] No proxyConfiguration provided — falling back to Apify datacenter proxies. ' +
      'For reliable Google scraping, set proxyConfiguration with apifyProxyGroups: ["RESIDENTIAL"] in the input.'
    );
  }

  const dataset = await Actor.openDataset();

  // Split queries: one per line; also accept full Google URLs
  const queryList = queries
    .split('\n')
    .map((q) => q.trim())
    .filter(Boolean);

  if (!queryList.length) {
    throw new Error('Input validation failed: no valid queries found after parsing the "queries" field.');
  }

  console.log(`[main] Starting scrape: ${queryList.length} quer${queryList.length === 1 ? 'y' : 'ies'}, ` +
    `${maxPagesPerQuery} page(s) each, concurrency=${maxConcurrency}`);

  await withConcurrency(queryList, maxConcurrency, async (query) => {
    // Sticky proxy session per query term keeps the same IP across pages
    const sessionId = query.replace(/\W+/g, '_').substring(0, 40);
    const proxyUrl = (await proxyConfig?.newUrl(sessionId)) ?? undefined;

    for (let page = 0; page < maxPagesPerQuery; page++) {
      // If query is already a full URL, use it directly on page 0, otherwise build
      let searchUrl: string;
      if (page === 0 && query.startsWith('http')) {
        searchUrl = query;
      } else {
        searchUrl = buildSearchUrl({
          query,
          page,
          countryCode,
          languageCode,
          searchLanguage,
          forceExactMatch,
          site,
          quickDateRange,
        });
      }

      let html: string;
      try {
        html = await googleGet(searchUrl, proxyUrl, mobileResults);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[main] Failed to fetch page ${page + 1} for query "${query}": ${errorMsg}`);
        await dataset.pushData({
          searchQuery: { term: query, url: searchUrl },
          pageNumber: page + 1,
          organicResults: [],
          featuredSnippet: undefined,
          peopleAlsoAsk: [],
          relatedQueries: [],
          paidResults: [],
          hasNextPage: false,
          scrapedAt: new Date().toISOString(),
          error: errorMsg,
        });
        break; // stop paging for this query on fetch error
      }

      const parsed = parseSerp(html, query, searchUrl, page + 1);

      await dataset.pushData({
        ...parsed,
        html: saveHtml ? html : undefined,
        scrapedAt: new Date().toISOString(),
      });

      console.log(
        `[main] Query "${query}" page ${page + 1}: ` +
        `${parsed.organicResults.length} organic, ` +
        `${parsed.paidResults.length} paid, ` +
        `${parsed.peopleAlsoAsk.length} PAA, ` +
        `hasNextPage=${parsed.hasNextPage}`
      );

      // Stop paging if Google says there's no next page
      if (!parsed.hasNextPage) break;

      // Polite delay between page fetches to avoid rate limiting
      if (page < maxPagesPerQuery - 1) {
        const delay = 1_500 + Math.floor(Math.random() * 2_500);
        await sleep(delay);
      }
    }
  });

  console.log('[main] Scrape complete.');
  await Actor.exit();
})();
