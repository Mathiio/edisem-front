/**
 * Adaptateur générique : branche le nouveau moteur backend "Item Page" (getItemPage /
 * ItemPageHelper, edisem-back) sur le pipeline de rendu existant (SimpleOverviewCard,
 * SimpleDetailsCard, createViewFromSimpleView...) sans y toucher.
 *
 * Principe : ItemPageHelper ne renvoie que les champs déclarés dans ItemPageConfig (un seul
 * appel réseau, pas de N+1 GET /omk/api/items/{id}). On reconstruit ici un `itemDetails`
 * "façon Omeka S" (mêmes formes de valeurs : [{'@value':...}] / [{value_resource_id:...}])
 * pour que tous les composants génériques (qui lisent `itemDetails[property]` via
 * getOmekaValue/getAllOmekaValues/getResourceIds) continuent de fonctionner sans changement,
 * en vue comme en édition.
 *
 * Sécurité : si le template n'est pas couvert (supported=false) ou si l'appel échoue, on
 * retombe automatiquement sur le fetcher Omeka S standard (createOmekaDataFetcher). Aucune
 * régression possible : au pire, on repasse par l'ancien pipeline.
 */

import { getContributorDisplayType, getResourceTypeFromTemplate } from './simplifiedConfigAdapter';
import { SimplifiedDetailConfig, InternalFieldConfig } from './simplifiedConfig';
import { DataFetcher, FetchResult, ProgressiveDataFetcher, ProgressCallback } from './config';
import {
  getItemPage,
  ItemPageData,
  ItemPageCard,
  ItemPageReferenceCard,
  ItemPageField,
  ItemPageView,
  flattenMediaUrls,
  fieldValue,
} from '@/services/itemPage';
import { getResourceUrl } from '@/config/resourceConfig';
import { enrichItemWithResourceOwner } from '@/lib/resourceOwner';
import { getResourceOwnerId } from '@/lib/resourceEditHelpers';
import { resolveOmekaThumbnail } from '@/lib/resourceUtils';
import { OMEKA_API_BASE as API_BASE } from '@/utils/omekaApi';

// ========================================================================
// Reconstruction de valeurs "façon Omeka S" à partir des fiches du backend
// ========================================================================

type OmekaLikeValue = Record<string, unknown>;

function literalEntry(value: string): OmekaLikeValue {
  return { type: 'literal', '@value': value, is_public: true };
}

function uriEntry(value: string, label?: string): OmekaLikeValue {
  return { type: 'uri', '@id': value, 'o:label': label, is_public: true };
}

/** Convertit un champ scalaire ('type: text' côté backend) en tableau façon Omeka S. */
function scalarToOmekaEntries(field: InternalFieldConfig, value: string | null): OmekaLikeValue[] {
  if (value == null || value === '') return [];
  if (field.type === 'url') return [uriEntry(value)];
  return [literalEntry(value)];
}

function cardResourceUrl(card: ItemPageCard): string | undefined {
  if (card.id == null) return undefined;
  const type = card.type || getResourceTypeFromTemplate(card.resource_template_id ?? undefined);
  if (!type || type === 'unknown') return undefined;
  const url = getResourceUrl(type, card.id);
  return url && url !== '#' ? url : undefined;
}

/** Une fiche liée ({id,title,thumbnail...}) -> une valeur Omeka S (resource liée ou littéral/uri). */
function cardToOmekaEntry(card: ItemPageCard): OmekaLikeValue {
  if (card.id != null) {
    const thumb = resolveOmekaThumbnail(card.thumbnail ?? undefined) ?? undefined;
    return {
      type: 'resource',
      value_resource_id: card.id,
      display_title: card.title,
      thumbnail_url: thumb,
      thumbnail_display_urls: thumb ? { square: thumb, medium: thumb, large: thumb } : undefined,
    };
  }
  if (card.url) return uriEntry(card.url, card.title || undefined);
  return literalEntry(card.title || '');
}

