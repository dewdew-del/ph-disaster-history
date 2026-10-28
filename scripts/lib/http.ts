// Small fetch helpers for the data scripts: polite User-Agent, retries, and a delay.

export const USER_AGENT = "PHDisasterHistory/1.0 (portfolio project; https://github.com/dewdew-del)";

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type FetchOptions = { retries?: number; headers?: Record<string, string> };

export async function fetchWithRetry(url: string, { retries = 4, headers = {} }: FetchOptions = {}): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response | undefined;
    try {
      res = await fetch(url, { headers: { "User-Agent": USER_AGENT, ...headers } });
    } catch (err) {
      lastError = err; // network error: retry
    }
    if (res) {
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status} for ${url}`);
      // Only 429 (rate limit) and 5xx are worth retrying.
      if (res.status !== 429 && res.status < 500) throw lastError;
    }
    if (attempt < retries) {
      const wait = 2000 * 2 ** attempt;
      console.warn(`  retry ${attempt + 1}/${retries} in ${wait / 1000}s: ${url}`);
      await sleep(wait);
    }
  }
  throw lastError;
}

export async function fetchJson<T>(url: string, options?: FetchOptions): Promise<T> {
  const res = await fetchWithRetry(url, options);
  return (await res.json()) as T;
}
