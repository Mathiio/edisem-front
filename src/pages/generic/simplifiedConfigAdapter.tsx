/**
 * Adaptateur unifié pour convertir SimplifiedDetailConfig en GenericDetailPageConfig
 *
 * Ce fichier fournit:
 * - Une fonction de conversion unique `convertToGenericConfig`
 * - Un composant wrapper `SimpleDetailPage` prêt à l'emploi
 *
 * FONCTIONNALITÉS D'ÉDITION :
 * ✅ Sauvegarde complète vers l'API Omeka S (handleSave)
 * ✅ Gestion des ressources liées (loadResourceInfo, loadResourcesByTemplate)
 * ✅ Upload et suppression de médias (uploadMedia, deleteMedia)
 * ✅ Support pour le format de données de GenericDetailPage
 * ✅ Mapping automatique des propriétés simples vers Omeka S
 * ✅ Validation et gestion des erreurs
 */

import React from 'react';
import { Button } from '@heroui/react';
import { PlusIcon, CrossIcon } from '@/components/ui/icons';
import { getTemplatePropertiesMap } from '@/services/Items';
import { GenericDetailPageConfig, FetchResult, ViewOption, ProgressiveDataFetcher, ProgressCallback, FormFieldConfig, FormFieldType } from './config';
import { SimplifiedDetailConfig, SimplifiedViewConfig, InternalFieldConfig, FieldType, extractFieldsFromConfig } from './simplifiedConfig';
import { SimpleOverviewCard, SimpleDetailsCard, SimpleOverviewSkeleton, SimpleDetailsSkeleton } from './SimpleComponents';
import { ItemsList, SimpleTextBlock } from './components';
import { Bibliographies } from '@/components/features/conference/BibliographyCards';
import { Mediagraphies } from '@/components/features/conference/MediagraphyCards';
import { Citations } from '@/components/features/conference/CitationsCards';
import { Microresumes } from '@/components/features/conference/MicroresumesCards';
import { getResourceDetails } from '@/services/resourceDetails';

// ========================================
// Self-fetching wrappers for citations & microresumes
// ========================================