/** Fiche cache pour resourceCache[id] — même forme que cacheLinkedOmekaResource() (legacy). */
function cardToResourceCacheEntry(card: ItemPageCard, contributorFieldKey?: string): Record<string, unknown> | null {
  if (card.id == null) return null;
  const templateId = card.resource_template_id ?? undefined;
  const contributorType = contributorFieldKey ? getContributorDisplayType(templateId) : undefined;
  const resourceType = card.type || contributorType || getResourceTypeFromTemplate(templateId);
  const thumb = resolveOmekaThumbnail(card.thumbnail ?? undefined) ?? undefined;
  const externalUrl = card.url ?? undefined;
  return {
    id: card.id,
    title: card.title,
    name: card.title,
    thumbnail: thumb,
    thumbnailUrl: thumb,
    picture: thumb,
    class: templateId,
    template: templateId,
    resource_template_id: templateId,
    type: resourceType,
    date: card.date ?? undefined,
    url: cardResourceUrl(card) ?? externalUrl,
    externalLink: externalUrl,
    actants: card.actants?.map((actant) => ({
      ...actant,
      picture: resolveOmekaThumbnail(actant.picture ?? undefined) ?? actant.picture ?? undefined,
    })),
    ownerId: card.owner_id ?? undefined,
  };
}

/** Fiche référence (bibliographie/médiagraphie) déjà enrichie par le backend -> forme attendue par Bibliographies/Mediagraphies. */
function referenceCardToEnriched(ref: ItemPageReferenceCard): Record<string, unknown> {
  const templateId = ref.resource_template_id ?? undefined;
  const thumb = resolveOmekaThumbnail(ref.thumbnail ?? undefined) ?? undefined;
  return {
    id: ref.id,
    'o:id': ref.id,
    title: ref.title,
    thumbnail: thumb,
    thumbnailUrl: thumb,
    class: templateId,
    template: templateId,
    resource_template_id: templateId,
    type: getResourceTypeFromTemplate(templateId),
    creator: ref.creator ?? [],
    date: ref.date ?? null,
    publisher: ref.publisher ?? null,
    editor: ref.editor ?? null,
    volume: ref.volume ?? null,
    issue: ref.issue ?? null,
    pages: ref.pages ?? null,
    ispartof: ref.isPartOf ?? null,
    source: ref.source ?? null,
    number: ref.number ?? null,
    mediagraphyType: ref.mediagraphyType ?? null,
    url: cardResourceUrl(ref) ?? ref.externalUrl ?? undefined,
    uri: ref.externalUrl ?? undefined,
    externalLink: ref.externalUrl ?? undefined,
    ownerId: ref.owner_id ?? undefined,
  };
}

/** Miroir de applyEnrichedLinkedProperties (simplifiedConfigAdapter.tsx) : propriété Omeka -> clé enrichie lue par les vues. */
const ENRICHED_PROPERTY_TARGETS: Record<string, string> = {
  'dcterms:bibliographicCitation': 'bibliographicCitations',
  'dcterms:references': 'references',
  'dcterms:source': 'sources',
  'schema:review': 'reviews',
  'schema:documentation': 'documentations',
  'schema:associatedMedia': 'associatedMediaRefs',
  'schema:isRelatedTo': 'relatedResources',
};

// ========================================================================
// Reconstruction complète de itemDetails/resourceCache/keywords
// ========================================================================

interface BuiltItemDetails {
  itemDetails: Record<string, unknown>;
  resourceCache: Record<number, unknown>;
  keywords: { id: number; title: string; short_resume: string }[];
}

