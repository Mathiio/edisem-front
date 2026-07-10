/**
 * Service pour l'API espace utilisateur Edisem (étudiants, actants, admin)
 * Endpoints via UserSpaceViewHelper
 */

import { TEMPLATE_ID_TO_TYPE, filterMonEspaceResources, getCascadeDeleteWithParentTemplateIds, isParentLinkedOnlyResourceType, resolveResourceTypeFromOmekaItem } from '@/config/resourceConfig';
import { getYouTubeThumbnail, isOmekaPlaceholderThumbnail, resolveOmekaThumbnail } from '@/lib/resourceUtils';
import { ApiProxy } from '@/services/ApiProxy';
import { omekaApiUrl, OMEKA_API_BASE } from '@/utils/omekaApi';

const API_BASE = 'https://tests.arcanes.ca/omk/s/edisem/page/ajax?helper=UserSpace';

/** Propriétés Omeka susceptibles de contenir une URL vidéo ou image */
const MEDIA_URL_PROPERTIES = [
  'schema:url',
  'dcterms:identifier',
  'bibo:uri',
  'schema:associatedMedia',
  'schema:contentUrl',
  'oa:hasRelatedResource',
  'schema:embedUrl',
];

function normalizeOmekaMediaUrl(url: string | null | undefined): string | null {
  return resolveOmekaThumbnail(url);
}

function collectUrlsFromOmekaProperties(item: Record<string, any>): string[] {
  const urls: string[] = [];

  for (const prop of MEDIA_URL_PROPERTIES) {
    const values = item[prop];
    if (!Array.isArray(values)) continue;

    for (const v of values) {
      if (v?.type === 'uri' && typeof v['@id'] === 'string') {
        urls.push(v['@id']);
      }
      if (typeof v?.['@value'] === 'string' && v['@value'].startsWith('http')) {
        urls.push(v['@value']);
      }
      if (typeof v?.url === 'string' && v.url.startsWith('http')) {
        urls.push(v.url);
      }
    }
  }

  return urls;
}

/**
 * Extrait la meilleure miniature disponible depuis un item Omeka S (liste ou détail)
 */
function extractThumbnailFromOmekaItem(item: Record<string, any>): string | null {
  const displayUrls = item['thumbnail_display_urls'];
  const fromDisplay = normalizeOmekaMediaUrl(
    displayUrls?.square || displayUrls?.medium || displayUrls?.large,
  );
  if (fromDisplay) return fromDisplay;

  const primaryMedia = item['o:primary_media'];
  const fromPrimary = normalizeOmekaMediaUrl(
    primaryMedia?.['thumbnail_display_urls']?.square ||
      primaryMedia?.['thumbnail_display_urls']?.medium ||
      primaryMedia?.['thumbnail_display_urls']?.large,
  );
  if (fromPrimary) return fromPrimary;

  for (const url of collectUrlsFromOmekaProperties(item)) {
    const ytThumb = getYouTubeThumbnail(url);
    if (ytThumb) return ytThumb;
    if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)) return url;
  }

  return null;
}

function extractExternalUrlFromOmekaItem(item: Record<string, any>): string | null {
  for (const url of collectUrlsFromOmekaProperties(item)) {
    if (getYouTubeThumbnail(url)) return url;
  }
  return collectUrlsFromOmekaProperties(item)[0] ?? null;
}

/**
 * Charge la miniature depuis le premier média attaché (o:media) si absent de la réponse liste
 */
async function enrichThumbnailFromMedia(item: Record<string, any>): Promise<string | null> {
  const mediaRef = item['o:media']?.[0];
  const mediaId = mediaRef?.['o:id'] ?? mediaRef?.value_resource_id;
  if (!mediaId) return null;

  try {
    const response = await fetch(omekaApiUrl(`${OMEKA_API_BASE}media/${mediaId}`));
    if (!response.ok) return null;

    const media = await response.json();

    const originalUrl = media['o:original_url'];
    if (typeof originalUrl === 'string') {
      const fromOriginal = normalizeOmekaMediaUrl(originalUrl);
      if (fromOriginal) return fromOriginal;
    }

    const fromThumb = normalizeOmekaMediaUrl(
      media['o:thumbnail_urls']?.square ||
        media['o:thumbnail_urls']?.medium ||
        media['o:thumbnail_urls']?.large,
    );
    if (fromThumb) return fromThumb;

    const source =
      media['o:source'] ||
      media['dcterms:identifier']?.[0]?.['@value'] ||
      media['bibo:uri']?.[0]?.['@id'];
    if (typeof source === 'string') {
      const yt = getYouTubeThumbnail(source);
      if (yt) return yt;
      if (source.includes('/') || source.startsWith('http')) {
        return normalizeOmekaMediaUrl(source);
      }
    }
  } catch {
    // ignore
  }

  return null;
}

function normalizeStudentResourceCard(card: StudentResourceCard): StudentResourceCard {
  const thumbnail =
    normalizeOmekaMediaUrl(card.thumbnail) ||
    (card.url ? getYouTubeThumbnail(card.url) || null : null);

  return {
    ...card,
    thumbnail,
    actants: card.actants?.map((a) => ({
      ...a,
      name: a.name || (a as { title?: string }).title,
      picture: normalizeOmekaMediaUrl(a.picture),
    })),
  };
}

/**
 * Types pour les ressources étudiantes
 */
