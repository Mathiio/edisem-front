/**
 * Chargement des termes Custom Vocab Omeka S (module CustomVocab).
 * GET /api/custom_vocabs/:id — o:terms (liste statique) ou o:item_set (titres des items du jeu).
 */

import { omekaApiUrl, OMEKA_API_BASE } from '@/utils/omekaApi';

const TERMS_CACHE: Record<string, string[]> = {};

function termsCacheKey(vocabId: number, resourceTemplateId?: number): string {
  return resourceTemplateId != null ? `${vocabId}:tpl${resourceTemplateId}` : String(vocabId);
}

async function fetchTermsFromItemSet(itemSetId: number, resourceTemplateId?: number): Promise<string[]> {
  const params = new URLSearchParams({
    item_set_id: String(itemSetId),
    per_page: '500',
  });
  if (resourceTemplateId != null) {
    params.set('resource_template_id', String(resourceTemplateId));
  }
  const response = await fetch(omekaApiUrl(`${OMEKA_API_BASE}items?${params.toString()}`));
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} — items (item_set ${itemSetId})`);
  }
  const items = await response.json();
  if (!Array.isArray(items)) return [];
  return items
    .map((item: { 'o:title'?: string }) => String(item['o:title'] ?? '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'fr'));
}

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
  if (vocabId != null) {
    Object.keys(TERMS_CACHE).forEach((k) => {
      if (k === String(vocabId) || k.startsWith(`${vocabId}:`)) delete TERMS_CACHE[k];
    });
  } else {
    Object.keys(TERMS_CACHE).forEach((k) => delete TERMS_CACHE[k]);
  }
}

/**
 * Récupère la liste complète des termes d'un vocabulaire custom Omeka S.
 */
export async function fetchCustomVocabTerms(
  vocabId: number,
  options?: { resourceTemplateId?: number },
): Promise<string[]> {
  const cacheKey = termsCacheKey(vocabId, options?.resourceTemplateId);
  if (TERMS_CACHE[cacheKey]?.length) {
    return TERMS_CACHE[cacheKey];
  }

  const response = await fetch(omekaApiUrl(`${OMEKA_API_BASE}custom_vocabs/${vocabId}`));
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} — custom_vocabs/${vocabId}`);
  }

  const data = await response.json();
  let terms = parseOmekaTerms(data?.['o:terms']);

  if (terms.length === 0) {
    const itemSetId = data?.['o:item_set']?.['o:id'];
    if (typeof itemSetId === 'number') {
      terms = await fetchTermsFromItemSet(itemSetId, options?.resourceTemplateId);
    }
  }

  terms.sort((a, b) => a.localeCompare(b, 'fr'));
  TERMS_CACHE[cacheKey] = terms;
  return terms;
}
