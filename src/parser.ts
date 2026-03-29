import { load, CheerioAPI } from 'cheerio';
import type { Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';
import type {
  OrganicResult,
  SiteLink,
  FeaturedSnippet,
  PaidResult,
  PeopleAlsoAskItem,
  SearchResultRecord,
} from './types';

// ---- Helpers ----

/**
 * Strips Google's redirect wrapper from hrefs.
 * e.g. /url?q=https://example.com&sa=U&... → https://example.com
 */
function cleanUrl(href: string): string {
  if (!href) return '';
  if (href.startsWith('/url?')) {
    const match = href.match(/[?&]q=([^&]+)/);
    if (match) {
      try {
        return decodeURIComponent(match[1]!);
      } catch {
        return match[1]!;
      }
    }
  }
  if (href.startsWith('http')) return href;
  return '';
}

/** Extracts text from <em> tags within an element — these are keyword highlights. */
function extractEmphasisedKeywords($: CheerioAPI, el: Cheerio<AnyNode>): string[] {
  const kws: string[] = [];
  el.find('em').each((_, em) => {
    const t = $(em).text().trim();
    if (t) kws.push(t);
  });
  return [...new Set(kws)];
}

/** Get inner text, collapsing whitespace */
function text($el: Cheerio<AnyNode>): string {
  return $el.text().replace(/\s+/g, ' ').trim();
}

// ---- Organic results ----

/**
 * Extracts organic (non-ad) search results.
 *
 * Google changes its HTML structure frequently.  We use a layered approach:
 *  1. Find result containers via multiple candidate selectors.
 *  2. Within each container, probe several sub-selectors for title / URL / snippet.
 *  3. Skip entries that look like ads or that produce no usable URL.
 */
function parseOrganicResults($: CheerioAPI): OrganicResult[] {
  const results: OrganicResult[] = [];

  // Candidate container selectors, tried in order
  const containerSelectors = [
    'div#search div.g:not([data-hveid]) > div',  // classic layout
    'div#search div.g',                           // broad fallback
    'div#rso > div',                              // results section children
    'div[data-sokoban-container]',               // sometimes used
  ];

  let containers = $();
  for (const sel of containerSelectors) {
    containers = $(sel);
    if (containers.length > 1) break;
  }

  if (!containers.length) {
    console.warn('[parser] No organic result containers found — selectors may need updating');
    return results;
  }

  containers.each((_, el) => {
    const container = $(el);

    // Skip ads: they have data-text-ad or contain "Sponsored"
    if (
      container.attr('data-text-ad') ||
      container.find('[data-text-ad]').length ||
      container.find('span:contains("Sponsored")').length
    ) {
      return;
    }

    // Title
    const titleEl = container.find('h3').first();
    if (!titleEl.length) return; // not a result block

    const title = text(titleEl);
    if (!title) return;

    // URL — first <a> that points to an external site
    let url = '';
    container.find('a[href]').each((_, a) => {
      if (url) return;
      const href = cleanUrl($(a).attr('href') ?? '');
      if (href.startsWith('http')) url = href;
    });
    if (!url) return;

    // Displayed URL (cite element)
    const displayedUrl = text(container.find('cite').first());

    // Scope snippet search to current container
    let snippetText = '';
    const snippetCandidates = [
      container.find('[data-sncf]').first(),
      container.find('.VwiC3b').first(),
      container.find('.s3v9rd').first(),
      container.find('.st').first(),
    ];
    for (const candidate of snippetCandidates) {
      if (candidate.length) {
        snippetText = text(candidate);
        break;
      }
    }
    // Last resort: grab longest span text in the container
    if (!snippetText) {
      let longest = '';
      container.find('span').each((_, span) => {
        const t = $(span).text().trim();
        if (t.length > longest.length) longest = t;
      });
      snippetText = longest;
    }
    // Remove the title text from the snippet if it leaked in
    if (snippetText.startsWith(title)) {
      snippetText = snippetText.slice(title.length).trim();
    }

    // Emphasised keywords from snippet
    const snippetContainers = snippetCandidates.filter((c) => c.length);
    const emphasizedKeywords = snippetContainers.length
      ? extractEmphasisedKeywords($, snippetContainers[0]!)
      : [];

    // Site links
    const siteLinks: SiteLink[] = [];
    container.find('table a, .usJj9c a, .jmjoTe a').each((_, a) => {
      const href = cleanUrl($(a).attr('href') ?? '');
      const t = text($(a));
      if (href && t) siteLinks.push({ title: t, url: href });
    });

    results.push({
      position: results.length + 1,
      title,
      url,
      displayedUrl,
      description: snippetText,
      emphasizedKeywords,
      siteLinks,
    });
  });

  return results;
}

// ---- Featured snippet ----

function parseFeaturedSnippet($: CheerioAPI): FeaturedSnippet | undefined {
  // Multiple possible containers for featured snippets
  const containers = [
    $('[data-attrid="wa:/description"]').first(),
    $('.xpdopen').first(),
    $('.kp-blk').first(),
    $('block-component').first(),
  ];

  for (const container of containers) {
    if (!container.length) continue;

    const titleEl = container.find('h3, [role="heading"]').first();
    const title = text(titleEl) || text($('h2.LC20lb').first());

    let url = '';
    container.find('a[href]').each((_, a) => {
      if (url) return;
      const href = cleanUrl($(a).attr('href') ?? '');
      if (href.startsWith('http')) url = href;
    });

    const description = text(container.find('span, div').not('h3').first());

    // Determine type
    let type: FeaturedSnippet['type'] = 'paragraph';
    if (container.find('ul, ol').length) type = 'list';
    else if (container.find('table').length) type = 'table';
    else if (container.find('video, [data-ytid]').length) type = 'video';

    if (description || url) {
      return { title, url, description, type };
    }
  }

  return undefined;
}

// ---- Paid results (ads) ----

function parsePaidResults($: CheerioAPI): PaidResult[] {
  const results: PaidResult[] = [];

  // Ad containers carry data-text-ad attribute or are inside #tads
  $('[data-text-ad], #tads .uEierd, #tads div.mnr-c').each((_, el) => {
    const container = $(el);
    const title = text(container.find('h3').first());
    if (!title) return;

    let url = '';
    container.find('a[href]').each((_, a) => {
      if (url) return;
      const href = cleanUrl($(a).attr('href') ?? '');
      if (href.startsWith('http')) url = href;
    });

    const displayedUrl = text(container.find('cite').first());
    const description = text(container.find('[role="text"], .MUxGbd').first());

    results.push({
      position: results.length + 1,
      title,
      url,
      displayedUrl,
      description,
    });
  });

  return results;
}

// ---- People Also Ask ----

function parsePeopleAlsoAsk($: CheerioAPI): PeopleAlsoAskItem[] {
  const questions: string[] = [];

  $('div.related-question-pair, [jsname] .dnXCYb, .CSkcDe').each((_, el) => {
    const q = $(el).text().trim();
    if (q && q.length < 300) questions.push(q);
  });

  return [...new Set(questions)].map((question) => ({ question }));
}

// ---- Related queries ----

function parseRelatedQueries($: CheerioAPI): string[] {
  const queries: string[] = [];

  // Try several known selectors for "Related searches" / "People also search for"
  $('#botstuff a, #brs a, .k8XOCe a, .s75CSd a, .AB4Wff a').each((_, a) => {
    const q = $(a).text().trim();
    if (q) queries.push(q);
  });

  return [...new Set(queries)];
}

// ---- Results count ----

function parseResultsCount($: CheerioAPI): string | undefined {
  const el = $('div#result-stats').first();
  if (!el.length) return undefined;
  // Strip the timing notice in parentheses e.g. "(0.43 seconds)"
  return el.text().replace(/\(.*?\)/g, '').trim() || undefined;
}

// ---- Has next page ----

function parseHasNextPage($: CheerioAPI): boolean {
  return (
    $('a#pnnext').length > 0 ||
    $('a[aria-label="Next"]').length > 0 ||
    $('td.b:last-child > a').length > 0
  );
}

// ---- Main entry ----

/**
 * Parses a Google SERP HTML page and returns a structured result object.
 */
export function parseSerp(
  html: string,
  queryTerm: string,
  queryUrl: string,
  pageNumber: number
): Omit<SearchResultRecord, 'scrapedAt' | 'html' | 'error'> {
  const $ = load(html);

  const organicResults = parseOrganicResults($);

  if (!organicResults.length) {
    console.warn(
      `[parser] No organic results extracted for query "${queryTerm}" page ${pageNumber}. ` +
      'Google may have changed its HTML structure — selectors may need updating.'
    );
  }

  return {
    searchQuery: { term: queryTerm, url: queryUrl },
    pageNumber,
    organicResults,
    featuredSnippet: parseFeaturedSnippet($),
    peopleAlsoAsk: parsePeopleAlsoAsk($),
    relatedQueries: parseRelatedQueries($),
    paidResults: parsePaidResults($),
    resultsCountText: parseResultsCount($),
    hasNextPage: parseHasNextPage($),
  };
}