export interface StudentResourceCard {
  id: number | string;
  title: string;
  thumbnail: string | null;
  /** URL externe (YouTube, etc.) — fallback miniature dans MySpaceResourceCard */
  url?: string | null;
  type:
    | 'experimentation_etudiant'
    | 'outil_etudiant'
    | 'retour_experience_etudiant'
    | 'experimentation'
    | 'retour_experience'
    | 'outil'
    | 'seminaire'
    | 'colloque'
    | 'journee_etudes'
    | 'personne'
    | 'organisation'
    | 'recit_scientifique'
    | 'recit_artistique'
    | 'recit_techno_industriel'
    | 'recit_citoyen'
    | 'recit_mediatique'
    | 'annotation'
    | 'element_esthetique'
    | 'element_narratif'
    | 'bibliographie'
    | 'mediagraphie';
  actants: {
    id: number | string;
    title: string;
    name?: string;
    picture: string | null;
  }[];
  /** Date métier (dcterms:issued, dcterms:date, etc.) */
  date?: string | null;
  created?: string;
}

export interface AllStudentResources {
  experimentations: StudentResourceCard[];
  tools: StudentResourceCard[];
  feedbacks: StudentResourceCard[];
  total: number;
}

export interface TemplateProperty {
  property_id: number;
  term: string;
  local_name: string;
  is_required: boolean;
  alternate_label: string | null;
  alternate_comment: string | null;
}

/**
 * Type pour un étudiant avec son ID utilisateur Omeka S
 */
export interface Student {
  id: number;
  firstname: string;
  lastname: string;
  title: string;
  mail: string;
  studentNumber: string; // Numéro étudiant (dcterms:identifier)
  classNumber: string; // Numéro de classe (schema:courseCode)
  picture: string | null;
  omekaUserId: number | null; // ID utilisateur Omeka S (table user)
  type: 'student';
}

/**
 * Récupère toutes les ressources étudiantes (expérimentations, outils, feedbacks)
 * Format simplifié pour les cards
 */