function buildItemDetailsFromItemPage(
  page: ItemPageData,
  config: SimplifiedDetailConfig,
  fields: InternalFieldConfig[],
): BuiltItemDetails {
  const itemDetails: Record<string, unknown> = {
    'o:id': page.id,
    'o:title': page.title,
    'o:resource_template': { 'o:id': page.resource_template_id },
    'o:owner': page.owner_id != null ? { 'o:id': page.owner_id } : undefined,
    title: page.title,
    id: page.id,
    ownerId: page.owner_id ?? undefined,
  };
  const resourceCache: Record<number, unknown> = {};
  // Cartes brutes par propriété Omeka — utilisées ensuite pour les clés "enrichies" (references, relatedResources...).
  const cardsByProperty: Record<string, ItemPageCard[]> = {};

  const mergeCardsIntoCache = (cards: ItemPageCard[], contributorFieldKey?: string) => {
    cards.forEach((card) => {
      if (card.id == null) return;
      const entry = cardToResourceCacheEntry(card, contributorFieldKey);
      if (!entry) return;
      const existing = resourceCache[card.id] as Record<string, unknown> | undefined;
      if (!existing) {
        resourceCache[card.id] = entry;
        return;
      }
      if (!existing.thumbnailUrl && entry.thumbnailUrl) {
        existing.thumbnail = entry.thumbnailUrl;
        existing.thumbnailUrl = entry.thumbnailUrl;
        existing.picture = entry.thumbnailUrl;
      }
      if ((!existing.title || String(existing.title).startsWith('Item #')) && entry.title) {
        existing.title = entry.title;
        existing.name = entry.title;
      }
    });
  };

  const handledFieldKeys = new Set(fields.map((f) => f.key));

  // --- Champs déclarés (SimplifiedFieldsMapping) ---
  fields.forEach((field) => {
    if (field.key === 'media') return; // géré séparément (associatedMedia top-level)
    const fastField: ItemPageField | undefined = page.fields[field.key];
    if (!fastField) return;

    if (fastField.type === 'resources') {
      itemDetails[field.property] = fastField.items.map(cardToOmekaEntry);
      cardsByProperty[field.property] = fastField.items;
      mergeCardsIntoCache(fastField.items, field.key === 'contributors' ? field.key : undefined);
    } else {
      itemDetails[field.property] = scalarToOmekaEntries(field, fastField.value);
    }
  });

  // Champs renvoyés par le backend mais absents de SimplifiedDetailConfig.fields
  // (ex: contributors via contributorButtons seulement, sans champ formulaire dédié).
  const contributorProperty = config.contributorButtons?.[0]?.property;
  const contributorsField = page.fields.contributors;
  if (
    contributorProperty &&
    contributorsField?.type === 'resources' &&
    !itemDetails[contributorProperty]
  ) {
    itemDetails[contributorProperty] = contributorsField.items.map(cardToOmekaEntry);
    cardsByProperty[contributorProperty] = contributorsField.items;
    mergeCardsIntoCache(contributorsField.items, 'contributors');
  }

  Object.entries(page.fields).forEach(([key, fastField]) => {
    if (handledFieldKeys.has(key) || key === 'contributors') return;
    const simplifiedField =
      config.fields && typeof config.fields === 'object' && !Array.isArray(config.fields)
        ? config.fields[key as keyof typeof config.fields]
        : undefined;
    const property =
      simplifiedField && typeof simplifiedField === 'object' && 'property' in simplifiedField
        ? simplifiedField.property
        : undefined;
    if (!property || itemDetails[property]) return;
    if (fastField.type === 'resources') {
      itemDetails[property] = fastField.items.map(cardToOmekaEntry);
      cardsByProperty[property] = fastField.items;
      mergeCardsIntoCache(fastField.items);
    } else if (fastField.type === 'text') {
      itemDetails[property] = scalarToOmekaEntries({ property, type: 'text' } as InternalFieldConfig, fastField.value);
    }
  });

  // --- Vues déclarées (SimplifiedViewConfig) ---
  (config.views ?? []).forEach((view) => {
    const fastView: ItemPageView | undefined = page.views[view.key];
    if (!fastView) return;

    switch (fastView.type) {
      case 'items': {
        if (!view.property) break;
        itemDetails[view.property] = fastView.items.map(cardToOmekaEntry);
        cardsByProperty[view.property] = fastView.items;
        mergeCardsIntoCache(fastView.items);
        break;
      }
      case 'references': {
        if (!view.property) break;
        itemDetails[view.property] = fastView.items.map(cardToOmekaEntry);
        const enrichedKey = ENRICHED_PROPERTY_TARGETS[view.property] ?? view.property;
        itemDetails[enrichedKey] = fastView.items.map(referenceCardToEnriched);
        fastView.items.forEach((ref) => {
          if (ref.id != null && !resourceCache[ref.id]) {
            resourceCache[ref.id] = referenceCardToEnriched(ref);
          }
        });
        break;
      }
      case 'categories': {
        (view.categories ?? []).forEach((category) => {
          category.subcategories.forEach((sub) => {
            const entry = fastView.values[sub.key];
            itemDetails[sub.property] = (entry?.values ?? []).map(literalEntry);
          });
        });
        break;
      }
      case 'text': {
        if (!view.property) break;
        itemDetails[view.property] = fastView.value ? [literalEntry(fastView.value)] : [];
        break;
      }
      case 'vocabGroup': {
        (view.vocabFields ?? []).forEach((vocabField) => {
          const values = fastView.values[vocabField.property] ?? [];
          itemDetails[vocabField.property] = values.map(literalEntry);
        });
        break;
      }
      case 'microresumes': {
        itemDetails.microResumes = fastView.items;
        break;
      }
      case 'citations': {
        itemDetails.citations = fastView.items;
        break;
      }
      case 'usedBy': {
        itemDetails.usedBy = fastView.items
          .filter((item) => item.id != null)
          .map((item) => resourceCache[item.id as number] ?? cardToResourceCacheEntry(item))
          .filter(Boolean);
        mergeCardsIntoCache(fastView.items);
        break;
      }
      default:
        break;
    }
  });

  // Vues présentes côté backend mais non déclarées dans SimplifiedDetailConfig (ex: usedBy outil)
  const declaredViewKeys = new Set((config.views ?? []).map((v) => v.key));
  Object.entries(page.views).forEach(([viewKey, fastView]) => {
    if (declaredViewKeys.has(viewKey)) return;
    if (fastView.type === 'usedBy') {
      mergeCardsIntoCache(fastView.items);
      itemDetails.usedBy = fastView.items
        .filter((item) => item.id != null)
        .map((item) => resourceCache[item.id as number] ?? cardToResourceCacheEntry(item))
        .filter(Boolean);
    }
  });

  // --- Propriétés "enrichies" dérivées de champs (ex: schema:isRelatedTo -> relatedResources) ---
  Object.entries(ENRICHED_PROPERTY_TARGETS).forEach(([omekaProperty, enrichedKey]) => {
    if (itemDetails[enrichedKey] !== undefined) return; // déjà rempli par une vue 'references'
    const cards = cardsByProperty[omekaProperty];
    if (cards) {
      itemDetails[enrichedKey] = cards
        .map((card) => (card.id != null ? resourceCache[card.id] : null))
        .filter(Boolean);
    }
  });

  // --- Médias (associatedMedia) ---
  // Conférences : schema:url prime sur tout autre média (vidéo de session en colonne gauche)
  if (config.templateId === 71) {
    const schemaUrlEntries = itemDetails['schema:url'];
    const firstSchemaUrlEntry = Array.isArray(schemaUrlEntries) ? schemaUrlEntries[0] : undefined;
    const sessionUrl =
      fieldValue(page.fields.sessionUrl) ??
      (typeof firstSchemaUrlEntry === 'object' && firstSchemaUrlEntry !== null
        ? (firstSchemaUrlEntry as { '@id'?: string })['@id']
        : null);
    if (sessionUrl) {
      itemDetails.associatedMedia = [sessionUrl];
      if (!Array.isArray(schemaUrlEntries) || schemaUrlEntries.length === 0) {
        itemDetails['schema:url'] = scalarToOmekaEntries(
          { property: 'schema:url', type: 'url' } as InternalFieldConfig,
          sessionUrl,
        );
      }
    } else {
      itemDetails.associatedMedia = flattenMediaUrls(page.associatedMedia);
    }
  } else {
    itemDetails.associatedMedia = flattenMediaUrls(page.associatedMedia);
  }

  // --- Mots-clés (jdc:hasConcept) ---
  const keywordsField = page.fields.keywords;
  const keywords =
    config.showKeywords && keywordsField?.type === 'resources'
      ? keywordsField.items
          .filter((item) => item.id != null)
          .map((item) => ({ id: item.id as number, title: item.title, short_resume: '' }))
      : [];

  return { itemDetails, resourceCache, keywords };
}

