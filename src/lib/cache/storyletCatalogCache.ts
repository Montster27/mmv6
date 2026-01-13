const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_VERSION = "v1";

type CacheEntry<T> = {
  fetched_at: number;
  stamp: string | null;
  data: T;
};

function cacheKey(seasonIndex?: number) {
  return `storyletCatalog:${CACHE_VERSION}:${seasonIndex ?? "global"}`;
}

function readCache<T>(seasonIndex?: number): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(seasonIndex));
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

function writeCache<T>(seasonIndex: number | undefined, entry: CacheEntry<T>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cacheKey(seasonIndex), JSON.stringify(entry));
  } catch {
    // ignore
  }
}

export async function fetchStoryletCatalog<T>(
  seasonIndex: number | undefined,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = readCache<T>(seasonIndex);
  const now = Date.now();
  if (cached && now - cached.fetched_at < CACHE_TTL_MS) {
    return cached.data;
  }

  const stampRes = await fetch("/api/content/stamp");
  const stampJson = stampRes.ok ? await stampRes.json() : { stamp: null };
  const stamp = typeof stampJson.stamp === "string" ? stampJson.stamp : null;

  if (cached && cached.stamp && stamp && cached.stamp === stamp) {
    const refreshed = { ...cached, fetched_at: now };
    writeCache(seasonIndex, refreshed);
    return cached.data;
  }

  const data = await fetcher();
  writeCache(seasonIndex, { fetched_at: now, stamp, data });
  return data;
}
