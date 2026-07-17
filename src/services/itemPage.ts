/**
 * Client pour le nouveau moteur backend "Item Page" (ItemPageHelper / ItemPageConfig,
 * edisem-back/modules/CartoAffect/src/View/Helper). Remplace, pour les templates couverts,
 * le pipeline `GET /omk/api/items/{id}` + enrichissements N+1 par un seul appel qui ne renvoie
 * que les champs réellement affichés.
 */

const QUERY_API_URL = 'https://tests.arcanes.ca/omk/s/edisem/page/ajax';

export interface ItemPageMediaVideo {
  id: number;
  title: string;
  url: string;
  thumbnail: string | null;
  type: 'video';
}

export type ItemPageMedia = string | ItemPageMediaVideo;

export interface ItemPageCardActant {
  id?: string | number;
  name: string;
  firstname?: string;
  lastname?: string;
  picture?: string | null;
  universities?: string[];
}

export interface ItemPageCard {
  id: number | null;
  title: string;
  thumbnail: string | null;
  resource_template_id: number | null;
  owner_id?: number | null;
  url?: string | null;
  actants?: ItemPageCardActant[];
  /** Type front (seminaire, recit_artistique…) — fourni par QueryCardHelper pour les contenus associés. */
  type?: string | null;
  date?: string | null;
}

/** Fiche de référence (bibliographie / médiagraphie) — cf. ItemPageFetcher::fetchReferenceCards. */
export interface ItemPageReferenceCard extends ItemPageCard {
  creator?: { first_name: string; last_name: string }[];
  date?: string | null;
  publisher?: string | null;
  editor?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  isPartOf?: string | null;
  source?: string | null;
  number?: string | null;
  mediagraphyType?: string | null;
  externalUrl?: string | null;
}

export interface ItemPageScalarField {
  // ItemPageHelper::resolveField renvoie toujours 'text' ici, quel que soit le type déclaré
  // côté config ('title' | 'text' | 'textarea' | 'date' | 'url') — la distinction de rendu
  // reste une responsabilité du front.
  type: 'text';
  value: string | null;
}

export interface ItemPageResourceField {
  type: 'resources';
  items: ItemPageCard[];
}

export type ItemPageField = ItemPageScalarField | ItemPageResourceField;

export interface ItemPageItemsView {
  type: 'items';
  items: ItemPageCard[];
}

export interface ItemPageReferencesView {
  type: 'references';
  items: ItemPageReferenceCard[];
}

export interface ItemPageCategoriesView {
  type: 'categories';
  values: Record<string, { label: string; values: string[] }>;
}

export interface ItemPageTextView {
  type: 'text';
  value: string | null;
}

/** Section "Imaginaire de l'IA" — cf. IMAGINAIRE_IA_VOCAB_FIELDS (front) / IMAGINAIRE_IA_TERMS (back). */
export interface ItemPageVocabGroupView {
  type: 'vocabGroup';
  values: Record<string, string[]>;
}

export interface ItemPageMicroResumeTool {
  id: number;
  title: string;
  thumbnail: string | null;
}

export interface ItemPageMicroResume {
  id: number;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  outils: ItemPageMicroResumeTool[];
}

export interface ItemPageMicroResumesView {
  type: 'microresumes';
  items: ItemPageMicroResume[];
}

export interface ItemPageCitationActant {
  id: number | string;
  firstname: string;
  lastname: string;
  name: string;
  picture: string | null;
  universities: string[];
}

export interface ItemPageCitation {
  id: number;
  citation: string;
  actant: ItemPageCitationActant;
  startTime: number;
  endTime: number;
}

export interface ItemPageCitationsView {
  type: 'citations';
  items: ItemPageCitation[];
}

export interface ItemPageUsedByView {
  type: 'usedBy';
  items: ItemPageCard[];
}

export type ItemPageView =
  | ItemPageItemsView
  | ItemPageReferencesView
  | ItemPageCategoriesView
  | ItemPageTextView
  | ItemPageVocabGroupView
  | ItemPageMicroResumesView
  | ItemPageCitationsView
  | ItemPageUsedByView;

export interface ItemPageData {
  id: number;
  title: string;
  resource_template_id: number;
  owner_id: number | null;
  type: string;
  supported: boolean;
  thumbnail: string | null;
  associatedMedia: ItemPageMedia[];
  fields: Record<string, ItemPageField>;
  views: Record<string, ItemPageView>;
}

const itemPageCache = new Map<string, Promise<ItemPageData | null>>();

async function fetchItemPageAction(action: 'getItemPage' | 'getChildItem', id: string | number): Promise<ItemPageData | null> {
  const cacheKey = `${action}:${id}`;
  const cached = itemPageCache.get(cacheKey);
  if (cached) return cached;

  const request = (async () => {
    try {
      const params = new URLSearchParams({
        helper: 'Query',
        action,
        json: '1',
        id: String(id),
      });

      const response = await fetch(`${QUERY_API_URL}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result || !result.id) {
        return null;
      }

      return result as ItemPageData;
    } catch (error) {
      itemPageCache.delete(cacheKey);
      console.error(`Error fetching ${action} for ${id}:`, error);
      throw error;
    }
  })();

  itemPageCache.set(cacheKey, request);
  return request;
}

/** Page complète d'un item (récit, conférence...) — templates couverts par ItemPageConfig. */
export function getItemPage(id: string | number): Promise<ItemPageData | null> {
  return fetchItemPageAction('getItemPage', id);
}

/** Item enfant ouvert en popup (analyse critique, élément narratif/esthétique, retour d'expérience…). */
export function getChildItem(id: string | number): Promise<ItemPageData | null> {
  return fetchItemPageAction('getChildItem', id);
}

/** Invalide le cache lecture Item Page pour un id (après sauvegarde Omeka). */
export function invalidateItemPageCache(id: string | number): void {
  const key = String(id);
  itemPageCache.delete(`getItemPage:${key}`);
  itemPageCache.delete(`getChildItem:${key}`);
}

// --- Petits helpers de lecture, pour éviter de répéter les vérifications de type partout ---

export function fieldValue(field: ItemPageField | undefined): string | null {
  if (!field) return null;
  return field.type === 'resources' ? null : field.value;
}

export function fieldItems(field: ItemPageField | undefined): ItemPageCard[] {
  if (!field || field.type !== 'resources') return [];
  return field.items;
}

export function viewItems(view: ItemPageView | undefined): ItemPageCard[] {
  if (!view || view.type !== 'items') return [];
  return view.items;
}

export function viewReferences(view: ItemPageView | undefined): ItemPageReferenceCard[] {
  if (!view || view.type !== 'references') return [];
  return view.items;
}

export function viewCategoryEntries(view: ItemPageView | undefined): { key: string; label: string; values: string[] }[] {
  if (!view || view.type !== 'categories') return [];
  return Object.entries(view.values)
    .filter(([, entry]) => entry.values && entry.values.length > 0)
    .map(([key, entry]) => ({ key, label: entry.label, values: entry.values }));
}

/**
 * PopupMediaGallery (composant partagé) attend un tableau d'URLs simples ; le backend renvoie
 * les vidéos YouTube sous forme d'objet enrichi (titre, vignette...). On aplati ici, à la
 * frontière données -> UI, plutôt que de complexifier un composant d'affichage générique.
 */
export function flattenMediaUrls(media: ItemPageMedia[]): string[] {
  return media.map((m) => (typeof m === 'string' ? m : m.url)).filter(Boolean);
}
