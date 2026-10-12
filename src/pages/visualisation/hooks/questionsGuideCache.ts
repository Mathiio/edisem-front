import type { QuestionGuideItem } from './useQuestionsGuideData';
import type { QuestionsGuideCoverageRow } from '@/services/DatavisCorpus';

const CACHE_KEY = 'edisem-questions-guide-v1';
const DEFAULT_TTL_MS = 15 * 60 * 1000;

interface QuestionsGuideCacheEntry {
  savedAt: number;
  questions: QuestionGuideItem[];
  coverage: QuestionsGuideCoverageRow[];
}

export function readQuestionsGuideCache(ttlMs = DEFAULT_TTL_MS): QuestionsGuideCacheEntry | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuestionsGuideCacheEntry;
    if (!parsed?.questions?.length || typeof parsed.savedAt !== 'number') return null;
    if (!Array.isArray(parsed.coverage)) return null;
    if (Date.now() - parsed.savedAt > ttlMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeQuestionsGuideCache(
  questions: QuestionGuideItem[],
  coverage: QuestionsGuideCoverageRow[],
): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const entry: QuestionsGuideCacheEntry = { savedAt: Date.now(), questions, coverage };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // quota / private mode
  }
}

export function clearQuestionsGuideCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
