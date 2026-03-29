function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  apiSecretKey: requireEnv('API_SECRET_KEY'),
  apifyToken: requireEnv('APIFY_TOKEN'),
  apifyActorId: process.env.APIFY_ACTOR_ID ?? 'YOUR_USERNAME/google-search-scraper',
  apifyRunTimeoutSecs: Number(process.env.APIFY_RUN_TIMEOUT_SECS ?? 120),
  maxConcurrentRuns: Number(process.env.MAX_CONCURRENT_APIFY_RUNS ?? 3),
};