const CitationsView: React.FC<{ itemId: string | number; onTimeChange?: (time: number) => void }> = ({ itemId, onTimeChange }) => {
  const [citations, setCitations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    getResourceDetails(itemId)
      .then((details) => {
        if (!cancelled) setCitations(details?.citations || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [itemId]);

  if (!loading && citations.length === 0) return null;
  return <Citations citations={citations} loading={loading} onTimeChange={onTimeChange ?? (() => {})} />;
};

const MicroresumesView: React.FC<{ itemId: string | number; onTimeChange?: (time: number) => void }> = ({ itemId, onTimeChange }) => {
  const [microresumes, setMicroresumes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    getResourceDetails(itemId)
      .then((details) => {
        if (!cancelled) setMicroresumes(details?.microResumes || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [itemId]);

  if (!loading && microresumes.length === 0) return null;
  return <Microresumes microresumes={microresumes} loading={loading} onTimeChange={onTimeChange ?? (() => {})} />;
};
import { AddResourceCard } from '@/components/features/forms/AddResourceCard';
import { GenericDetailPage } from './GenericDetailPage';
import { getResourceUrl, getResourceConfigByTemplateId } from '@/config/resourceConfig';
import AutoResizingField from '@/components/features/database/AutoResizingTextarea';

// ========================================
// API Constants
// ========================================

const API_BASE = '/omk/api/';
const API_KEY = import.meta.env.VITE_API_KEY;
const API_IDENT = 'NUO2yCjiugeH7XbqwUcKskhE8kXg0rUj';

// ========================================
// Helpers pour extraire les valeurs Omeka S
// ========================================

/**
 * Extrait une valeur simple d'une propriété Omeka S
 */
export const getOmekaValue = (data: any, property: string): string | number | any[] | null => {
  if (!data || !property) return null;

  const propData = data[property];
  if (!propData) return null;

  if (Array.isArray(propData)) {
    if (propData.length === 0) return null;

    // Valeur texte simple
    if (propData[0]['@value'] !== undefined) {
      return propData[0]['@value'];
    }

    // Ressource liée avec display_title (retourner le titre lisible)
    if (propData[0].display_title !== undefined) {
      return propData.length === 1 ? propData[0].display_title : propData.map((v: any) => v.display_title).join(', ');
    }

    // URL/URI
    if (propData[0]['@id'] !== undefined) {
      return propData[0]['@id'];
    }

    // Ressource liée (fallback par IDs)
    if (propData[0].value_resource_id !== undefined) {
      return propData.map((v: any) => v.value_resource_id);
    }

    return propData;
  }

  return propData;
};

/**
 * Extrait TOUTES les valeurs texte d'une propriété (literal ou uri)
 */
export const getAllOmekaValues = (data: any, property: string): string[] => {
  if (!data || !property) return [];
  const propData = data[property];
  if (!Array.isArray(propData)) return [];
  return propData.filter((v: any) => v['@value'] !== undefined || v['@id'] !== undefined).map((v: any) => (v['@value'] !== undefined ? String(v['@value']) : String(v['@id'])));
};

/**
 * Extrait les IDs de ressources liées d'une propriété
 */
export const getResourceIds = (data: any, property: string): number[] => {
  if (!data || !property) return [];

  const propData = data[property];
  if (!Array.isArray(propData)) return [];

  return propData.filter((v: any) => v.value_resource_id !== undefined).map((v: any) => v.value_resource_id);
};

/**
 * Vérifie si une propriété contient des URIs
 */
const isUriProperty = (data: any, property: string): boolean => {
  if (!data || !property) return false;
  const propData = data[property];
  if (!Array.isArray(propData) || propData.length === 0) return false;
  return propData[0]?.type === 'uri' || propData[0]?.['@id'] !== undefined;
};

// ========================================
// Conversion InternalFieldConfig -> FormFieldConfig
// ========================================

const fieldTypeToFormType: Record<FieldType, FormFieldType> = {
  title: 'text',
  text: 'text',
  textarea: 'textarea',
  date: 'date',
  slider: 'slider',
  url: 'url',
  resource: 'multiselection',
  media: 'media',
  status: 'text',
  percentage: 'slider',
};

export const fieldToFormField = (field: InternalFieldConfig): FormFieldConfig => {
  // For URL type fields, use @id instead of @value (Omeka S stores URIs in @id)
  const dataPath = field.type === 'url' ? `${field.property}.0.@id` : `${field.property}.0.@value`;
  return {
    key: field.key,
    label: field.label,
    dataPath,
    type: fieldTypeToFormType[field.type] || 'text',
    required: field.required,
    placeholder: field.placeholder,
    min: field.min,
    max: field.max,
    step: field.step,
    selectionConfig: field.resourceTemplateId
      ? {
          resourceType: field.label,
          templateId: field.resourceTemplateId,
          multiple: field.multiSelect,
        }
      : undefined,
  };
};

// ========================================
// Fetch avec retry
// ========================================

async function fetchWithRetry(url: string, retries = 2, delay = 500): Promise<Response | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
      if (response.status >= 500 && i < retries) {
        console.warn(`Retry ${i + 1}/${retries} for ${url} (status ${response.status})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return null;
    } catch (error) {
      if (i < retries) {
        console.warn(`Retry ${i + 1}/${retries} for ${url} (network error)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      console.error(`Failed to fetch ${url} after ${retries} retries:`, error);
      return null;
    }
  }
  return null;
}

// ========================================
// Media Management Functions
// ========================================

/**
 * Uploader un nouveau média vers Omeka S
 */
export const uploadMedia = async (file: File, itemId: string): Promise<boolean> => {
  const url = `${API_BASE}media?key_identity=${API_IDENT}&key_credential=${API_KEY}`;

  const formData = new FormData();
  const mediaData = {
    'o:ingester': 'upload',
    'o:item': { 'o:id': parseInt(itemId) },
    file_index: '0',
  };
  formData.append('data', JSON.stringify(mediaData));
  formData.append('file[0]', file);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    return response.ok;
  } catch (err) {
    console.error('Erreur upload média:', err);
    return false;
  }
};

/**
 * Supprimer un média depuis Omeka S
 */
export const deleteMedia = async (mediaId: number): Promise<boolean> => {
  const url = `${API_BASE}media/${mediaId}?key_identity=${API_IDENT}&key_credential=${API_KEY}`;

  try {
    const response = await fetch(url, { method: 'DELETE' });
    return response.ok;
  } catch (err) {
    console.error('Erreur suppression média:', err);
    return false;
  }
};

// ========================================
// Linked Resources Management Functions
// ========================================

interface ResourceInfo {
  id: number;
  title: string;
  resourceClass?: string;
  thumbnailUrl?: string;
  templateId?: number;
}

/**
 * Charger les informations d'une ressource liée depuis Omeka S
 */
export const loadResourceInfo = async (resourceId: number): Promise<ResourceInfo | null> => {
  try {
    const res = await fetchWithRetry(`${API_BASE}items/${resourceId}`, 1, 300);
    if (!res || !res.ok) return null;

    const item = await res.json();

    let thumbnailUrl: string | undefined;
    if (item['thumbnail_display_urls']?.square) {
      thumbnailUrl = item['thumbnail_display_urls'].square;
    } else if (item['o:thumbnail']?.['o:id']) {
      const mediaRes = await fetchWithRetry(`${API_BASE}media/${item['o:thumbnail']['o:id']}`, 1, 300);
      if (mediaRes && mediaRes.ok) {
        const mediaData = await mediaRes.json();
        thumbnailUrl = mediaData['o:thumbnail_urls']?.square || mediaData['o:original_url'];
      }
    } else if (item['o:media']?.[0]?.['o:id']) {
      const mediaRes = await fetchWithRetry(`${API_BASE}media/${item['o:media'][0]['o:id']}`, 1, 300);
      if (mediaRes && mediaRes.ok) {
        const mediaData = await mediaRes.json();
        thumbnailUrl = mediaData['o:thumbnail_urls']?.square || mediaData['o:original_url'];
      }
    }

    return {
      id: resourceId,
      title: item['o:title'] || `Item #${resourceId}`,
      resourceClass: item['o:resource_class']?.['o:label'],
      templateId: item['o:resource_template']?.['o:id'],
      thumbnailUrl,
    };
  } catch (err) {
    console.error(`Erreur chargement ressource ${resourceId}:`, err);
    return { id: resourceId, title: `Item #${resourceId}` };
  }
};

/**
 * Charger toutes les ressources d'un template donné
 */
export const loadResourcesByTemplate = async (templateId: number, maxResults = 100): Promise<ResourceInfo[]> => {
  try {
    const url = `${API_BASE}items?resource_template_id=${templateId}&per_page=${maxResults}`;
    const response = await fetchWithRetry(url);

    if (!response || !response.ok) {
      console.error('Erreur chargement ressources par template');
      return [];
    }

    const items = await response.json();
    return items.map((item: any) => ({
      id: item['o:id'],
      title: item['o:title'] || `Item #${item['o:id']}`,
      resourceClass: item['o:resource_class']?.['o:label'],
      thumbnailUrl: item['thumbnail_display_urls']?.square,
      templateId: item['o:resource_template']?.['o:id'],
    }));
  } catch (err) {
    console.error('Erreur chargement ressources:', err);
    return [];
  }
};

/**
 * Export des fonctions de gestion pour utilisation externe
 */
export const resourceManagement = {
  loadResourceInfo,
  loadResourcesByTemplate,
};

// ========================================
// Helper Functions
// ========================================

/**
 * Détermine le type de ressource basé sur le template ID
 */
const getResourceTypeFromTemplate = (templateId: number | undefined): string => {
  if (!templateId) return 'unknown';
  const config = getResourceConfigByTemplateId(templateId);
  return config?.type || 'unknown';
};

/**
 * Extrait les créateurs au bon format depuis les données Omeka S
 */
const extractCreators = (resourceData: any): { first_name: string; last_name: string }[] => {
  const creators = resourceData['dcterms:creator'];
  if (!creators || !Array.isArray(creators)) return [];

  return creators.map((creator: any) => {
    const fullName = creator['@value'] || '';

    if (fullName.includes(',')) {
      const [last_name, first_name] = fullName.split(',').map((s: string) => s.trim());
      return { first_name: first_name || '', last_name: last_name || '' };
    } else {
      const parts = fullName.trim().split(' ');
      const last_name = parts.pop() || '';
      const first_name = parts.join(' ');
      return { first_name, last_name };
    }
  });
};

/**
 * Collecte les propriétés sources pour combiner plusieurs propriétés
 */
const collectSourceProperties = (fields: InternalFieldConfig[]): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  fields.forEach((field) => {
    if (field.sourceProperties && field.sourceProperties.length > 0) {
      result[field.key] = field.sourceProperties;
    }
  });
  return result;
};

// ========================================
// Data Fetcher générique pour Omeka S (PROGRESSIF)
// ========================================

const createProgressiveOmekaDataFetcher = (config: SimplifiedDetailConfig, fields: InternalFieldConfig[]): ProgressiveDataFetcher => {
  const fieldSourceProperties = collectSourceProperties(fields);

  return async (id: string, onProgress: ProgressCallback): Promise<FetchResult> => {
    try {
      // ÉTAPE 1 : Fetch de l'item principal
      const response = await fetchWithRetry(`${API_BASE}items/${id}`);
      if (!response || !response.ok) {
        throw new Error(`Erreur: Item ${id} non trouvé ou API indisponible`);
      }
      const data = await response.json();

      const enrichedData: any = { ...data };

      // ÉTAPE 2 : Charger les médias
      let associatedMedia: string[] = [];
      // 2a: Médias directs via o:media
      if (data['o:media'] && Array.isArray(data['o:media'])) {
        const mediaRefs = data['o:media'].slice(0, 10);
        const mediaPromises = mediaRefs.map(async (mediaRef: any) => {
          const mediaId = mediaRef['o:id'];
          if (mediaId) {
            try {
              const res = await fetchWithRetry(`${API_BASE}media/${mediaId}`, 1, 300);
              if (res && res.ok) {
                const mediaData = await res.json();
                // Pour les médias YouTube, utiliser o:source (URL YouTube)
                if (mediaData['o:ingester'] === 'youtube' && mediaData['o:source']) {
                  return mediaData['o:source'];
                }
                // Pour les autres médias, utiliser o:original_url
                return mediaData['o:original_url'];
              }
            } catch (err) {
              console.error(`Erreur chargement média ${mediaId}:`, err);
            }
          }
          return null;
        });

        const mediaUrls = await Promise.all(mediaPromises);
        associatedMedia = mediaUrls.filter(Boolean) as string[];
      }

      // 2b: Médias liés via schema:associatedMedia (prop 438) — utilisé par les récits
      // Ces items Omeka contiennent eux-mêmes des médias (YouTube, images, etc.)
      if (data['schema:associatedMedia']) {
        const linkedMediaIds = getResourceIds(data, 'schema:associatedMedia').slice(0, 10);
        const linkedMediaPromises = linkedMediaIds.map(async (itemId) => {
          try {
            const res = await fetchWithRetry(`${API_BASE}items/${itemId}`, 1, 300);
            if (!res || !res.ok) return null;
            const itemData = await res.json();
            // Priorité: URL YouTube via bibo:uri (certains items liés stockent la vidéo ici)
            const biboUri = itemData['bibo:uri']?.[0]?.['@id'];
            if (biboUri && (biboUri.includes('youtube.com') || biboUri.includes('youtu.be'))) {
              return biboUri;
            }
            // Chercher les médias de cet item lié
            if (itemData['o:media'] && Array.isArray(itemData['o:media'])) {
              for (const mediaRef of itemData['o:media']) {
                const mediaId = mediaRef['o:id'];
                if (mediaId) {
                  try {
                    const mediaRes = await fetchWithRetry(`${API_BASE}media/${mediaId}`, 1, 300);
                    if (mediaRes && mediaRes.ok) {
                      const mediaData = await mediaRes.json();
                      if (mediaData['o:ingester'] === 'youtube' && mediaData['o:source']) {
                        return mediaData['o:source'];
                      }
                      return mediaData['o:original_url'];
                    }
                  } catch (err) {
                    console.error(`Erreur chargement média lié ${mediaId}:`, err);
                  }
                }
              }
            }
            // Fallback: chercher une URL dans schema:url ou bibo:uri de l'item lié
            const linkedUrl = itemData['schema:url']?.[0]?.['@id'] || biboUri;
            if (linkedUrl) return linkedUrl;
          } catch (err) {
            console.error(`Erreur chargement item média ${itemId}:`, err);
          }
          return null;
        });

        const linkedMediaUrls = await Promise.all(linkedMediaPromises);
        associatedMedia = [...associatedMedia, ...linkedMediaUrls.filter(Boolean) as string[]];
      }

      // 2c: Fallback final — URL vidéo directe (schema:url sur l'item principal)
      if (associatedMedia.length === 0) {
        const videoUrl = data['schema:url']?.[0]?.['@id'];
        if (videoUrl) {
          associatedMedia = [videoUrl];
        }
      }

      // Trier les médias : vidéos YouTube en premier
      associatedMedia.sort((a, b) => {
        const aIsYT = a.includes('youtube.com') || a.includes('youtu.be') ? 0 : 1;
        const bIsYT = b.includes('youtube.com') || b.includes('youtu.be') ? 0 : 1;
        return aIsYT - bIsYT;
      });
      enrichedData.associatedMedia = associatedMedia;

      // ÉTAPE 2b : Charger les contributeurs EN PRIORITÉ (avant l'affichage)
      const contributorProperties = ['schema:agent', 'jdc:hasActant', 'dcterms:contributor', 'schema:contributor', 'cito:credits'];
      const contributorIds = new Set<number>();
      contributorProperties.forEach((prop) => {
        const ids = getResourceIds(data, prop);
        ids.forEach((id) => contributorIds.add(id));
      });

      const resourceCache: { [id: number]: any } = {};

      // Charger tous les contributeurs en parallèle
      if (contributorIds.size > 0) {
        const contributorPromises = Array.from(contributorIds).map(async (resourceId) => {
          try {
            const res = await fetchWithRetry(`${API_BASE}items/${resourceId}`, 1, 300);
            if (!res || !res.ok) return;

            const resourceData = await res.json();

            let thumbnailUrl: string | undefined;
            // Essayer d'abord thumbnail_display_urls
            if (resourceData['thumbnail_display_urls']?.square) {
              thumbnailUrl = resourceData['thumbnail_display_urls'].square;
            }
            // Sinon essayer o:thumbnail
            else if (resourceData['o:thumbnail']?.['o:id']) {
              try {
                const thumbRes = await fetchWithRetry(`${API_BASE}media/${resourceData['o:thumbnail']['o:id']}`, 1, 300);
                if (thumbRes && thumbRes.ok) {
                  const thumbData = await thumbRes.json();
                  thumbnailUrl = thumbData['o:thumbnail_urls']?.square || thumbData['o:original_url'];
                }
              } catch (e) {
                console.error('Erreur chargement thumbnail:', e);
              }
            }
            // Sinon essayer le premier média
            else if (resourceData['o:media']?.[0]?.['o:id']) {
              try {
                const mediaRes = await fetchWithRetry(`${API_BASE}media/${resourceData['o:media'][0]['o:id']}`, 1, 300);
                if (mediaRes && mediaRes.ok) {
                  const mediaData = await mediaRes.json();
                  thumbnailUrl = mediaData['o:thumbnail_urls']?.square || mediaData['o:original_url'];
                }
              } catch (e) {
                console.error('Erreur chargement média:', e);
              }
            }

            const templateId = resourceData['o:resource_template']?.['o:id'];

            // Extraire prénom/nom pour les actants
            const firstname = resourceData['foaf:firstName']?.[0]?.['@value'] || resourceData['schema:givenName']?.[0]?.['@value'] || '';
            const lastname = resourceData['foaf:familyName']?.[0]?.['@value'] || resourceData['schema:familyName']?.[0]?.['@value'] || '';

            resourceCache[resourceId] = {
              id: resourceId,
              title: resourceData['o:title'] || `${firstname} ${lastname}`.trim() || `Item #${resourceId}`,
              name: resourceData['o:title'] || `${firstname} ${lastname}`.trim(),
              firstname,
              lastname,
              picture: thumbnailUrl,
              thumbnail: thumbnailUrl,
              thumbnailUrl,
              type: templateId === 96 ? 'actant' : templateId === 72 ? 'student' : 'personne',
              template: templateId,
              resource_template_id: templateId,
            };
          } catch (err) {
            console.error(`Erreur chargement contributeur ${resourceId}:`, err);
          }
        });

        await Promise.all(contributorPromises);
      }

      enrichedData.resourceCache = resourceCache;

      // AFFICHAGE IMMÉDIAT (avec les contributeurs déjà chargés)
      onProgress({
        itemDetails: enrichedData,
        viewData: { rawData: data, resourceCache },
      });

      // ÉTAPE 3 : Charger les keywords
      let keywords: any[] = [];
      if (config.showKeywords && data['jdc:hasConcept']) {
        const ids = getResourceIds(data, 'jdc:hasConcept').slice(0, 15);
        const keywordPromises = ids.map(async (kidId) => {
          try {
            const res = await fetchWithRetry(`${API_BASE}items/${kidId}`, 1, 300);
            if (res && res.ok) {
              const kw = await res.json();
              return {
                id: kw['o:id'],
                title: kw['o:title'],
                short_resume: kw['dcterms:description']?.[0]?.['@value'] || '',
              };
            }
          } catch (err) {
            console.error(`Erreur chargement keyword ${kidId}:`, err);
          }
          return null;
        });

        keywords = (await Promise.all(keywordPromises)).filter(Boolean);
        onProgress({ keywords });
      } else {
        onProgress({ keywords: [] });
      }

      // ÉTAPE 4 : Combiner les propriétés
      Object.entries(fieldSourceProperties).forEach(([, sourceProperties]) => {
        const allResourceIds: number[] = [];
        sourceProperties.forEach((prop: string) => {
          const ids = getResourceIds(data, prop);
          allResourceIds.push(...ids);
        });

        const uniqueIds = [...new Set(allResourceIds)];
        if (uniqueIds.length > 0) {
          const combinedValues = uniqueIds.map((id) => ({
            type: 'resource',
            value_resource_id: id,
          }));
          const mainProperty = sourceProperties[0];
          enrichedData[mainProperty] = combinedValues;
        }
      });

      // ÉTAPE 5 : Charger les autres ressources liées par batches (sauf contributeurs déjà chargés)
      const allResourceIds = new Set<number>();
      Object.entries(data).forEach(([, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v: any) => {
            if (v.value_resource_id !== undefined) {
              allResourceIds.add(v.value_resource_id);
            }
          });
        }
      });

      // Filtrer les IDs déjà chargés (contributeurs)
      const resourceIds = Array.from(allResourceIds)
        .filter((id) => !resourceCache[id])
        .slice(0, 30);
      const batchSize = 5;

      for (let i = 0; i < resourceIds.length; i += batchSize) {
        const batch = resourceIds.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (resourceId) => {
            try {
              const res = await fetchWithRetry(`${API_BASE}items/${resourceId}`, 1, 300);
              if (!res || !res.ok) return;

              const resourceData = await res.json();

              let thumbnailUrl: string | undefined;
              if (resourceData['thumbnail_display_urls']?.square) {
                thumbnailUrl = resourceData['thumbnail_display_urls'].square;
              }

              const templateId = resourceData['o:resource_template']?.['o:id'];
              const resourceType = getResourceTypeFromTemplate(templateId);
              const externalUrl = resourceData['schema:url']?.[0]?.['@id'];
              const internalUrl = getResourceUrl(resourceType, resourceId);

              resourceCache[resourceId] = {
                id: resourceId,
                title: resourceData['o:title'] || `Item #${resourceId}`,
                thumbnail: thumbnailUrl,
                thumbnailUrl,
                class: templateId,
                template: templateId,
                resource_template_id: templateId,
                type: resourceType,
                creator: extractCreators(resourceData),
                date: resourceData['dcterms:date']?.[0]?.['@value'] || null,
                publisher: resourceData['dcterms:publisher']?.[0]?.['@value'] || null,
                editor: resourceData['bibo:editor']?.[0]?.['@value'] || null,
                source: resourceData['dcterms:source']?.[0]?.['@value'] || null,
                pages: resourceData['bibo:pages']?.[0]?.['@value'] || null,
                ispartof: resourceData['dcterms:isPartOf']?.[0]?.['@value'] || null,
                volume: resourceData['bibo:volume']?.[0]?.['@value'] || null,
                issue: resourceData['bibo:issue']?.[0]?.['@value'] || null,
                number: resourceData['bibo:number']?.[0]?.['@value'] || null,
                mediagraphyType: resourceData['edisem:typeMediagraphie']?.[0]?.['@value'] || null,
                url: resourceData['bibo:uri']?.[0]?.['@id'] || externalUrl || internalUrl,
              };
            } catch (err) {
              console.error(`Erreur chargement ressource ${resourceId}:`, err);
            }
          }),
        );

        enrichedData.resourceCache = resourceCache;

        if (data['dcterms:bibliographicCitation']) {
          const citationIds = getResourceIds(data, 'dcterms:bibliographicCitation');
          enrichedData.bibliographicCitations = citationIds.map((id) => resourceCache[id]).filter(Boolean);
        }

        if (data['dcterms:references']) {
          const referenceIds = getResourceIds(data, 'dcterms:references');
          enrichedData.references = referenceIds.map((id) => resourceCache[id]).filter(Boolean);
        }

        if (data['dcterms:source']) {
          const sourceIds = getResourceIds(data, 'dcterms:source');
          enrichedData.sources = sourceIds.map((id) => resourceCache[id]).filter(Boolean);
        }

        if (data['schema:review']) {
          const reviewIds = getResourceIds(data, 'schema:review');
          enrichedData.reviews = reviewIds.map((id) => resourceCache[id]).filter(Boolean);
        }

        onProgress({
          itemDetails: enrichedData,
          viewData: { rawData: data, resourceCache },
        });
      }

      return {
        itemDetails: enrichedData,
        keywords,
        recommendations: [],
        viewData: { rawData: data, resourceCache },
      };
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      throw error;
    }
  };
};