export async function getAllStudentResources(): Promise<AllStudentResources> {
  try {
    const response = await fetch(`${API_BASE}&action=getAllResources&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des ressources');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching student resources:', error);
    throw error;
  }
}

/**
 * Extrait les actants affichés sur une card depuis les propriétés Omeka S
 */
function extractActantsFromOmekaItem(item: Record<string, any>): StudentResourceCard['actants'] {
  const actants: StudentResourceCard['actants'] = [];
  const seen = new Set<string>();

  for (const prop of ['dcterms:creator', 'schema:contributor', 'schema:agent']) {
    const values = item[prop];
    if (!Array.isArray(values)) continue;

    for (const v of values) {
      if (v?.type !== 'resource') continue;
      const id = v.value_resource_id ?? v['o:id'];
      if (id == null || seen.has(String(id))) continue;
      seen.add(String(id));
      actants.push({
        id,
        title: v.display_title || `Item ${id}`,
        name: v.display_title || `Item ${id}`,
        picture: normalizeOmekaMediaUrl(v.thumbnail_url),
      });
    }
  }

  return actants;
}

const OMEKA_DATE_PROPERTIES = ['dcterms:issued', 'dcterms:date', 'schema:eventDate'];

function extractDateFromOmekaItem(item: Record<string, any>): string | null {
  for (const prop of OMEKA_DATE_PROPERTIES) {
    const values = item[prop];
    if (!Array.isArray(values) || values.length === 0) continue;
    const value = values[0]?.['@value'];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/**
 * Convertit un item Omeka S en StudentResourceCard (ignore les templates inconnus)
 */
function mapOmekaItemToStudentCard(item: Record<string, any>): StudentResourceCard | null {
  const templateId = item['o:resource_template']?.['o:id'];
  if (!templateId) return null;

  const type =
    resolveResourceTypeFromOmekaItem(item) ??
    TEMPLATE_ID_TO_TYPE[Number(templateId)];
  if (!type || isParentLinkedOnlyResourceType(type)) return null;

  return {
    id: item['o:id'],
    title: item['o:title'] || item['dcterms:title']?.[0]?.['@value'] || 'Sans titre',
    thumbnail: extractThumbnailFromOmekaItem(item),
    url: extractExternalUrlFromOmekaItem(item),
    type: type as StudentResourceCard['type'],
    actants: extractActantsFromOmekaItem(item),
    date: extractDateFromOmekaItem(item),
    created: item['o:modified']?.['@value'] || item['o:created']?.['@value'],
  };
}

function hasUsableThumbnail(card: StudentResourceCard): boolean {
  return Boolean(card.thumbnail && !isOmekaPlaceholderThumbnail(card.thumbnail));
}

function mergeUserResourceCard(existing: StudentResourceCard, incoming: StudentResourceCard): StudentResourceCard {
  return normalizeStudentResourceCard({
    ...existing,
    ...incoming,
    title: incoming.title || existing.title,
    created: incoming.created || existing.created,
    type: incoming.type || existing.type,
    thumbnail: hasUsableThumbnail(incoming)
      ? incoming.thumbnail
      : hasUsableThumbnail(existing)
        ? existing.thumbnail
        : incoming.thumbnail ?? existing.thumbnail ?? null,
    url: incoming.url || existing.url,
    actants: incoming.actants?.length ? incoming.actants : existing.actants,
  });
}

/** Applique une liste API fraîche en conservant miniatures/actants déjà en cache UI. */
export function applyFreshUserResourceList(
  freshList: StudentResourceCard[],
  prevList: StudentResourceCard[] = [],
): StudentResourceCard[] {
  const prevById = new Map(prevList.map((r) => [String(r.id), r]));
  return freshList.map((fresh) => {
    const prev = prevById.get(String(fresh.id));
    return prev ? mergeUserResourceCard(prev, fresh) : normalizeStudentResourceCard(fresh);
  });
}

/**
 * Fusionne des listes de ressources (déduplication par id, tri par date de modification desc).
 * Conserve la miniature existante si la nouvelle entrée n'en a pas.
 */
export function mergeUserResourceCards(...lists: StudentResourceCard[][]): StudentResourceCard[] {
  const map = new Map<string, StudentResourceCard>();
  for (const list of lists) {
    for (const item of list) {
      const key = String(item.id);
      const existing = map.get(key);
      map.set(key, existing ? mergeUserResourceCard(existing, item) : normalizeStudentResourceCard(item));
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime(),
  );
}

function buildOwnerItemsUrl(omekaUserId: number, perPage: number, page = 1): string {
  return omekaApiUrl(
    `${OMEKA_API_BASE}items?owner_id=${omekaUserId}&per_page=${perPage}&sort_by=modified&sort_order=desc&page=${page}`,
  );
}

/**
 * Enrichissement léger pour la section « Dernières modifications » — 1 requête Omeka (5 items max).
 */
async function enrichRecentCardsFromOmeka(
  cards: StudentResourceCard[],
  omekaUserId: number,
): Promise<StudentResourceCard[]> {
  const missingIds = new Set(
    cards
      .filter((card) => !hasUsableThumbnail(card) || !card.actants?.length)
      .map((card) => Number(card.id)),
  );
  if (missingIds.size === 0) return cards;

  const response = await fetch(buildOwnerItemsUrl(omekaUserId, Math.max(cards.length, 5), 1));
  if (!response.ok) return cards;

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) return cards;

  const items = data.filter((item) => missingIds.has(Number(item['o:id'])));
  if (items.length === 0) return cards;

  let omekaCards = mapOmekaItemsToCards(items);
  omekaCards = await enrichCardThumbnails(omekaCards, items);
  const byId = new Map(omekaCards.map((card) => [String(card.id), card]));

  return cards.map((card) => {
    const fromOmeka = byId.get(String(card.id));
    if (!fromOmeka) return card;
    return normalizeStudentResourceCard({
      ...card,
      thumbnail: hasUsableThumbnail(card) ? card.thumbnail : fromOmeka.thumbnail,
      url: card.url || fromOmeka.url,
      actants: card.actants?.length ? card.actants : fromOmeka.actants,
      date: card.date || fromOmeka.date,
    });
  });
}

/** Enrichissement non bloquant (miniatures / actants manquants) pour les récents. */
export function patchRecentUserResourcesFromOmeka(
  cards: StudentResourceCard[],
  omekaUserId: number,
  onUpdate: (cards: StudentResourceCard[]) => void,
): void {
  void enrichRecentCardsFromOmeka(cards, omekaUserId)
    .then(onUpdate)
    .catch(() => {});
}

/**
 * Complète les miniatures manquantes via l'API Omeka S (par id item).
 * Utilisé notamment par l'administration globale (listRecent sans vignettes).
 */
export async function enrichResourceCardsThumbnails<T extends StudentResourceCard>(
  cards: T[],
): Promise<T[]> {
  const idsToFetch = cards
    .filter((card) => !hasUsableThumbnail(card))
    .map((card) => Number(card.id))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (idsToFetch.length === 0) return cards;

  const items: Record<string, any>[] = [];
  const CONCURRENCY = 5;

  for (let i = 0; i < idsToFetch.length; i += CONCURRENCY) {
    const batch = idsToFetch.slice(i, i + CONCURRENCY);
    const batchItems = await Promise.all(
      batch.map(async (id) => {
        try {
          const response = await fetch(omekaApiUrl(`${OMEKA_API_BASE}items/${id}`));
          if (!response.ok) return null;
          return response.json();
        } catch {
          return null;
        }
      }),
    );
    items.push(...batchItems.filter(Boolean));
  }

  if (items.length === 0) return cards;

  const thumbById = new Map<string, string>();

  await Promise.all(
    items.map(async (item) => {
      const id = String(item['o:id']);
      let thumb = extractThumbnailFromOmekaItem(item);
      if (!thumb || isOmekaPlaceholderThumbnail(thumb)) {
        thumb = (await enrichThumbnailFromMedia(item)) ?? thumb;
      }
      if (thumb && !isOmekaPlaceholderThumbnail(thumb)) {
        thumbById.set(id, thumb);
      }
    }),
  );

  return cards.map((card) => {
    const thumb = thumbById.get(String(card.id));
    if (!thumb || hasUsableThumbnail(card)) return card;
    return normalizeStudentResourceCard({ ...card, thumbnail: thumb }) as T;
  });
}

/**
 * Complète les miniatures et actants manquants via l'API Omeka S (liste complète).
 */
async function enrichApiCardsFromOmeka(
  cards: StudentResourceCard[],
  omekaUserId: number,
  maxPages = 10,
): Promise<StudentResourceCard[]> {
  const missingIds = new Set(
    cards
      .filter((card) => !hasUsableThumbnail(card) || !card.actants?.length)
      .map((card) => Number(card.id)),
  );
  if (missingIds.size === 0) return cards;

  const perPage = 100;
  const itemById = new Map<number, Record<string, any>>();
  let page = 1;

  while (page <= maxPages && itemById.size < missingIds.size) {
    const response = await fetch(buildOwnerItemsUrl(omekaUserId, perPage, page));
    if (!response.ok) break;

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) break;

    for (const item of data) {
      const id = Number(item['o:id']);
      if (missingIds.has(id)) {
        itemById.set(id, item);
      }
    }

    if (data.length < perPage) break;
    page += 1;
  }

  if (itemById.size === 0) return cards;

  const items = Array.from(itemById.values());
  let omekaCards = mapOmekaItemsToCards(items);
  omekaCards = await enrichCardThumbnails(omekaCards, items);
  const thumbById = new Map(omekaCards.map((card) => [String(card.id), card]));

  return cards.map((card) => {
    const fromOmeka = thumbById.get(String(card.id));
    if (!fromOmeka) return card;

    return normalizeStudentResourceCard({
      ...card,
      thumbnail: hasUsableThumbnail(card) ? card.thumbnail : fromOmeka.thumbnail,
      url: card.url || fromOmeka.url,
      actants: card.actants?.length ? card.actants : fromOmeka.actants,
      date: card.date || fromOmeka.date,
    });
  });
}

/** Appel UserSpaceViewHelper — ressources récentes (SQL direct, rapide) */
async function fetchRecentUserResourcesFromApi(ownerId: number, limit = 5): Promise<StudentResourceCard[]> {
  const params = new URLSearchParams({
    action: 'getRecentUserResources',
    ownerId: String(ownerId),
    limit: String(limit),
    json: '1',
  });
  const response = await fetch(`${API_BASE}&${params.toString()}`);
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des ressources récentes');
  }
  const data = await response.json();
  if (data?.error) {
    throw new Error(data.error);
  }
  const cards = normalizeLegacyResourceCards(Array.isArray(data) ? data : []);
  return cards;
}

/** Appel UserSpaceViewHelper — toutes les ressources Mon espace (SQL + thumbnails) */
async function fetchAllUserResourcesFromApi(ownerId: number): Promise<StudentResourceCard[]> {
  const params = new URLSearchParams({
    action: 'getUserResources',
    ownerId: String(ownerId),
    json: '1',
  });
  const response = await fetch(`${API_BASE}&${params.toString()}`);
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des ressources utilisateur');
  }
  const data = await response.json();
  if (data?.error) {
    throw new Error(data.error);
  }
  const cards = normalizeLegacyResourceCards(Array.isArray(data) ? data : []);
  return enrichApiCardsFromOmeka(cards, ownerId);
}

async function enrichCardThumbnails(
  cards: StudentResourceCard[],
  allItems: Record<string, any>[],
): Promise<StudentResourceCard[]> {
  const needsEnrichment = cards
    .map((card, index) => {
      const rawItem = allItems.find((i) => i['o:id'] === card.id);
      return (!card.thumbnail || isOmekaPlaceholderThumbnail(card.thumbnail)) && rawItem?.['o:media']?.length
        ? { card, index, rawItem }
        : null;
    })
    .filter(Boolean) as { card: StudentResourceCard; index: number; rawItem: any }[];

  const result = [...cards];
  const CONCURRENCY = 5;
  for (let i = 0; i < needsEnrichment.length; i += CONCURRENCY) {
    const batch = needsEnrichment.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async ({ index, rawItem }) => {
        const enriched = await enrichThumbnailFromMedia(rawItem);
        if (enriched) result[index] = { ...result[index], thumbnail: enriched };
      }),
    );
  }
  return result;
}

function mapOmekaItemsToCards(items: Record<string, any>[]): StudentResourceCard[] {
  return items
    .map(mapOmekaItemToStudentCard)
    .filter((card): card is StudentResourceCard => card !== null)
    .map(normalizeStudentResourceCard);
}

/**
 * Récupère les N ressources les plus récemment modifiées (rapide, sans enrichissement thumbnail).
 */
export async function fetchRecentUserResourcesByOwnerFromOmeka(
  omekaUserId: number,
  limit = 5,
): Promise<StudentResourceCard[]> {
  const response = await fetch(buildOwnerItemsUrl(omekaUserId, limit, 1));
  if (!response.ok) {
    throw new Error(`Erreur Omeka S (${response.status}) lors de la récupération des ressources récentes`);
  }
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) return [];
  return mapOmekaItemsToCards(data);
}

/**
 * Récupère toutes les ressources dont l'utilisateur Omeka S est propriétaire (o:owner).
 * Optimisations :
 * - Première page chargée en priorité → résultats rapides
 * - Pages suivantes en parallèle (via totalResults dans le header Omeka S)
 * - Enrichissement des thumbnails limité à 5 requêtes simultanées
 */
export async function fetchUserResourcesByOwnerFromOmeka(omekaUserId: number): Promise<StudentResourceCard[]> {
  const perPage = 100;

  const firstResponse = await fetch(buildOwnerItemsUrl(omekaUserId, perPage, 1));
  if (!firstResponse.ok) {
    throw new Error(`Erreur Omeka S (${firstResponse.status}) lors de la récupération des ressources par owner`);
  }
  const firstData = await firstResponse.json();
  if (!Array.isArray(firstData) || firstData.length === 0) return [];

  let allItems: Record<string, any>[] = [...firstData];

  if (firstData.length === perPage) {
    const totalHeader = firstResponse.headers.get('Omeka-S-Total-Results');
    const total = totalHeader ? parseInt(totalHeader, 10) : null;
    const maxPages = total ? Math.min(Math.ceil(total / perPage), 10) : 10;

    if (maxPages > 1) {
      const pageNumbers = Array.from({ length: maxPages - 1 }, (_, i) => i + 2);
      const pageResults = await Promise.all(
        pageNumbers.map(async (page) => {
          try {
            const r = await fetch(buildOwnerItemsUrl(omekaUserId, perPage, page));
            if (!r.ok) return [];
            const d = await r.json();
            return Array.isArray(d) ? d : [];
          } catch {
            return [];
          }
        }),
      );
      for (const pageData of pageResults) {
        allItems.push(...pageData);
        if (pageData.length < perPage) break;
      }
    }
  }

  const cards = mapOmekaItemsToCards(allItems);
  return enrichCardThumbnails(cards, allItems);
}

/** Ressource créée récemment — affichage optimiste dans Mon espace */
export function buildPendingMonEspaceResourceKey(omekaUserId: number | string): string {
  return `monespace_pending_${omekaUserId}`;
}

export function stashPendingMonEspaceResource(omekaUserId: number, card: StudentResourceCard): void {
  try {
    sessionStorage.setItem(buildPendingMonEspaceResourceKey(omekaUserId), JSON.stringify(card));
  } catch {
    // sessionStorage indisponible
  }
}

export function consumePendingMonEspaceResource(omekaUserId: number): StudentResourceCard | null {
  try {
    const raw = sessionStorage.getItem(buildPendingMonEspaceResourceKey(omekaUserId));
    if (!raw) return null;
    sessionStorage.removeItem(buildPendingMonEspaceResourceKey(omekaUserId));
    return JSON.parse(raw) as StudentResourceCard;
  } catch {
    return null;
  }
}

/**
 * Récupère les ressources récemment modifiées de l'utilisateur (section « Dernières modifications »).
 */
export async function getRecentUserResources(
  userId: number,
  omekaUserId?: number | null,
  limit = 5,
): Promise<StudentResourceCard[]> {
  if (omekaUserId && omekaUserId > 0) {
    try {
      return await fetchRecentUserResourcesFromApi(omekaUserId, limit);
    } catch (error) {
      console.error('Error fetching recent user resources from UserSpace API:', error);
      try {
        return await fetchRecentUserResourcesByOwnerFromOmeka(omekaUserId, limit);
      } catch (fallbackError) {
        console.error('Error fetching recent user resources from Omeka:', fallbackError);
      }
    }
  }

  const all = await getUserResources(userId, omekaUserId);
  return all.slice(0, limit);
}

/**
 * Récupère les ressources créées par un utilisateur
 * Priorité : filtre par o:owner (omekaUserId) via l'API Omeka S
 * Fallback : endpoint PHP legacy (userId = item étudiant)
 */
export async function getUserResources(userId: number, omekaUserId?: number | null): Promise<StudentResourceCard[]> {
  if (omekaUserId && omekaUserId > 0) {
    try {
      return await fetchAllUserResourcesFromApi(omekaUserId);
    } catch (error) {
      console.error('Error fetching user resources from UserSpace API:', error);
      try {
        return await fetchUserResourcesByOwnerFromOmeka(omekaUserId);
      } catch (fallbackError) {
        console.error('Error fetching user resources by o:owner from Omeka:', fallbackError);
      }
    }
  }

  if (!userId) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      action: 'getUserResources',
      userId: String(userId),
      json: '1',
    });
    if (omekaUserId && omekaUserId > 0) {
      params.set('ownerId', String(omekaUserId));
    }

    const response = await fetch(`${API_BASE}&${params.toString()}`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des ressources utilisateur');
    }

    return normalizeLegacyResourceCards(await response.json());
  } catch (error) {
    console.error('Error fetching user resources:', error);
    throw error;
  }
}

function normalizeLegacyResourceCards(cards: StudentResourceCard[]): StudentResourceCard[] {
  if (!Array.isArray(cards)) return [];
  return filterMonEspaceResources(cards.map(normalizeStudentResourceCard));
}

/**
 * Récupère les expérimentations étudiantes (format card)
 */
export async function getStudentExperimentations(): Promise<StudentResourceCard[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getExperimentations&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des expérimentations');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching student experimentations:', error);
    throw error;
  }
}

/**
 * Récupère les outils (format card)
 */
export async function getStudentTools(): Promise<StudentResourceCard[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getTools&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des outils');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching student tools:', error);
    throw error;
  }
}

/**
 * Récupère les feedbacks (format card)
 */
export async function getStudentFeedbacks(): Promise<StudentResourceCard[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getFeedbacks&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des feedbacks');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching student feedbacks:', error);
    throw error;
  }
}

/**
 * Récupère les propriétés d'un template (pour les formulaires de création/édition)
 */
export async function getStudentTemplateProperties(templateId: number): Promise<{
  templateId: number;
  properties: TemplateProperty[];
}> {
  try {
    const response = await fetch(`${API_BASE}&action=getTemplateProperties&templateId=${templateId}&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des propriétés');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching template properties:', error);
    throw error;
  }
}

