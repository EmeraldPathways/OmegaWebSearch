let apiKey = null;

async function getApiKey() {
  if (!apiKey) {
    const res = await fetch('/config');
    const json = await res.json();
    apiKey = json.apiKey;
  }
  return apiKey;
}

export async function search({ q, page = 0, countryCode = 'us', languageCode = 'en' }) {
  const key = await getApiKey();
  const params = new URLSearchParams({ q, page: String(page), countryCode, languageCode });
  const res = await fetch(`/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? 'Search failed');
  return json.data;
}