/** Repli si le backend SQL ne renvoie pas owner_id (colonne vide) alors que l'API Omeka l'a. */
async function hydrateOwnerFromOmekaApi(itemDetails: Record<string, unknown>, itemId: number): Promise<void> {
  if (getResourceOwnerId(itemDetails) != null) return;
  try {
    const response = await fetch(`${API_BASE}items/${itemId}`);
    if (!response.ok) return;
    const data = await response.json();
    const ownerId = data['o:owner']?.['o:id'];
    if (ownerId == null) return;
    itemDetails['o:owner'] = { 'o:id': ownerId };
    itemDetails.ownerId = ownerId;
  } catch {
    // silencieux — l'attribution reste masquée
  }
}

// ========================================================================
// Data fetchers (avec repli automatique sur l'ancien pipeline)
// ========================================================================

/**
 * Crée un DataFetcher/ProgressiveDataFetcher basé sur getItemPage, avec repli transparent
 * sur `fallback` si le template n'est pas couvert par ItemPageConfig (back) ou en cas d'erreur
 * réseau. `fallback` doit être le fetcher Omeka S standard (createOmekaDataFetcher) pour ce
 * même config — jamais null, afin de garantir qu'une ressource reste toujours affichable.
 */
export function createItemPageDataFetcher(
  config: SimplifiedDetailConfig,
  fields: InternalFieldConfig[],
  fallback: DataFetcher,
): DataFetcher {
  return async (id: string): Promise<FetchResult> => {
    try {
      const page = await getItemPage(id);
      if (!page || !page.supported) {
        return fallback(id);
      }

      const { itemDetails, resourceCache, keywords } = buildItemDetailsFromItemPage(page, config, fields);
      itemDetails.resourceCache = resourceCache;
      await hydrateOwnerFromOmekaApi(itemDetails, page.id);
      await enrichItemWithResourceOwner(itemDetails);

      return {
        itemDetails,
        keywords,
        recommendations: [],
        viewData: { resourceCache },
      };
    } catch (error) {
      console.error(`[itemPageFastFetcher] Erreur getItemPage(${id}), repli sur le fetcher standard:`, error);
      return fallback(id);
    }
  };
}

