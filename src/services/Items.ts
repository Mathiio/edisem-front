import { omekaApiUrl, OMEKA_API_BASE, omekaQueryAjaxUrl, parseLooseJsonText } from '@/utils/omekaApi';

const queryAction = (action: string, extra: Record<string, string | number | undefined> = {}) =>
  omekaQueryAjaxUrl({ helper: 'Query', action, json: '1', ...extra });

// Clés de cache utilisées dans sessionStorage
const CACHE_KEYS = [
  'citations',
  'annotations',
  'bibliographies',
  'mediagraphies',
  'doctoralSchools',
  'laboratories',
  'universities',
  'actants',
  'editions',
  'seminarConfs',
  'colloqueConfs',
  'studyDayConfs',
  'allItems',
  'tools',
  'personnes',
  'recitsArtistiques',
  'keywords',
  'collections',
  'feedbacks',
  'experimentations',
  'student',
  'students',
  'recitIas',
  'elementNarratifs',
  'elementEsthetique',
  'comments',
  'recitsTechnoIndustriels',
  'recitsScientifiques',
  'recitsMediatiques',
];

const CACHE_TIMESTAMP_KEY = 'edisem_cache_timestamp';
/** Incrémenter après un changement de format API / parsing pour vider les caches session vides ou corrompus. */
const CACHE_SCHEMA_VERSION = '2026-03-ajax-json';
const CACHE_SCHEMA_KEY = 'edisem_cache_schema';

function ensureCacheSchema(): void {
  try {
    if (sessionStorage.getItem(CACHE_SCHEMA_KEY) === CACHE_SCHEMA_VERSION) return;
    CACHE_KEYS.forEach((key) => sessionStorage.removeItem(key));
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
    sessionStorage.setItem(CACHE_SCHEMA_KEY, CACHE_SCHEMA_VERSION);
  } catch {
    /* ignore */
  }
}

/**
 * Vérifie si le cache doit être vidé (si c'est un nouveau jour)
 * et vide tous les caches si nécessaire
 */
function checkAndClearDailyCache(): void {
  ensureCacheSchema();
  try {
    const today = new Date().toDateString(); // Format: "Mon Jan 01 2024"
    const lastCacheDate = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);

    // Si c'est un nouveau jour, vider tous les caches
    if (lastCacheDate !== today) {

      // Vider tous les caches
      CACHE_KEYS.forEach((key) => {
        sessionStorage.removeItem(key);
      });

      // Mettre à jour le timestamp
      sessionStorage.setItem(CACHE_TIMESTAMP_KEY, today);
    }
  } catch (error) {
    console.error('Erreur lors de la vérification du cache:', error);
  }
}

export interface Data {
  [x: string]: any;
  length: any;
  'o:id': number;
  '@id': string;
  '@type'?: string[];
}

