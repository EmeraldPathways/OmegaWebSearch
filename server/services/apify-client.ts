import { config } from '../config';
import { AppError, SearchRequest } from '../types';

// Copied from src/url-builder.ts to avoid cross-rootDir TypeScript complications.
// Keep in sync if src/url-builder.ts changes.
const COUNTRY_TO_TLD: Record<string, string> = {
  us: 'com', gb: 'co.uk', uk: 'co.uk', au: 'com.au', ca: 'ca',
  de: 'de', fr: 'fr', es: 'es', it: 'it', nl: 'nl', be: 'be',
  at: 'at', ch: 'ch', pl: 'pl', pt: 'pt', br: 'com.br', mx: 'com.mx',
  ar: 'com.ar', co: 'com.co', cl: 'cl', ru: 'ru', ua: 'com.ua',
  in: 'co.in', jp: 'co.jp', kr: 'co.kr', cn: 'com.hk', hk: 'com.hk',
  tw: 'com.tw', sg: 'com.sg', my: 'com.my', ph: 'com.ph', id: 'co.id',
  th: 'co.th', vn: 'com.vn', za: 'co.za', ng: 'com.ng', eg: 'com.eg',
  tr: 'com.tr', il: 'co.il', sa: 'com.sa', ae: 'ae', pk: 'com.pk',
  bd: 'com.bd', nz: 'co.nz', se: 'se', no: 'no', dk: 'dk', fi: 'fi',
  cz: 'cz', hu: 'hu', ro: 'ro', sk: 'sk', gr: 'gr', bg: 'bg',
  hr: 'hr', rs: 'rs', ie: 'ie',
};

function buildGoogleUrl(q: string, page: number, countryCode: string, languageCode: string): string {
  const tld = COUNTRY_TO_TLD[countryCode.toLowerCase()] ?? 'com';
  const params = new URLSearchParams();
  params.set('q', q.trim());
  params.set('num', '10');
  params.set('hl', languageCode || 'en');
  params.set('gl', countryCode.toLowerCase() || 'us');
  params.set('safe', 'off');
  params.set('pws', '0');
  params.set('nfpr', '1');
  if (page > 0) params.set('start', String(page * 10));
  return `http://www.google.${tld}/search?${params.toString()}`;
}

export async function runActorSearch(req: SearchRequest): Promise<unknown> {
  const { q, page, countryCode, languageCode } = req;

  // Pass a pre-built Google URL so the actor uses it directly (handles pagination offset)
  const googleUrl = buildGoogleUrl(q, page, countryCode, languageCode);

  const apifyUrl =
    `https://api.apify.com/v2/acts/${encodeURIComponent(config.apifyActorId)}` +
    `/run-sync-get-dataset-items` +
    `?token=${config.apifyToken}&timeout=${config.apifyRunTimeoutSecs}`;

  const body = {
    queries: googleUrl,
    maxPagesPerQuery: 1,
    countryCode,
    languageCode,
    proxyConfiguration: {
      useApifyProxy: true,
      apifyProxyGroups: ['GOOGLE_SERP'],
    },
  };

  let res: Response;
  try {
    res = await fetch(apifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout((config.apifyRunTimeoutSecs + 10) * 1000),
    });
  } catch (err) {
    throw new AppError('APIFY_UNREACHABLE', 'Could not reach Apify API', 502);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AppError('APIFY_ERROR', `Apify returned ${res.status}: ${text}`, 502);
  }

  const items = (await res.json()) as unknown[];

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('NO_RESULTS', 'Apify actor returned no results', 404);
  }

  return items[0];
}
