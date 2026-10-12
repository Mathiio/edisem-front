import type { RecitNode } from './useRecitsData';

const CACHE_KEY = 'edisem-recits-corpus-v1';
const DEFAULT_TTL_MS = 15 * 60 * 1000;

interface RecitsCorpusCacheEntry {
  savedAt: number;
  nodes: RecitNode[];
}

export function readRecitsCorpusCache(ttlMs = DEFAULT_TTL_MS): RecitNode[] | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RecitsCorpusCacheEntry;
    if (!parsed?.nodes?.length || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > ttlMs) return null;
    return parsed.nodes;
  } catch {
    return null;
  }
}

export function writeRecitsCorpusCache(nodes: RecitNode[]): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const entry: RecitsCorpusCacheEntry = { savedAt: Date.now(), nodes };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // quota / private mode
  }
}

export function clearRecitsCorpusCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