export const getDataByClass = async (resourceClassId: number): Promise<Data[]> => {
  let page = 1;
  const perPage = 100;
  let allData: Data[] = [];
  let morePages = true;

  while (morePages) {
    try {
      const response = await fetch(
        omekaApiUrl(`${OMEKA_API_BASE}items?resource_template_id=${resourceClassId}&page=${page}&per_page=${perPage}`),
      );
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data: Data[] = await response.json();
      if (data.length > 0) {
        allData = allData.concat(data);
        page++;
      } else {
        morePages = false;
      }
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  return allData;
};

export const fetchRT = async (resourceTemplateId: number): Promise<Data[]> => {
  try {
    const response = await fetch(omekaApiUrl(`${OMEKA_API_BASE}resource_templates/${resourceTemplateId}`));
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data: Data[] = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

export const getAllProperties = async (): Promise<any[]> => {
  let page = 1;
  const perPage = 100;
  let allProperties: any[] = [];
  let morePages = true;

  while (morePages) {
    try {
      const response = await fetch(omekaApiUrl(`${OMEKA_API_BASE}properties?page=${page}&per_page=${perPage}`));
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data: any[] = await response.json();
      if (data.length > 0) {
        allProperties = allProperties.concat(data);
        page++;
      } else {
        morePages = false;
      }
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  return allProperties;
};

/**
 * Récupère le mapping term → id pour un template spécifique
 * Utilise l'endpoint PHP custom pour une seule requête SQL rapide
 * Cache par template dans sessionStorage
 */
export const getTemplatePropertiesMap = async (templateId: number): Promise<Record<string, number>> => {
  const cacheKey = `template_properties_${templateId}`;
  const cached = sessionStorage.getItem(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const response = await fetch(queryAction('getTemplateProperties', { template_id: templateId }));
  const map = await response.json();

  if (map.error) {
    console.error('[getTemplatePropertiesMap] Error:', map.error);
    return {};
  }

  sessionStorage.setItem(cacheKey, JSON.stringify(map));
  return map;
};

export async function getDataByUrl(url: string): Promise<any> {
  try {
    // Check if this is an AJAX call that should use POST
    const isAjaxCall = url.includes('/ajax?') && url.includes('helper=Query');

    let response;
    if (isAjaxCall) {
      // For AJAX calls, use GET with parameters in URL (the API expects this format)
      response = await fetch(url);
    } else {
      // Regular GET request
      response = await fetch(url);
    }

    if (!response.ok) {
      console.error(`Erreur ${response.status} ${response.statusText} pour ${url}`);
      throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
    }

    // Check if response has content
    const text = await response.text();

    if (!text || text.trim() === '') {
      console.warn(`Empty response from ${url}`);
      return [];
    }

    try {
      const data = parseLooseJsonText(text);
      if (data && typeof data === 'object' && 'error' in (data as object)) {
        console.error(`API error for ${url}:`, (data as { error?: string }).error);
        return [];
      }
      return data;
    } catch (jsonError) {
      console.error(`JSON parsing error for ${url}:`, jsonError);
      console.error('Response text (truncated):', text.slice(0, 500));
      return [];
    }
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

export async function getMediagraphies(id?: number) {
  try {
    checkAndClearDailyCache();
    const storedMediagraphies = sessionStorage.getItem('mediagraphies');

    if (storedMediagraphies) {
      const mediagraphies = JSON.parse(storedMediagraphies);
      return id ? mediagraphies.find((m: any) => String(m.id) === String(id)) : mediagraphies;
    }

    const mediagraphies = await getDataByUrl(queryAction('getMediagraphies'));
    const mediagraphiesFull = mediagraphies.map((mediagraphie: any) => ({
      ...mediagraphie,
      type: 'mediagraphie',
    }));

    sessionStorage.setItem('mediagraphies', JSON.stringify(mediagraphiesFull));
    return id ? mediagraphiesFull.find((m: any) => String(m.id) === String(id)) : mediagraphiesFull;
  } catch (error) {
    console.error('Error fetching mediagraphies:', error);
    throw new Error('Failed to fetch mediagraphies');
  }
}

export async function getActantsGlobalStats() {
  try {
    return await getDataByUrl(queryAction('getActantsGlobalStats'));
  } catch (error) {
    console.error('Error fetching global stats:', error);
    return null;
  }
}

export async function getRandomActants(limit = 12) {
  try {
    return await getDataByUrl(queryAction('getRandomActants', { limit }));
  } catch (error) {
    console.error('Error fetching random actants:', error);
    return [];
  }
}

export async function getActantDetails(id: string | number) {
  try {
    return await getDataByUrl(queryAction('getActantDetails', { id }));
  } catch (error) {
    console.error(`Error fetching actant details for ${id}:`, error);
    return null;
  }
}

export async function getActantNetwork(id: string | number) {
  try {
    return await getDataByUrl(queryAction('getActantNetwork', { id }));
  } catch (error) {
    console.error(`Error fetching actant network for ${id}:`, error);
    return { nodes: [], links: [] };
  }
}

export async function getActantsByCountry() {
  try {
    return await getDataByUrl(queryAction('getActantsByCountry'));
  } catch (error) {
    console.error('Error fetching actants by country:', error);
    return [];
  }
}

export async function getEditionDetails(id: string | number) {
  try {
    return await getDataByUrl(queryAction('getEditionDetails', { id }));
  } catch (error) {
    console.error(`Error fetching edition details for ${id}:`, error);
    return null;
  }
}

export async function getEditionsByType(type: string) {
  try {
    return await getDataByUrl(queryAction('getEditionsByType', { type }));
  } catch (error) {
    console.error(`Error fetching editions by type ${type}:`, error);
    return [];
  }
}

export async function getNavbarEditions() {
  try {
    // We don't necessarily cache this heavily in session storage as it's lightweight and critical for nav
    // But we could if we wanted to.
    const editions = await getDataByUrl(queryAction('getNavbarEditions'));
    return Array.isArray(editions) ? editions : [];
  } catch (error) {
    console.error('Error fetching navbar editions:', error);
    return [];
  }
}


export async function getAllItems() {
  try {
    checkAndClearDailyCache();
    const cachedItems = sessionStorage.getItem('allItems');
    if (cachedItems) {
      return JSON.parse(cachedItems);
    }

    const [
      mediagraphies,
      keywords,
      students,
      recherches,
      personnes,
      comments,
    ] = await Promise.all([
      getMediagraphies(),
      getKeywords(),
      getStudents(),
      getRecherches(),
      getPersonnes(),
      getComments(),
    ]);

    const allItems = [
      ...mediagraphies,
      ...keywords,
      ...students,
      ...(Array.isArray(recherches) ? recherches : []),
      ...(Array.isArray(personnes) ? personnes : []),
      ...(Array.isArray(comments) ? comments : []),
    ];
    // Essayer de mettre en cache, mais ne pas bloquer si quota dépassé
    try {
      sessionStorage.setItem('allItems', JSON.stringify(allItems));
    } catch (e) {
      console.warn('Cache allItems ignoré (quota dépassé):', e);
    }

    return allItems;
  } catch (error) {
    console.error('Erreur lors de la récupération des éléments:', error);
    throw new Error('Échec de la récupération des éléments');
  }
}

export async function getPersonnes(id?: number) {
  try {
    checkAndClearDailyCache();
    const storedPersonnes = sessionStorage.getItem('personnes');
    if (storedPersonnes) {
      const personnes = JSON.parse(storedPersonnes);
      return id ? personnes.find((p: any) => p.id === String(id)) : personnes;
    }

    const personnes = await getDataByUrl(queryAction('getPersonnes'));

    personnes.forEach((personne: any) => {
      personne.type = 'personne';
    });

    sessionStorage.setItem('personnes', JSON.stringify(personnes));
    return id ? personnes.find((p: any) => p.id === String(id)) : personnes;
  } catch (error) {
    console.error('Error fetching personnes:', error);
    throw new Error('Failed to fetch personnes');
  }
}

export async function getKeywords() {
  try {
    checkAndClearDailyCache();
    const storedKeywords = sessionStorage.getItem('keywords');

    if (storedKeywords) {
      return JSON.parse(storedKeywords);
    }

    const keywords = await getDataByUrl(queryAction('getKeywords'));

    // Add null check and default to empty array if no keywords
    const keywordsFull = (keywords || []).map((keyword: any) => ({
      ...keyword,
      type: 'keyword',
    }));

    sessionStorage.setItem('keywords', JSON.stringify(keywordsFull));
    return keywordsFull;
  } catch (error) {
    console.error('Error fetching keywords:', error);
    // Return an empty array instead of throwing an error
    return [];
  }
}

export async function getRecherches() {
  try {
    const recherches = await getDataByUrl(queryAction('getRecherches'));

    return recherches;
  } catch (error) {
    console.error('Error fetching recherches:', error);
    throw new Error('Failed to fetch recherches');
  }
}

export async function getStudents(id?: number) {
  try {
    checkAndClearDailyCache();
    const storedStudents = sessionStorage.getItem('student');

    if (storedStudents) {
      const parsedStudents = JSON.parse(storedStudents);
      return id ? parsedStudents.find((e: any) => String(e.id) === String(id)) : parsedStudents;
    }

    const students = await getDataByUrl(queryAction('getStudents'));

    const updatedStudents = students.map((student: { firstname: string; lastname: string; id: number }) => {
      return {
        ...student,
        title: student.firstname + ' ' + student.lastname,
        type: 'student',
      };
    });

    sessionStorage.setItem('students', JSON.stringify(updatedStudents));
    return id ? updatedStudents.find((e: any) => String(e.id) === String(id)) : updatedStudents;
  } catch (error) {
    console.error('Error fetching students:', error);
    throw new Error('Failed to fetch students');
  }
}

export async function getComments() {
  try {
    const data = await getDataByUrl(queryAction('getComments'));
    return data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw new Error('Failed to fetch comments');
  }
}

/** Complète actants/personnes depuis dcterms:creator quand l'API Query ne les renvoie pas. */
async function enrichRecitCardsCreators(cards: any[]): Promise<any[]> {
  if (!Array.isArray(cards) || cards.length === 0) return cards;

  const needsEnrichment = cards.filter(
    (card) =>
      (!Array.isArray(card.actants) || card.actants.length === 0) &&
      (!Array.isArray(card.personnes) || card.personnes.length === 0),
  );
  if (needsEnrichment.length === 0) return cards;

  const enrichedById = new Map<string, any>();

  await Promise.all(
    needsEnrichment.map(async (card) => {
      try {
        const response = await fetch(omekaApiUrl(`${OMEKA_API_BASE}items/${card.id}`));
        if (!response.ok) return;
        const item = await response.json();
        const creatorRefs = [
          ...(Array.isArray(item['dcterms:creator']) ? item['dcterms:creator'] : []),
          ...(Array.isArray(item['schema:agent']) ? item['schema:agent'] : []),
        ];
        const seen = new Set<number>();
        const actants = creatorRefs
          .filter((ref: any) => {
            const id = ref?.value_resource_id;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
          })
          .map((ref: any) => ({
            id: String(ref.value_resource_id),
            name: ref.display_title || `Item ${ref.value_resource_id}`,
            picture: typeof ref.thumbnail_url === 'string' ? ref.thumbnail_url : undefined,
          }));

        if (actants.length > 0) {
          enrichedById.set(String(card.id), { ...card, actants, personnes: actants });
        }
      } catch (error) {
        console.error(`[enrichRecitCardsCreators] Item ${card.id}:`, error);
      }
    }),
  );

  if (enrichedById.size === 0) return cards;
  return cards.map((card) => enrichedById.get(String(card.id)) ?? card);
}

export async function getRecitsCitoyensCards() {
  try {
    const data = await getDataByUrl(queryAction('getRecitsCitoyensCards'));
    return enrichRecitCardsCreators(data);
  } catch (error) {
    console.error('Error fetching recits citoyens cards:', error);
    return [];
  }
}

export async function getOutilsCards() {
  try {
    const data = await getDataByUrl(queryAction('getOutilsCards'));
    return data;
  } catch (error) {
    console.error('Error fetching outils cards:', error);
    return [];
  }
}

export async function getRecitsMediatiquesCards() {
  try {
    const data = await getDataByUrl(queryAction('getRecitsMediatiquesCards'));
    return enrichRecitCardsCreators(data);
  } catch (error) {
    console.error('Error fetching recits mediatiques cards:', error);
    return [];
  }
}

export async function getRecitsScientifiquesCards() {
  try {
    const data = await getDataByUrl(queryAction('getRecitsScientifiquesCards'));
    return enrichRecitCardsCreators(data);
  } catch (error) {
    console.error('Error fetching recits scientifiques cards:', error);
    return [];
  }
}

export async function getRecitsTechnoCards() {
  try {
    const data = await getDataByUrl(queryAction('getRecitsTechnoCards'));
    return enrichRecitCardsCreators(data);
  } catch (error) {
    console.error('Error fetching recits techno cards:', error);
    return [];
  }
}

export async function getRecitsArtistiquesCards() {
  try {
    const data = await getDataByUrl(queryAction('getRecitsArtistiquesCards'));
    return enrichRecitCardsCreators(data);
  } catch (error) {
    console.error('Error fetching recits artistiques cards:', error);
    return [];
  }
}

export async function getExperimentationCards() {
  try {
    return await getDataByUrl(queryAction('getExperimentationCards'));
  } catch (error) {
    console.error('Error fetching experimentation cards:', error);
    throw new Error('Failed to fetch experimentation cards');
  }
}

/**
 * Get cards filtered by Edition ID
 * @param editionId - Edition resource ID
 * @returns Array of standardized card data
 */
export async function getCardsByEdition(editionId: string | number) {
  try {
    return await getDataByUrl(queryAction('getCardsByEdition', { editionId }));
  } catch (error) {
    console.error('Error fetching cards by edition:', error);
    return [];
  }
}

/**
 * Get cards filtered by Actant (Intervenant) ID
 * @param actantId - Actant resource ID
 * @param types - Optional filter by resource types (e.g., ['seminaire', 'experimentation'])
 * @returns Array of standardized card data
 */
export async function getCardsByActant(actantId: string | number, types: string[] = []) {
  try {
    return await getDataByUrl(
      queryAction('getCardsByActant', {
        actantId,
        ...(types.length > 0 ? { types: types.join(',') } : {}),
      }),
    );
  } catch (error) {
    console.error('Error fetching cards by actant:', error);
    return [];
  }
}

export async function getCardsByPersonne(personneId: string | number) {
  try {
    return await getDataByUrl(queryAction('getCardsByPersonne', { personneId }));
  } catch (error) {
    console.error('Error fetching cards by personne:', error);
    return [];
  }
}

/**
 * Get cards filtered by Keyword (Concept) ID
 * @param keywordId - Keyword resource ID
 * @param limit - Maximum number of cards to return (default: 8)
 * @returns Array of standardized card data
 */

export async function getResourceCardsByKeyword(keywordId: string | number, limit: number = 12) {
  try {
    return await getDataByUrl(queryAction('getResourceCardsByKeyword', { keywordId, limit }));
  } catch (error) {
    console.error('Error fetching resource cards by keyword:', error);
    return [];
  }
}

export async function advancedSearch(query: string, types: string[] = []) {
  try {
    return await getDataByUrl(
      queryAction('advancedSearch', {
        query,
        ...(types.length > 0 ? { types: types.join(',') } : {}),
      }),
    );
  } catch (error) {
    console.error('Error in advanced search:', error);
    return [];
  }
}