/**
 * Récupère les étudiants avec leur ID utilisateur Omeka S
 * Utilisé pour le login et pour déterminer le owner lors de la création de ressources
 */
export async function getStudentsForLogin(): Promise<Student[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getStudents&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des étudiants');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching students:', error);
    throw error;
  }
}

// ========== COURSE TYPES & FUNCTIONS ==========

/**
 * Type pour un cours
 */
export interface Course {
  id: number;
  title: string;
  description: string;
  code: string; // Code du cours (ex: ART2030)
  level: string; // Niveau (Baccalauréat, Maîtrise, etc.)
  session: string; // Session (Automne, Hiver, Été)
  year: string; // Année
  studentCount: number; // Nombre d'étudiants inscrits
  created?: string;
  modified?: string;
}

/**
 * Type pour les données de création/modification d'un cours
 */
export interface CourseFormData {
  title: string;
  description?: string;
  code?: string;
  level?: string;
  session?: string;
  year?: string;
}

/**
 * Récupère tous les cours
 */
export async function getCourses(): Promise<Course[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getCourses&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des cours');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
}

/**
 * Créer un cours
 */
export async function createCourse(data: CourseFormData): Promise<{ success: boolean; id: number }> {
  const params = new URLSearchParams({
    title: data.title,
    description: data.description || '',
    code: data.code || '',
    level: data.level || '',
    session: data.session || '',
    year: data.year || '',
  });

  const response = await fetch(`${API_BASE}&action=createCourse&json=1&${params.toString()}`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Mettre à jour un cours
 */
export async function updateCourse(id: number, data: Partial<CourseFormData>): Promise<{ success: boolean; id: number }> {
  const params = new URLSearchParams({ id: String(id) });

  if (data.title !== undefined) params.append('title', data.title);
  if (data.description !== undefined) params.append('description', data.description);
  if (data.code !== undefined) params.append('code', data.code);
  if (data.level !== undefined) params.append('level', data.level);
  if (data.session !== undefined) params.append('session', data.session);
  if (data.year !== undefined) params.append('year', data.year);

  const response = await fetch(`${API_BASE}&action=updateCourse&json=1&${params.toString()}`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Supprimer un cours
 */
export async function deleteCourse(id: number): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}&action=deleteCourse&id=${id}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

async function isOmekaItemDeleted(itemId: number): Promise<boolean> {
  try {
    const response = await fetch(omekaApiUrl(`${OMEKA_API_BASE}items/${itemId}`));
    return response.status === 404;
  } catch {
    return false;
  }
}

function extractLinkedResourceIdsFromOmekaItem(item: Record<string, unknown>): number[] {
  const ids = new Set<number>();
  for (const value of Object.values(item)) {
    if (!Array.isArray(value)) continue;
    for (const entry of value) {
      if (!entry || typeof entry !== 'object') continue;
      const record = entry as Record<string, unknown>;
      if (record.type !== 'resource') continue;
      const linkedId = record.value_resource_id ?? record['o:id'];
      if (linkedId != null && Number.isFinite(Number(linkedId))) {
        ids.add(Number(linkedId));
      }
    }
  }
  return Array.from(ids);
}

async function fetchOmekaItemTemplateId(itemId: number): Promise<number | null> {
  try {
    const response = await fetch(omekaApiUrl(`${OMEKA_API_BASE}items/${itemId}`));
    if (!response.ok) return null;
    const item = await response.json();
    const templateId = item?.['o:resource_template']?.['o:id'];
    return templateId != null && Number.isFinite(Number(templateId)) ? Number(templateId) : null;
  } catch {
    return null;
  }
}

/** Ressources liées au parent à supprimer en cascade (analyses, retours, éléments narratif/esthétique). */
async function collectCascadeDeleteChildIds(parentItemId: number): Promise<number[]> {
  const cascadeTemplateIds = new Set(getCascadeDeleteWithParentTemplateIds());

  let item: Record<string, unknown>;
  try {
    const response = await fetch(omekaApiUrl(`${OMEKA_API_BASE}items/${parentItemId}`));
    if (!response.ok) return [];
    item = await response.json();
  } catch {
    return [];
  }

  const linkedIds = extractLinkedResourceIdsFromOmekaItem(item);
  if (linkedIds.length === 0) return [];

  const childIds: number[] = [];
  const CONCURRENCY = 5;
  for (let i = 0; i < linkedIds.length; i += CONCURRENCY) {
    const batch = linkedIds.slice(i, i + CONCURRENCY);
    const templates = await Promise.all(batch.map((id) => fetchOmekaItemTemplateId(id)));
    batch.forEach((id, index) => {
      const templateId = templates[index];
      if (templateId != null && cascadeTemplateIds.has(templateId)) {
        childIds.push(id);
      }
    });
  }

  return childIds;
}

async function deleteSingleOmekaItem(itemId: number): Promise<{ success: boolean; message?: string }> {
  let proxyError: string | undefined;

  try {
    const result = await ApiProxy.deleteItem(itemId);

    if (result?.error) {
      proxyError = typeof result.error === 'string' ? result.error : 'Erreur lors de la suppression';
    } else if (result?.success === false) {
      proxyError = typeof result.message === 'string' ? result.message : 'Erreur lors de la suppression';
    } else {
      return {
        success: true,
        message: typeof result?.message === 'string' ? result.message : undefined,
      };
    }
  } catch (error) {
    proxyError = error instanceof Error ? error.message : 'Erreur lors de la suppression';
  }

  if (await isOmekaItemDeleted(itemId)) {
    return { success: true };
  }

  throw new Error(proxyError || 'Erreur lors de la suppression');
}

/**
 * Supprime définitivement une ressource Omeka S (DELETE via ApiProxy).
 * Supprime aussi en cascade les ressources liées non transverses (analyse critique,
 * retour d'expérience, élément narratif, élément esthétique).
 * Le backend peut renvoyer une 500 Doctrine après suppression réussie : on vérifie l'absence de l'item.
 */
export async function deleteUserResource(id: string | number): Promise<{ success: boolean; message?: string }> {
  const itemId = Number(id);
  if (!itemId) {
    throw new Error('ID de ressource invalide');
  }

  const childIds = await collectCascadeDeleteChildIds(itemId);
  for (const childId of childIds) {
    await deleteSingleOmekaItem(childId);
  }

  return deleteSingleOmekaItem(itemId);
}

/**
 * Inscrire un étudiant à un cours
 */
export async function enrollStudent(studentId: number, courseId: number): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}&action=enrollStudent&studentId=${studentId}&courseId=${courseId}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Désinscrire un étudiant d'un cours
 */
export async function unenrollStudent(studentId: number, courseId: number): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}&action=unenrollStudent&studentId=${studentId}&courseId=${courseId}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Récupérer les cours d'un étudiant
 */
export async function getStudentCourses(studentId: number): Promise<Course[]> {
  const response = await fetch(`${API_BASE}&action=getStudentCourses&studentId=${studentId}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Récupérer les étudiants d'un cours
 */
export async function getCourseStudents(courseId: number): Promise<Student[]> {
  const response = await fetch(`${API_BASE}&action=getCourseStudents&courseId=${courseId}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Récupérer les ressources filtrées par cours
 */
export async function getResourcesByCourse(courseId: number): Promise<AllStudentResources> {
  const response = await fetch(`${API_BASE}&action=getResourcesByCourse&courseId=${courseId}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Récupérer les expérimentations du même cours qu'une expérimentation donnée
 * Pour les recommandations "Expérimentations similaires"
 */
export async function getSameCourseExperimentations(experimentationId: number, limit: number = 4): Promise<StudentResourceCard[]> {
  const response = await fetch(`${API_BASE}&action=getSameCourseExperimentations&experimentationId=${experimentationId}&limit=${limit}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return Array.isArray(result) ? result : [];
}

// ========== RESEARCH PROJECT (SAVED SEARCHES) ==========

/**
 * Template ID pour les projets de recherche (recherches sauvegardées)
 */
export const RESEARCH_TEMPLATE_ID = 102;

/**
 * Property IDs pour le template ResearchProject
 */
const RESEARCH_PROPERTIES = {
  title: 1, // dcterms:title
  creator: 2, // dcterms:creator
  codeRepository: 551, // schema:codeRepository (stocke le JSON des filtres)
} as const;

/**
 * Type pour une recherche sauvegardée
 */
export interface SavedResearch {
  id: number;
  title: string;
  config: string; // JSON stringifié des FilterGroup[]
  created: string;
  creatorId?: number;
}

/**
 * Convertit un dataURL en File
 */
function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Sauvegarde une recherche dans Omeka S
 * Crée un item ResearchProject avec la configuration de recherche et l'image de la visualisation
 */
export async function saveResearch(title: string, filterGroups: any, imageDataUrl?: string): Promise<{ success: boolean; id: number }> {
  // Récupérer les IDs utilisateur depuis localStorage
  const userId = localStorage.getItem('userId');
  const omekaUserId = localStorage.getItem('omekaUserId');

  if (!userId || !omekaUserId) {
    throw new Error('Utilisateur non connecté. Veuillez vous connecter pour sauvegarder une recherche.');
  }

  const configJson = JSON.stringify(filterGroups);

  // Construire l'objet pour l'API Omeka S
  const itemData: Record<string, any> = {
    'o:resource_template': { 'o:id': RESEARCH_TEMPLATE_ID },
    'o:owner': { 'o:id': parseInt(omekaUserId, 10) },
    'dcterms:title': [
      {
        type: 'literal',
        property_id: RESEARCH_PROPERTIES.title,
        '@value': title,
        is_public: true,
      },
    ],
    'dcterms:creator': [
      {
        type: 'resource',
        property_id: RESEARCH_PROPERTIES.creator,
        value_resource_id: parseInt(userId, 10),
        is_public: true,
      },
    ],
    'schema:codeRepository': [
      {
        type: 'literal',
        property_id: RESEARCH_PROPERTIES.codeRepository,
        '@value': configJson,
        is_public: true,
      },
    ],
  };

  // Utiliser les credentials depuis les variables d'environnement
  const API_KEY = import.meta.env.VITE_API_KEY;
  const API_IDENT = 'NUO2yCjiugeH7XbqwUcKskhE8kXg0rUj';
  const createUrl = `https://tests.arcanes.ca/omk/api/items?key_identity=${API_IDENT}&key_credential=${API_KEY}`;

  const response = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Erreur création recherche:', errorData);
    throw new Error(errorData['o:errors']?.join(', ') || 'Erreur lors de la sauvegarde de la recherche');
  }

  const result = await response.json();
  const newItemId = result['o:id'];

  // Upload de l'image comme média si fournie
  if (imageDataUrl && newItemId) {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
      const filename = `recherche_${timestamp}.png`;
      const imageFile = dataURLtoFile(imageDataUrl, filename);

      const formData = new FormData();
      formData.append(
        'data',
        JSON.stringify({
          'o:ingester': 'upload',
          'o:item': { 'o:id': newItemId },
          file_index: '0',
        }),
      );
      formData.append('file[0]', imageFile);

      const mediaUrl = `https://tests.arcanes.ca/omk/api/media?key_identity=${API_IDENT}&key_credential=${API_KEY}`;
      const mediaResponse = await fetch(mediaUrl, {
        method: 'POST',
        body: formData,
      });

      if (!mediaResponse.ok) {
        console.error('Erreur upload média:', await mediaResponse.text());
      } else {
        console.log('Image de recherche uploadée avec succès');
      }
    } catch (err) {
      console.error('Erreur upload média:', err);
    }
  }

  return { success: true, id: newItemId };
}

/**
 * Récupère les recherches sauvegardées de l'utilisateur connecté
 */
export async function getUserSavedResearches(): Promise<SavedResearch[]> {
  const omekaUserId = localStorage.getItem('omekaUserId');

  if (!omekaUserId) {
    return [];
  }

  const API_KEY = import.meta.env.VITE_API_KEY;
  const API_IDENT = 'NUO2yCjiugeH7XbqwUcKskhE8kXg0rUj';
  const url = `https://tests.arcanes.ca/omk/api/items?resource_template_id=${RESEARCH_TEMPLATE_ID}&owner_id=${omekaUserId}&key_identity=${API_IDENT}&key_credential=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Erreur récupération recherches:', response.statusText);
      return [];
    }

    const items = await response.json();

    return items.map((item: any) => ({
      id: item['o:id'],
      title: item['o:title'] || 'Sans titre',
      config: item['schema:codeRepository']?.[0]?.['@value'] || '[]',
      created: item['o:created']?.['@value'] || '',
      creatorId: item['dcterms:creator']?.[0]?.['value_resource_id'],
    }));
  } catch (error) {
    console.error('Erreur récupération recherches:', error);
    return [];
  }
}

/**
 * Supprime une recherche sauvegardée
 */
export async function deleteResearch(id: number): Promise<{ success: boolean }> {
  const API_KEY = import.meta.env.VITE_API_KEY;
  const API_IDENT = 'NUO2yCjiugeH7XbqwUcKskhE8kXg0rUj';
  const url = `https://tests.arcanes.ca/omk/api/items/${id}?key_identity=${API_IDENT}&key_credential=${API_KEY}`;

  const response = await fetch(url, { method: 'DELETE' });

  if (!response.ok) {
    throw new Error('Erreur lors de la suppression de la recherche');
  }

  return { success: true };
}

// ========== ACTANT TYPES & FUNCTIONS ==========

/**
 * Type pour un actant (item template 72) avec sa liaison utilisateur Omeka S
 */
export interface Actant {
  id: number; // ID de l'item actant (template 72)
  omekaUserId: number | null; // ID utilisateur Omeka S (null si non lié)
  omekaUserName: string | null; // Nom de l'utilisateur Omeka S
  omekaUserRole: string | null; // Rôle de l'utilisateur Omeka S
  mail: string;
  firstname: string;
  lastname: string;
  title: string;
  picture: string | null;
  created?: string;
  type: 'actant';
}

/**
 * Récupère les actants avec leur omekaUserId
 * Les actants sont les utilisateurs avec un rôle admin/author dans Omeka S
 */
export async function getActantsForLogin(): Promise<Actant[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getActants&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des actants');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching actants:', error);
    throw error;
  }
}

