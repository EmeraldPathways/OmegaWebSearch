import { SearchUrlParams } from './types';

/**
 * Maps ISO 3166-1 alpha-2 country codes to the corresponding Google TLD.
 * Falls back to "com" for any unknown code.
 */
const COUNTRY_TO_TLD: Record<string, string> = {
  us: 'com',
  gb: 'co.uk',
  uk: 'co.uk',
  au: 'com.au',
  ca: 'ca',
  de: 'de',
  fr: 'fr',
  es: 'es',
  it: 'it',
  nl: 'nl',
  be: 'be',
  at: 'at',
  ch: 'ch',
  pl: 'pl',
  pt: 'pt',
  br: 'com.br',
  mx: 'com.mx',
  ar: 'com.ar',
  co: 'com.co',
  cl: 'cl',
  ru: 'ru',
  ua: 'com.ua',
  in: 'co.in',
  jp: 'co.jp',
  kr: 'co.kr',
  cn: 'com.hk', // google.cn is inaccessible; use HK as proxy
  hk: 'com.hk',
  tw: 'com.tw',
  sg: 'com.sg',
  my: 'com.my',
  ph: 'com.ph',
  id: 'co.id',
  th: 'co.th',
  vn: 'com.vn',
  za: 'co.za',
  ng: 'com.ng',
  eg: 'com.eg',
  tr: 'com.tr',
  il: 'co.il',
  sa: 'com.sa',
  ae: 'ae',
  pk: 'com.pk',
  bd: 'com.bd',
  nz: 'co.nz',
  se: 'se',
  no: 'no',
  dk: 'dk',
  fi: 'fi',
  cz: 'cz',
  hu: 'hu',
  ro: 'ro',
  sk: 'sk',
  gr: 'gr',
  bg: 'bg',
  hr: 'hr',
  rs: 'rs',
};

function getTld(countryCode: string): string {
  return COUNTRY_TO_TLD[countryCode.toLowerCase()] ?? 'com';
}

/**
 * Maps ISO language codes to Google's lr= parameter values.
 * See: https://developers.google.com/custom-search/v1/reference/rest/v1/cse/list
 */
function buildLrParam(lang: string): string {
  if (!lang) return '';
  // Google expects "lang_XX" format
  return `lang_${lang}`;
}

/**
 * Builds a full Google Search URL from the given parameters.
 */
export function buildSearchUrl(params: SearchUrlParams): string {
  const {
    query,
    page,
    countryCode,
    languageCode,
    searchLanguage,
    forceExactMatch,
    site,
    quickDateRange,
  } = params;

  const tld = getTld(countryCode);
  // Use http:// so the proxy handles as a plain request without CONNECT tunneling.
  // Apify's proxy infrastructure fetches the content and returns it directly.
  const base = `http://www.google.${tld}/search`;

  let q = query.trim();

  // Apply site: operator
  if (site) {
    q = `${q} site:${site.trim()}`;
  }

  // Wrap in quotes for exact match
  if (forceExactMatch) {
    q = `"${q}"`;
  }

  const urlParams = new URLSearchParams();
  urlParams.set('q', q);
  urlParams.set('num', '10');
  urlParams.set('hl', languageCode || 'en');
  urlParams.set('gl', countryCode.toLowerCase() || 'us');
  urlParams.set('safe', 'off');
  // Prevent Google from redirecting based on detected location
  urlParams.set('pws', '0');
  // Disable personalisation
  urlParams.set('nfpr', '1');

  if (page > 0) {
    urlParams.set('start', String(page * 10));
  }

  if (searchLanguage) {
    urlParams.set('lr', buildLrParam(searchLanguage));
  }

  if (quickDateRange) {
    urlParams.set('tbs', `qdr:${quickDateRange}`);
  }

  return `${base}?${urlParams.toString()}`;
}