// ========================================
// Data Fetcher générique pour Omeka S (NON-PROGRESSIF)
// ========================================

const createOmekaDataFetcher = (config: SimplifiedDetailConfig, fields: InternalFieldConfig[]) => {
  const fieldSourceProperties = collectSourceProperties(fields);

  return async (id: string): Promise<FetchResult> => {
    try {
      const response = await fetchWithRetry(`${API_BASE}items/${id}`);
      if (!response || !response.ok) {
        throw new Error(`Erreur: Item ${id} non trouvé ou API indisponible`);
      }
      const data = await response.json();

      const enrichedData: any = { ...data };

      // Charger les médias
      let associatedMedia: string[] = [];
      // Médias directs via o:media
      if (data['o:media'] && Array.isArray(data['o:media'])) {
        const mediaRefs = data['o:media'].slice(0, 10);
        const mediaPromises = mediaRefs.map(async (mediaRef: any) => {
          const mediaId = mediaRef['o:id'];
          if (mediaId) {
            try {
              const res = await fetchWithRetry(`${API_BASE}media/${mediaId}`, 1, 300);
              if (res && res.ok) {
                const mediaData = await res.json();
                if (mediaData['o:ingester'] === 'youtube' && mediaData['o:source']) {
                  return mediaData['o:source'];
                }
                return mediaData['o:original_url'];
              }
            } catch (err) {
              console.error(`Erreur chargement média ${mediaId}:`, err);
            }
          }
          return null;
        });

        const mediaUrls = await Promise.all(mediaPromises);
        associatedMedia = mediaUrls.filter(Boolean) as string[];
      }

      // Médias liés via schema:associatedMedia (utilisé par les récits)
      if (data['schema:associatedMedia']) {
        const linkedMediaIds = getResourceIds(data, 'schema:associatedMedia').slice(0, 10);
        const linkedMediaPromises = linkedMediaIds.map(async (itemId) => {
          try {
            const res = await fetchWithRetry(`${API_BASE}items/${itemId}`, 1, 300);
            if (!res || !res.ok) return null;
            const itemData = await res.json();
            // Priorité: URL YouTube via bibo:uri
            const biboUri = itemData['bibo:uri']?.[0]?.['@id'];
            if (biboUri && (biboUri.includes('youtube.com') || biboUri.includes('youtu.be'))) {
              return biboUri;
            }
            if (itemData['o:media'] && Array.isArray(itemData['o:media'])) {
              for (const mediaRef of itemData['o:media']) {
                const mediaId = mediaRef['o:id'];
                if (mediaId) {
                  try {
                    const mediaRes = await fetchWithRetry(`${API_BASE}media/${mediaId}`, 1, 300);
                    if (mediaRes && mediaRes.ok) {
                      const mediaData = await mediaRes.json();
                      if (mediaData['o:ingester'] === 'youtube' && mediaData['o:source']) {
                        return mediaData['o:source'];
                      }
                      return mediaData['o:original_url'];
                    }
                  } catch (err) {
                    console.error(`Erreur chargement média lié ${mediaId}:`, err);
                  }
                }
              }
            }
            const linkedUrl = itemData['schema:url']?.[0]?.['@id'] || biboUri;
            if (linkedUrl) return linkedUrl;
          } catch (err) {
            console.error(`Erreur chargement item média ${itemId}:`, err);
          }
          return null;
        });

        const linkedMediaUrls = await Promise.all(linkedMediaPromises);
        associatedMedia = [...associatedMedia, ...linkedMediaUrls.filter(Boolean) as string[]];
      }

      // Fallback: URL vidéo directe (schema:url)
      if (associatedMedia.length === 0) {
        const videoUrl = data['schema:url']?.[0]?.['@id'];
        if (videoUrl) {
          associatedMedia = [videoUrl];
        }
      }

      // Trier les médias : vidéos YouTube en premier
      associatedMedia.sort((a, b) => {
        const aIsYT = a.includes('youtube.com') || a.includes('youtu.be') ? 0 : 1;
        const bIsYT = b.includes('youtube.com') || b.includes('youtu.be') ? 0 : 1;
        return aIsYT - bIsYT;
      });
      enrichedData.associatedMedia = associatedMedia;

      // Charger les keywords
      let keywords: any[] = [];
      if (config.showKeywords && data['jdc:hasConcept']) {
        const ids = getResourceIds(data, 'jdc:hasConcept').slice(0, 15);
        const keywordPromises = ids.map(async (kidId) => {
          try {
            const res = await fetchWithRetry(`${API_BASE}items/${kidId}`, 1, 300);
            if (res && res.ok) {
              const kw = await res.json();
              return {
                id: kw['o:id'],
                title: kw['o:title'],
                short_resume: kw['dcterms:description']?.[0]?.['@value'] || '',
              };
            }
          } catch (err) {
            console.error(`Erreur chargement keyword ${kidId}:`, err);
          }
          return null;
        });

        keywords = (await Promise.all(keywordPromises)).filter(Boolean);
      }

      // Combiner les propriétés
      Object.entries(fieldSourceProperties).forEach(([, sourceProperties]) => {
        const allResourceIds: number[] = [];
        sourceProperties.forEach((prop: string) => {
          const ids = getResourceIds(data, prop);
          allResourceIds.push(...ids);
        });

        const uniqueIds = [...new Set(allResourceIds)];
        if (uniqueIds.length > 0) {
          const combinedValues = uniqueIds.map((id) => ({
            type: 'resource',
            value_resource_id: id,
          }));
          const mainProperty = sourceProperties[0];
          enrichedData[mainProperty] = combinedValues;
        }
      });

      // Charger les ressources liées
      const allResourceIds = new Set<number>();
      Object.entries(data).forEach(([, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v: any) => {
            if (v.value_resource_id !== undefined) {
              allResourceIds.add(v.value_resource_id);
            }
          });
        }
      });

      const resourceIds = Array.from(allResourceIds).slice(0, 30);
      const resourceCache: { [id: number]: any } = {};
      const batchSize = 5;

      for (let i = 0; i < resourceIds.length; i += batchSize) {
        const batch = resourceIds.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (resourceId) => {
            try {
              const res = await fetchWithRetry(`${API_BASE}items/${resourceId}`, 1, 300);
              if (!res || !res.ok) return;

              const resourceData = await res.json();

              let thumbnailUrl: string | undefined;
              if (resourceData['thumbnail_display_urls']?.square) {
                thumbnailUrl = resourceData['thumbnail_display_urls'].square;
              }

              const templateId = resourceData['o:resource_template']?.['o:id'];
              const resourceType = getResourceTypeFromTemplate(templateId);
              const externalUrl = resourceData['schema:url']?.[0]?.['@id'];
              const internalUrl = getResourceUrl(resourceType, resourceId);

              resourceCache[resourceId] = {
                id: resourceId,
                title: resourceData['o:title'] || `Item #${resourceId}`,
                thumbnail: thumbnailUrl,
                thumbnailUrl,
                class: templateId,
                template: templateId,
                resource_template_id: templateId,
                type: resourceType,
                creator: extractCreators(resourceData),
                date: resourceData['dcterms:date']?.[0]?.['@value'] || null,
                publisher: resourceData['dcterms:publisher']?.[0]?.['@value'] || null,
                editor: resourceData['bibo:editor']?.[0]?.['@value'] || null,
                source: resourceData['dcterms:source']?.[0]?.['@value'] || null,
                pages: resourceData['bibo:pages']?.[0]?.['@value'] || null,
                ispartof: resourceData['dcterms:isPartOf']?.[0]?.['@value'] || null,
                volume: resourceData['bibo:volume']?.[0]?.['@value'] || null,
                issue: resourceData['bibo:issue']?.[0]?.['@value'] || null,
                number: resourceData['bibo:number']?.[0]?.['@value'] || null,
                mediagraphyType: resourceData['edisem:typeMediagraphie']?.[0]?.['@value'] || null,
                url: externalUrl || internalUrl,
              };
            } catch (err) {
              console.error(`Erreur chargement ressource ${resourceId}:`, err);
            }
          }),
        );
      }

      enrichedData.resourceCache = resourceCache;

      if (data['dcterms:bibliographicCitation']) {
        const citationIds = getResourceIds(data, 'dcterms:bibliographicCitation');
        enrichedData.bibliographicCitations = citationIds.map((id) => resourceCache[id]).filter(Boolean);
      }

      if (data['dcterms:references']) {
        const referenceIds = getResourceIds(data, 'dcterms:references');
        enrichedData.references = referenceIds.map((id) => resourceCache[id]).filter(Boolean);
      }

      if (data['dcterms:source']) {
        const sourceIds = getResourceIds(data, 'dcterms:source');
        enrichedData.sources = sourceIds.map((id) => resourceCache[id]).filter(Boolean);
      }

      if (data['schema:review']) {
        const reviewIds = getResourceIds(data, 'schema:review');
        enrichedData.reviews = reviewIds.map((id) => resourceCache[id]).filter(Boolean);
      }

      return {
        itemDetails: enrichedData,
        keywords,
        recommendations: [],
        viewData: { rawData: data, resourceCache },
      };
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      throw error;
    }
  };
};