/**
 * Lier un actant (item) à un utilisateur Omeka S
 */
export async function linkActantToUser(actantId: number, userId: number): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}&action=linkActantToUser&actantId=${actantId}&userId=${userId}&json=1`, {
    method: 'POST',
  });
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Créer un utilisateur Omeka S pour un actant et le lier automatiquement
 */
export async function createOmekaUserForActant(
  actantId: number,
  email: string,
  name: string,
  role: string = 'author',
): Promise<{ success: boolean; userId: number; actantId: number }> {
  const params = new URLSearchParams({
    actantId: String(actantId),
    email,
    name,
    role,
  });

  const response = await fetch(`${API_BASE}&action=createOmekaUserForActant&json=1&${params.toString()}`, {
    method: 'POST',
  });
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Supprimer un actant (et optionnellement son utilisateur Omeka S)
 */
export async function deleteActant(actantId: number, deleteUser: boolean = false): Promise<{ success: boolean; actantId: number; actantTitle: string; userDeleted: boolean }> {
  const params = new URLSearchParams({
    actantId: String(actantId),
    deleteUser: String(deleteUser),
  });

  const response = await fetch(`${API_BASE}&action=deleteActant&json=1&${params.toString()}`, {
    method: 'POST',
  });
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Créer un actant avec son utilisateur Omeka S (pour import batch)
 */
export async function createActantWithUser(
  email: string,
  name: string,
  role: string = 'author',
): Promise<{ success: boolean; userId: number; actantId: number; email: string; name: string; role: string }> {
  const params = new URLSearchParams({
    email,
    name,
    role,
  });

  const response = await fetch(`${API_BASE}&action=createActantWithUser&json=1&${params.toString()}`, {
    method: 'POST',
  });
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Récupérer les ressources enseignantes (créées par les actants, visibles par tous)
 */
export async function getTeacherResources(): Promise<AllStudentResources> {
  try {
    const response = await fetch(`${API_BASE}&action=getTeacherResources&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des ressources enseignantes');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching teacher resources:', error);
    throw error;
  }
}

