import type { QueryClient } from "@tanstack/react-query";

/**
 * Simple offline cache for TanStack Query.
 *
 * Persists a small allowlist of query keys to localStorage so the schedule,
 * map, FAQ and category data render instantly on reopen — even with no signal.
 * Cell service at the festival will be unreliable; this keeps the core pages usable.
 */
const STORAGE_KEY = "festival_offline_cache_v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const PERSIST_KEYS = new Set([
  "events",
  "categories",
  "map_settings",
  "faqs",
  "sponsors",
  "public-config",
]);

interface PersistedEntry {
  key: string;
  data: unknown;
  ts: number;
}

const safeParse = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

/** Hydrate cached query data into the QueryClient on app boot. */
export function hydrateOfflineCache(qc: QueryClient) {
  if (typeof window === "undefined") return;
  const entries = safeParse<PersistedEntry[]>(localStorage.getItem(STORAGE_KEY));
  if (!Array.isArray(entries)) return;
  const now = Date.now();
  for (const entry of entries) {
    if (!entry || typeof entry.key !== "string") continue;
    if (now - entry.ts > MAX_AGE_MS) continue;
    qc.setQueryData([entry.key], entry.data);
  }
}

/** Subscribe to cache changes and persist whitelisted queries. */
export function startOfflinePersistence(qc: QueryClient) {
  if (typeof window === "undefined") return () => {};
  const cache = qc.getQueryCache();
  const flush = () => {
    const entries: PersistedEntry[] = [];
    for (const q of cache.getAll()) {
      const key = q.queryKey;
      if (!Array.isArray(key) || typeof key[0] !== "string") continue;
      if (!PERSIST_KEYS.has(key[0])) continue;
      // Only persist single-segment keys (no per-id queries).
      if (key.length !== 1) continue;
      if (q.state.status !== "success" || q.state.data === undefined) continue;
      entries.push({
        key: key[0],
        data: q.state.data,
        ts: q.state.dataUpdatedAt || Date.now(),
      });
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      /* quota or private mode — ignore */
    }
  };

  const unsub = cache.subscribe(() => {
    // Debounce so we don't write on every keystroke-fast cache update.
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = window.setTimeout(flush, 500);
  });

  let flushTimer: number | null = null;
  return () => {
    if (flushTimer) clearTimeout(flushTimer);
    unsub();
  };
}