// ========================================
// Créer une ViewOption à partir d'une SimplifiedViewConfig
// ========================================

const createViewFromSimpleView = (view: SimplifiedViewConfig): ViewOption => {
  return {
    key: view.key,
    title: view.title,
    editable: view.editable !== false,
    resourceLabel: view.title,
    resourceTemplateId: view.resourceTemplateId,
    resourceTemplateIds: view.resourceTemplateIds,
    renderContent: (context) => {
      const { itemDetails, loadingViews, isEditing, onLinkExisting, onCreateNew, onRemoveItem, onItemsChange, onEditResource, updatedResources, onTimeChange } = context;
      switch (view.renderType) {
        case 'items': {
          let resourceIds = getResourceIds(itemDetails, view.property || '');
          const resourceCache = itemDetails.resourceCache || {};

          // En mode édition, vérifier les ressources ajoutées via formData
          if (isEditing && itemDetails[view.key] && Array.isArray(itemDetails[view.key])) {
            const formDataItems = itemDetails[view.key];
            const formDataIds = formDataItems.map((item: any) => item['o:id'] || item.id).filter((id: any) => id && !resourceIds.includes(id));
            resourceIds = [...resourceIds, ...formDataIds];

            formDataItems.forEach((item: any) => {
              const id = item['o:id'] || item.id;
              if (id && !resourceCache[id]) {
                resourceCache[id] = {
                  title: item['dcterms:title']?.[0]?.['@value'] || item['o:title'] || item.title || `Item #${id}`,
                  thumbnailUrl: item['thumbnail_display_urls']?.square || item.thumbnail,
                };
              }
            });
          }

          const items = resourceIds.map((id) => {
            const cached = resourceCache[id];
            // Check for updates first
            const update = updatedResources?.[id];

            return {
              id,
              title: update?.title || cached?.title || `Item #${id}`,
              thumbnail: update?.thumbnail || cached?.thumbnailUrl,
              url: cached?.url,
            };
          });

          // Extraire aussi les URIs (liens externes) de la propriété
          const propData = itemDetails[view.property || ''];
          const uriItems = Array.isArray(propData)
            ? propData
                .filter((v: any) => v.type === 'uri' && v['@id'])
                .map((v: any, i: number) => ({
                  id: `uri-${i}`,
                  title: v['o:label'] || v['@id'],
                  url: v['@id'],
                }))
            : [];

          const allItems = [...items, ...uriItems];

          const mapUrl = view.urlPattern ? (item: any) => view.urlPattern!.replace(':id', item.id) : undefined;

          return (
            <ItemsList
              items={allItems}
              mapUrl={mapUrl}
              loading={loadingViews}
              isEditing={isEditing}
              resourceLabel={view.title}
              onLinkExisting={onLinkExisting ? () => onLinkExisting(view.key) : undefined}
              onCreateNew={onCreateNew ? () => onCreateNew(view.key) : undefined}
              onRemoveItem={onRemoveItem ? (id: string | number) => onRemoveItem(view.key, id) : undefined}
              onEdit={onEditResource ? (id: string | number) => onEditResource(view.key, id) : undefined}
            />
          );
        }

        case 'text': {
          let text: string;
          if (isEditing && typeof itemDetails[view.property || ''] === 'string') {
            text = itemDetails[view.property || ''];
          } else {
            const omekaValue = getOmekaValue(itemDetails, view.property || '');
            text = typeof omekaValue === 'string' ? omekaValue : '';
          }

          if (isEditing && view.editable !== false) {
            return (
              <div className='w-full'>
                <AutoResizingField
                  textareaProps={{
                    className:
                      'w-full min-h-[150px] !bg-c1 hover:!bg-c1 border-2 border-c3 rounded-12 text-c6 !text-16 resize-y data-[hover=true]:bg-c2 data-[focus=true]:border-0 data-[focus=true]:outline-none',
                    classNames: {
                      inputWrapper: 'bg-c1 rounded-12 text-c6 text-16 resize-y data-[hover=true]:bg-c2 data-[focus=true]:border-0',
                      input: 'text-c6 !text-16 resize-y !outline-none data-[focus=true]:outline-none',
                      innerWrapper: 'px-20 py-20 data-[focus=true]:border-0 data-[focus=true]:outline-none !focus-visible:outline-hidden',
                      base: 'bg-c1 rounded-12 text-c6 text-16 resize-y data-[hover=true]:bg-c2 data-[focus=true]:border-0 data-[focus=true]:outline-none',
                    },
                  }}
                  value={text || ''}
                  onChange={(e) => onItemsChange?.(view.key, [{ value: e.target.value, dataPath: view.property }])}
                  placeholder={view.emptyMessage || 'Saisissez du contenu...'}
                  isReadOnly={false}
                />
              </div>
            );
          }

          if (!text || text.trim() === '') {
            return null;
          }
          return <SimpleTextBlock content={text} />;
        }

        case 'references': {
          const enrichedPropertyMap: Record<string, string> = {
            'dcterms:bibliographicCitation': 'bibliographicCitations',
            'dcterms:references': 'references',
            'dcterms:source': 'sources',
            'schema:review': 'reviews',
          };

          const enrichedProperty = enrichedPropertyMap[view.property || ''];
          let refs = enrichedProperty ? itemDetails?.[enrichedProperty] : null;

          if (!refs || refs.length === 0) {
            refs = itemDetails?.[view.property || ''] || [];
          }

          if (isEditing && itemDetails[view.key] && Array.isArray(itemDetails[view.key])) {
            const formDataItems = itemDetails[view.key];
            const existingIds = refs.map((r: any) => r.id || r['o:id']);
            const newRefs = formDataItems.filter((item: any) => {
              const itemId = item.id || item['o:id'];
              return itemId && !existingIds.includes(itemId);
            });
            if (newRefs.length > 0) {
              refs = [...refs, ...newRefs];
            }
          }

          const mediagraphies = refs.filter((ref: any) => ref?.type === 'mediagraphie' || ref?.mediagraphyType);
          const bibliographies = refs.filter((ref: any) => {
            if (mediagraphies.includes(ref)) return false;
            if (ref?.type === 'bibliographie' || ref?.template || ref?.class || ref?.resource_template_id) return true;
            if ((ref?.['o:id'] || ref?.id) && (ref?.['o:title'] || ref?.title)) return true;
            return false;
          });

          const hasContent = mediagraphies.length > 0 || bibliographies.length > 0;
          const canEdit = isEditing && view.editable !== false;

          if (!hasContent && !canEdit) {
            return null;
          }

          return (
            <div className='space-y-6'>
              {mediagraphies.length > 0 && (
                <div>
                  <h3 className='text-lg text-c5 font-semibold mb-4'>Médias</h3>
                  <Mediagraphies items={mediagraphies} loading={loadingViews ?? false} notitle />
                </div>
              )}
              {bibliographies.length > 0 && (
                <div>
                  <h3 className='text-lg text-c5 font-semibold mb-4'>Bibliographies</h3>
                  <Bibliographies sections={[{ title: 'Bibliographies', bibliographies }]} loading={loadingViews ?? false} notitle />
                </div>
              )}
              {canEdit && onLinkExisting && (
                <AddResourceCard resourceLabel={view.title} onLinkExisting={() => onLinkExisting(view.key)} onCreateNew={() => onCreateNew?.(view.key)} />
              )}
            </div>
          );
        }

        case 'categories': {
          if (!view.categories || view.categories.length === 0) {
            return null;
          }

          const canEdit = isEditing && view.editable !== false;

          if (!canEdit) {
            const hasAnyContent = view.categories.some((category) =>
              category.subcategories.some((sub) => {
                const values = getAllOmekaValues(itemDetails, sub.property);
                return values.length > 0 && values.some((v) => v.trim() !== '');
              }),
            );

            if (!hasAnyContent) {
              return null;
            }
          }

          const showCategoryTitle = view.categories.length > 1;

          return (
            <div className='flex flex-col gap-25'>
              {view.categories.map((category) => {
                if (!canEdit) {
                  const categoryHasContent = category.subcategories.some((sub) => {
                    const values = getAllOmekaValues(itemDetails, sub.property);
                    return values.length > 0 && values.some((v) => v.trim() !== '');
                  });
                  if (!categoryHasContent) return null;
                }

                return (
                  <div key={category.key} className='flex flex-col gap-15'>
                    {showCategoryTitle && <h2 className='text-20 font-semibold text-c6'>{category.title}</h2>}
                    <div className='flex flex-col gap-20'>
                      {category.subcategories.map((subcategory) => {
                        const allValues = getAllOmekaValues(itemDetails, subcategory.property);

                        let editValues: string[] = allValues;
                        if (canEdit && itemDetails[subcategory.property] !== undefined) {
                          const formValue = itemDetails[subcategory.property];
                          if (Array.isArray(formValue)) {
                            editValues = formValue.map((v: any) => (typeof v === 'string' ? v : v['@value'] ?? ''));
                          }
                        }

                        if (canEdit) {
                          const displayValues = editValues.length > 0 ? editValues : [''];

                          return (
                            <div key={subcategory.key} className='flex flex-col gap-10'>
                              <h3 className='text-c6 font-semibold text-16'>{subcategory.label}</h3>

                              {displayValues.map((value, index) => (
                                <div key={index} className='flex gap-8 items-start'>
                                  <AutoResizingField
                                    textareaProps={{
                                      className:
                                        'w-full min-h-[80px] !bg-c1 hover:!bg-c1 border-2 border-c3 rounded-12 text-c6 !text-14 resize-y data-[hover=true]:bg-c2 data-[focus=true]:border-0 data-[focus=true]:outline-none',
                                      classNames: {
                                        inputWrapper: 'bg-c1 rounded-12 text-c6 text-14 resize-y data-[hover=true]:bg-c2 data-[focus=true]:border-0',
                                        input: 'text-c6 !text-14 resize-y !outline-none data-[focus=true]:outline-none',
                                        innerWrapper: 'px-15 py-15 data-[focus=true]:border-0 data-[focus=true]:outline-none !focus-visible:outline-hidden',
                                        base: 'bg-c1 rounded-12 text-c6 text-14 resize-y data-[hover=true]:bg-c2 data-[focus=true]:border-0 data-[focus=true]:outline-none',
                                      },
                                    }}
                                    value={value}
                                    onChange={(e) => {
                                      const newValues = [...displayValues];
                                      newValues[index] = e.target.value;
                                      onItemsChange?.(subcategory.property, newValues);
                                    }}
                                    placeholder={`Saisissez ${subcategory.label.toLowerCase()}...`}
                                    isReadOnly={false}
                                  />
                                  {(displayValues.length > 1 || value.trim() !== '') && (
                                    <Button
                                      isIconOnly
                                      size='sm'
                                      variant='light'
                                      className='mt-2 text-c4 hover:text-red-500'
                                      onPress={() => {
                                        const newValues = displayValues.filter((_, i) => i !== index);
                                        onItemsChange?.(subcategory.property, newValues.length > 0 ? newValues : ['']);
                                      }}>
                                      <CrossIcon size={16} />
                                    </Button>
                                  )}
                                </div>
                              ))}

                              <Button
                                size='sm'
                                variant='flat'
                                className='w-fit bg-c2 text-c5 hover:bg-c3'
                                startContent={<PlusIcon size={16} />}
                                onPress={() => {
                                  onItemsChange?.(subcategory.property, [...displayValues, '']);
                                }}>
                                Ajouter
                              </Button>
                            </div>
                          );
                        }

                        if (allValues.length === 0 || allValues.every((v) => v.trim() === '')) {
                          return null;
                        }

                        const isUri = isUriProperty(itemDetails, subcategory.property);

                        return (
                          <div key={subcategory.key} className='flex flex-col gap-10'>
                            <h3 className='text-c6 font-semibold text-16'>{subcategory.label}</h3>
                            {allValues.map(
                              (val, i) =>
                                val.trim() !== '' && (
                                  <div key={i} className='bg-c1 rounded-8 p-25 border-2 border-c3'>
                                    {isUri ? (
                                      <a href={val} target='_blank' rel='noopener noreferrer' className='text-action text-14 leading-[125%] hover:underline break-all'>
                                        {val}
                                      </a>
                                    ) : (
                                      <p className='text-c5 text-14 leading-[125%]'>{val}</p>
                                    )}
                                  </div>
                                ),
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        case 'citations': {
          const itemId = itemDetails?.['o:id'] || itemDetails?.id;
          if (!itemId) return null;
          return <CitationsView itemId={itemId} onTimeChange={onTimeChange} />;
        }

        case 'microresumes': {
          const itemId = itemDetails?.['o:id'] || itemDetails?.id;
          if (!itemId) return null;
          return <MicroresumesView itemId={itemId} onTimeChange={onTimeChange} />;
        }

        case 'custom': {
          if (!view.customRender) return null;
          return view.customRender(context);
        }

        default:
          return null;
      }
    },
  };
};

// ========================================
// Créer les ViewOptions à partir de la config
// ========================================

const createViewOptions = (views?: SimplifiedViewConfig[]): ViewOption[] => {
  if (!views) return [];
  return views.map((view) => createViewFromSimpleView(view));
};

// ========================================
// Fonction principale: Convertir SimplifiedDetailConfig en GenericDetailPageConfig
// ========================================

export const convertToGenericConfig = (config: SimplifiedDetailConfig): GenericDetailPageConfig => {
  // 1. Extraire les fields depuis la config
  const fields = extractFieldsFromConfig(config.fields);

  // 2. Créer les formFields pour le mode édition
  const formFields = config.formEnabled ? fields.filter((f) => f.editable !== false).map(fieldToFormField) : undefined;

  // 3. Créer les data fetchers (utiliser le custom si fourni)
  const dataFetcher = config.customDataFetcher ?? createOmekaDataFetcher(config, fields);
  const progressiveDataFetcher = config.customDataFetcher ? undefined : createProgressiveOmekaDataFetcher(config, fields);

  // 4. Créer les viewOptions
  const viewOptions = createViewOptions(config.views);

  return {
    // Data fetching
    dataFetcher,
    progressiveDataFetcher,

    // Smart recommendations
    smartRecommendations: config.smartRecommendations,

    // Composants (utiliser les custom si fournis)
    overviewComponent: config.customOverviewComponent ?? ((props: any) => {
      const onFieldChange = (property: string, value: any) => {
        const titleField = fields.find((f) => f.type === 'title');
        const urlField = fields.find((f) => f.type === 'url');

        if (property === titleField?.property && props.onTitleChange) {
          props.onTitleChange(value);
        } else if (property === urlField?.property && props.onLinkChange) {
          props.onLinkChange(value);
        }
      };

      const onAddResource = props.onAddPerson;
      const onResourcesSelected = props.onResourcesSelected;

      return (
        <SimpleOverviewCard
          {...props}
          fields={fields}
          resourceType={config.resourceType}
          onFieldChange={onFieldChange}
          onAddResource={onAddResource}
          onResourcesSelected={onResourcesSelected}
        />
      );
    }),
    detailsComponent: config.customDetailsComponent ?? ((props: any) => {
      const onFieldChange = (property: string, value: any) => {
        const dateField = fields.find((f) => f.type === 'date');
        const descField = fields.find((f) => f.type === 'textarea');
        const percentField = fields.find((f) => f.type === 'percentage' || f.type === 'slider');
        const statusField = fields.find((f) => f.type === 'status');
        const urlField = fields.find((f) => f.type === 'url');

        if (property === dateField?.property && props.onDateChange) {
          props.onDateChange(value);
        } else if (property === descField?.property && props.onDescriptionChange) {
          props.onDescriptionChange(value);
        } else if (property === percentField?.property && props.onPercentageChange) {
          props.onPercentageChange(value);
        } else if (property === statusField?.property && props.onStatusChange) {
          props.onStatusChange(value);
        } else if (property === urlField?.property && props.onLinkChange) {
          props.onLinkChange(value);
        }
      };

      const onAddResource = props.onAddActant;

      return <SimpleDetailsCard {...props} fields={fields} resourceType={config.resourceType} onFieldChange={onFieldChange} onAddResource={onAddResource} />;
    }),
    overviewSkeleton: config.customOverviewSkeleton ?? SimpleOverviewSkeleton,
    detailsSkeleton: config.customDetailsSkeleton ?? SimpleDetailsSkeleton,

    // Mappers de props (utiliser les custom si fournis)
    mapOverviewProps: config.customMapOverviewProps ?? ((itemDetails: any, currentVideoTime: number) => ({
      itemDetails,
      currentVideoTime,
      type: config.resourceType,
    })),

    mapDetailsProps: config.customMapDetailsProps ?? ((itemDetails: any) => ({
      itemDetails,
    })),

    // Mapper pour les recommandations (carousel "similaires")
    mapRecommendationProps: config.customMapRecommendationProps ?? (config.recommendationType
      ? (item: any) => ({
          id: item.id || item['o:id'],
          title: item.title || item['o:title'] || item['dcterms:title']?.[0]?.['@value'],
          type: config.recommendationType,
          url: null,
          thumbnail: item.associatedMedia?.[0] || item.thumbnail || null,
          personnes: item.actants || [],
        })
      : undefined),

    // Fetcher de recommandations custom
    fetchRecommendations: config.customRecommendationsFetcher,

    // Options de vue
    viewOptions,
    defaultView: config.defaultView,

    // Sections optionnelles
    showKeywords: Boolean(config.showKeywords),
    showRecommendations: Boolean(config.showRecommendations),
    showComments: Boolean(config.showComments),
    recommendationsTitle: config.recommendationsTitle,

    // Type
    type: config.resourceType,

    // Formulaire
    formEnabled: config.formEnabled ?? false,
    resourceTemplateId: config.templateId,
    formFields,
  };
};

// ========================================
// Composant SimpleDetailPage
// ========================================

interface SimpleDetailPageProps {
  config: SimplifiedDetailConfig;
  itemId?: string;
}

// ========================================
// Fonction helper pour créer le handler de sauvegarde
// ========================================

/**
 * Crée un gestionnaire de sauvegarde compatible avec GenericDetailPage
 * qui gère la logique complexe de mapping des SimplifiedDetailConfig
 */
export const createHandleSave = (config: SimplifiedDetailConfig) => {
  const fields = extractFieldsFromConfig(config.fields);

  return async (data: any, itemId?: string | number): Promise<void> => {
    if (!itemId) {
      throw new Error('itemId est requis pour la sauvegarde');
    }

    try {
      // 1. Récupérer l'item existant
      const response = await fetch(`${API_BASE}items/${itemId}`);
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: Item non trouvé`);
      }
      const itemData = await response.json();

      // 2. Récupérer le mapping des propriétés pour ce template (dynamique)
      const propMap = await getTemplatePropertiesMap(config.templateId);
      console.log('[handleSave] Properties map loaded:', Object.keys(propMap).length, 'properties');

      // 3. Construire le mapping clé → propriété Omeka S
      const keyToProperty: Record<string, string> = {
        title: 'dcterms:title',
        description: 'dcterms:description',
        date: 'dcterms:date',
        fullUrl: 'schema:url',
        keywords: 'jdc:hasConcept',
        percentage: 'schema:ratingValue',
      };

      // Ajouter les mappings depuis les fields de la config
      fields.forEach((field) => {
        keyToProperty[field.key] = field.property;
        if (field.type === 'resource') {
          keyToProperty['personnes'] = field.property;
          keyToProperty['actants'] = field.property;
        }
      });

      // Ajouter les mappings depuis les vues (pour les categories et items)
      if (config.views) {
        config.views.forEach((view) => {
          if (view.key && view.property) {
            keyToProperty[view.key] = view.property;
          }
          // Pour les categories, mapper chaque subcategory
          if (view.categories) {
            view.categories.forEach((cat) => {
              cat.subcategories.forEach((sub) => {
                keyToProperty[sub.property] = sub.property;
                // Important: Mapper aussi la clé de la sous-catégorie vers la propriété
                if (sub.key) {
                  keyToProperty[sub.key] = sub.property;
                }
              });
            });
          }
        });
      }

      // 4. Préparer l'item mis à jour
      const updatedItem = { ...itemData };

      // Sauvegarder les champs système
      const systemFields = ['o:media', 'o:site', 'o:item_set', 'o:owner', 'o:primary_media'];
      const originalSystemFields: Record<string, any> = {};
      systemFields.forEach((key) => {
        if (itemData[key] !== undefined) {
          originalSystemFields[key] = itemData[key];
        }
      });

      // Clés à ignorer
      const ignoredKeys = new Set([
        'mediaFiles',
        'mediaToDelete',
        'newMediaFiles',
        'resourceCache',
        'o:media',
        'o:site',
        'o:item_set',
        'o:owner',
        'o:id',
        'o:is_public',
        'o:resource_class',
        'o:resource_template',
        'o:thumbnail',
        'o:title',
        'o:created',
        'o:modified',
        'o:primary_media',
        '@context',
        '@id',
        '@type',
        'thumbnail_display_urls',
      ]);

      // 5. Appliquer les modifications
      Object.entries(data).forEach(([key, value]) => {
        if (ignoredKeys.has(key) || value === undefined || value === null) {
          return;
        }

        // Trouver la propriété Omeka S correspondante
        const omekaProperty = keyToProperty[key] || key;
        const propertyId = propMap[omekaProperty];

        if (!propertyId) {
          console.warn(`[handleSave] Property ID non trouvé pour: ${omekaProperty} (clé: ${key})`);
          return;
        }

        // Traiter selon le type de valeur
        if (typeof value === 'string' || typeof value === 'number') {
          // Valeur simple (string ou number)
          updatedItem[omekaProperty] = [
            {
              type: 'literal',
              property_id: propertyId,
              '@value': String(value),
              is_public: true,
            },
          ];
        } else if (Array.isArray(value) && value.length > 0) {
          if (typeof value[0] === 'string') {
            // Tableau de strings (categories)
            const nonEmptyValues = value.filter((v: string) => v && v.trim() !== '');
            if (nonEmptyValues.length > 0) {
              updatedItem[omekaProperty] = nonEmptyValues.map((v: string) => ({
                type: 'literal',
                property_id: propertyId,
                '@value': v,
                is_public: true,
              }));
            } else {
              delete updatedItem[omekaProperty];
            }
          } else if (value[0].id || value[0]['o:id']) {
            // Tableau de ressources liées (personnes, projets, etc.)
            const resourceIds = value.map((item: any) => item.id || item['o:id']);
            updatedItem[omekaProperty] = resourceIds.map((resourceId: number) => ({
              type: 'resource',
              property_id: propertyId,
              value_resource_id: resourceId,
              is_public: true,
            }));
          }
        }
      });

      // 6. Restaurer les champs système
      Object.entries(originalSystemFields).forEach(([key, value]) => {
        updatedItem[key] = value;
      });

      console.log('[handleSave] Item data to send:', updatedItem);

      // 7. Sauvegarder
      const url = `${API_BASE}items/${itemId}?key_identity=${API_IDENT}&key_credential=${API_KEY}`;
      const saveResponse = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.errors?.[0]?.message || 'Erreur lors de la sauvegarde');
      }

      await saveResponse.json();
      console.log('[handleSave] Item saved successfully');

      // 8. Gérer les médias
      const mediaErrors: string[] = [];

      if (data.mediaToDelete && Array.isArray(data.mediaToDelete)) {
        for (const mediaId of data.mediaToDelete) {
          const deleted = await deleteMedia(mediaId);
          if (!deleted) {
            mediaErrors.push(`Erreur suppression média #${mediaId}`);
          }
        }
      }

      const mediaFilesToUpload = data.mediaFiles || data.newMediaFiles || [];
      if (Array.isArray(mediaFilesToUpload) && mediaFilesToUpload.length > 0) {
        for (const file of mediaFilesToUpload) {
          const actualFile = file.file || file;
          if (actualFile instanceof File) {
            const uploaded = await uploadMedia(actualFile, String(itemId));
            if (!uploaded) {
              mediaErrors.push(`Erreur upload ${actualFile.name}`);
            }
          }
        }
      }

      if (mediaErrors.length > 0) {
        console.warn('[handleSave] Erreurs médias:', mediaErrors);
      }
    } catch (err) {
      console.error('[handleSave] Erreur:', err);
      throw err;
    }
  };
};

export const SimpleDetailPage: React.FC<SimpleDetailPageProps> = ({ config, itemId }) => {
  const fullConfig = React.useMemo(() => convertToGenericConfig(config), [config]);
  const handleSave = React.useMemo(() => createHandleSave(config), [config]);

  // Adapter la signature de handleSave pour qu'elle corresponde à celle attendue par GenericDetailPage
  // GenericDetailPage passe (data) mais createHandleSave retourne une fonction qui attend (data, itemId)
  // Cependant, dans SimpleDetailPage, itemId est dans les props.
  const handleSaveAdapter = async (data: any) => {
    if (itemId) {
      await handleSave(data, itemId);
    }
  };

  return <GenericDetailPage config={fullConfig} itemId={itemId} onSave={handleSaveAdapter} />;
};

export default SimpleDetailPage;
