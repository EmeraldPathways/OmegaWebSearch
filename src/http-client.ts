import * as http from 'node:http';
import * as https from 'node:https';

// ---- User Agents ----

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/136.0.6478.72 Mobile Safari/537.36';

function chromeVersion(ua: string): string {
  const m = ua.match(/Chrome\/(\d+)/);
  return m ? m[1]! : '136';
}

function secChUa(ver: string, mobile: boolean): string {
  if (mobile) {
    return `"Android WebView";v="${ver}", "Chromium";v="${ver}", "Google Chrome";v="${ver}"`;
  }
  return `"Not/A)Brand";v="8", "Chromium";v="${ver}", "Google Chrome";v="${ver}"`;
}

// ---- Cookie/consent handling ----

function buildConsentCookie(): string {
  return 'SOCS=CAI; CONSENT=YES+cb.20240101-08-p0.en+FX+410; 1P_JAR=2024-01-01-08';
}

function isConsentPage(html: string): boolean {
  // Only trigger on the actual consent gate — real SERPs reference consent.google.com in JS
  return html.includes('Before you continue to Google');
}

function isCaptchaPage(html: string): boolean {
  return (
    html.includes('detected unusual traffic') ||
    html.includes('recaptcha') ||
    html.includes('/sorry/index') ||
    html.includes('httpservice/retry/enablejs')
  );
}

// ---- Proxy URL parser ----

interface ProxyParts {
  host: string;
  port: number;
  auth: string | undefined;
}

function parseProxy(proxyUrl: string): ProxyParts {
  const u = new URL(proxyUrl);
  return {
    host: u.hostname,
    port: Number(u.port) || 8011,
    auth: u.username ? `${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}` : undefined,
  };
}

// ---- HTTP request (supports both direct and HTTP proxy) ----

function httpGet(
  targetUrl: string,
  proxy: ProxyParts | undefined,
  headers: Record<string, string>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const isHttps = parsed.protocol === 'https:';

    const reqOptions: http.RequestOptions = {
      method: 'GET',
      headers: { ...headers },
    };

    if (proxy) {
      // Route through HTTP proxy: connect to proxy, use absolute URL as path
      reqOptions.host = proxy.host;
      reqOptions.port = proxy.port;
      reqOptions.path = targetUrl; // absolute-form request target
      if (proxy.auth) {
        (reqOptions.headers as Record<string, string>)['Proxy-Authorization'] =
          'Basic ' + Buffer.from(proxy.auth).toString('base64');
      }
      (reqOptions.headers as Record<string, string>)['Host'] = parsed.hostname;
    } else {
      reqOptions.host = parsed.hostname;
      reqOptions.port = Number(parsed.port) || (isHttps ? 443 : 80);
      reqOptions.path = parsed.pathname + parsed.search;
    }

    const mod = (proxy || !isHttps) ? http : https;

    const req = mod.request(reqOptions, (res) => {
      // Follow redirects (up to 3)
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const location = res.headers.location;
        res.resume(); // drain
        httpGet(location, proxy, headers).then(resolve, reject);
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        if (res.statusCode === 429 || res.statusCode === 503) {
          reject(new Error(`HTTP ${res.statusCode} for ${targetUrl}`));
        } else {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30_000, () => {
      req.destroy(new Error(`Request timeout for ${targetUrl}`));
    });
    req.end();
  });
}

// ---- Main export ----

export async function googleGet(
  url: string,
  proxyUrl?: string,
  isMobile = false,
  retries = 3
): Promise<string> {
  const ua = isMobile ? MOBILE_UA : DESKTOP_UA;
  const ver = chromeVersion(ua);

  const headers: Record<string, string> = {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'sec-ch-ua': secChUa(ver, isMobile),
    'sec-ch-ua-mobile': isMobile ? '?1' : '?0',
    'sec-ch-ua-platform': isMobile ? '"Android"' : '"Windows"',
    'sec-fetch-site': 'none',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-dest': 'document',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'Cache-Control': 'max-age=0',
    'Cookie': buildConsentCookie(),
  };

  const proxy = proxyUrl ? parseProxy(proxyUrl) : undefined;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const html = await httpGet(url, proxy, headers);
      console.log(`[http-client] ${url} → OK`);

      if (isCaptchaPage(html)) {
        throw new Error(
          `Google returned a CAPTCHA/rate-limit page for "${url}". ` +
          'Try using residential proxies (set proxyConfiguration in actor input).'
        );
      }

      if (isConsentPage(html)) {
        console.warn('[http-client] Consent page detected — retrying with consent cookie…');
        lastError = new Error(`Consent page for ${url}`);
        await sleep(2_000);
        continue;
      }

      return html;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        const isRateLimit = lastError.message.startsWith('HTTP 429') || lastError.message.startsWith('HTTP 503');
        const delay = isRateLimit ? 15_000 * Math.pow(2, attempt) : 2_000 * (attempt + 1);
        console.warn(
          `[http-client] Attempt ${attempt + 1}/${retries + 1} failed: ` +
          `${lastError.message.substring(0, 160)} — retrying in ${Math.round(delay / 1000)}s`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error(`All ${retries + 1} attempts failed for ${url}`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
