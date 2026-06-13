/**
 * Chargement des termes Custom Vocab Omeka S (module CustomVocab).
 * Endpoint officiel : GET /api/custom_vocabs/:id — o:terms est un tableau de strings.
 */

const TERMS_CACHE: Record<number, string[]> = {};

function parseOmekaTerms(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw.split('\n').map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

/** Invalide le cache (tests / refresh forcé) */
export function clearCustomVocabCache(vocabId?: number): void {
  if (vocabId != null) delete TERMS_CACHE[vocabId];
  else Object.keys(TERMS_CACHE).forEach((k) => delete TERMS_CACHE[Number(k)]);
}

/**
 * Récupère la liste complète des termes d'un vocabulaire custom Omeka S.
 */
export async function fetchCustomVocabTerms(vocabId: number): Promise<string[]> {
  if (TERMS_CACHE[vocabId]?.length) {
    return TERMS_CACHE[vocabId];
  }

  const response = await fetch(`/omk/api/custom_vocabs/${vocabId}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} — custom_vocabs/${vocabId}`);
  }

  const data = await response.json();
  const terms = parseOmekaTerms(data?.['o:terms']).sort((a, b) => a.localeCompare(b, 'fr'));
  TERMS_CACHE[vocabId] = terms;
  return terms;
}