// ========== WATCHLIST (LISTE DE LECTURE / À REGARDER) ==========

export interface WatchlistCard {
  id: string | number;
  title: string;
  thumbnail?: string | null;
  type?: string;
  actants?: Array<{ name?: string; title?: string; firstname?: string; lastname?: string; picture?: string }>;
  date?: string | null;
  subtitle?: string;
}

async function watchlistFetch<T>(action: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(API_BASE);
  url.searchParams.set('action', action);
  url.searchParams.set('json', '1');
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));

  const response = await fetch(url.toString(), { credentials: 'include' });
  const data = await response.json();

  if (data?.code === 401) {
    throw new Error('Non authentifié');
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}

/** IDs des ressources sauvegardées par l'actant connecté */
export async function getWatchlistIds(): Promise<{ ids: number[] }> {
  try {
    return await watchlistFetch<{ ids: number[] }>('getWatchlistIds');
  } catch (error) {
    console.error('Error fetching watchlist ids:', error);
    return { ids: [] };
  }
}

/** Cards des ressources sauvegardées */
export async function getWatchlistCards(): Promise<{ items: WatchlistCard[] }> {
  return watchlistFetch<{ items: WatchlistCard[] }>('getWatchlistCards');
}

/** Ajoute ou retire une ressource de la liste de lecture */
export async function toggleWatchlistItem(resourceId: number): Promise<{ saved: boolean; ids: number[] }> {
  return watchlistFetch<{ saved: boolean; ids: number[] }>('toggleWatchlistItem', { resourceId });
}

export interface LinkingExportRow {
  id: number;
  title: string;
  type: string;
  keywords: string[];
}

/** Catalogue site (conférences, expérimentations, récits) pour export Excel / aide IA */
export async function fetchLinkingExportCatalog(): Promise<LinkingExportRow[]> {
  const params = new URLSearchParams({
    action: 'getLinkingExportCatalog',
    json: '1',
  });
  const response = await fetch(`${API_BASE}&${params.toString()}`, { credentials: 'include' });
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération du catalogue');
  }
  const data = await response.json();
  if (data?.code === 401) {
    throw new Error('Connectez-vous pour exporter le catalogue');
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((item: Record<string, unknown>) => ({
    id: Number(item.id),
    title: String(item.title ?? 'Sans titre'),
    type: String(item.type ?? ''),
    keywords: Array.isArray(item.keywords) ? item.keywords.map(String) : [],
  }));
}