/**
 * Variante progressive : le nouveau backend renvoie tout en un seul appel, donc pas de réel
 * gain à découper l'affichage — on notifie onProgress dès que la réponse arrive, puis on
 * retourne le même résultat (signature compatible avec l'ancien pipeline progressif).
 */
export function createProgressiveItemPageDataFetcher(
  config: SimplifiedDetailConfig,
  fields: InternalFieldConfig[],
  fallback: ProgressiveDataFetcher,
): ProgressiveDataFetcher {
  return async (id: string, onProgress: ProgressCallback): Promise<FetchResult> => {
    try {
      const page = await getItemPage(id);
      if (!page || !page.supported) {
        return fallback(id, onProgress);
      }

      const { itemDetails, resourceCache, keywords } = buildItemDetailsFromItemPage(page, config, fields);
      itemDetails.resourceCache = resourceCache;
      await hydrateOwnerFromOmekaApi(itemDetails, page.id);
      await enrichItemWithResourceOwner(itemDetails);

      const result: FetchResult = {
        itemDetails,
        keywords,
        recommendations: [],
        viewData: { resourceCache },
      };
      onProgress(result);
      return result;
    } catch (error) {
      console.error(`[itemPageFastFetcher] Erreur getItemPage(${id}), repli sur le fetcher standard:`, error);
      return fallback(id, onProgress);
    }
  };
}

