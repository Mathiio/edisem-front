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
import { AddIcon } from '@/components/ui/icons';
import { modalCloseButtonClasses, ModalCloseIcon } from '@/theme/components/modal';
import { getTemplatePropertiesMap } from '@/services/Items';
import { OMEKA_PROPERTY_IDS } from '@/config/resourceConfig';
import { OMEKA_API_BASE as API_BASE, omekaApiUrl } from '@/utils/omekaApi';
import { GenericDetailPageConfig, FetchResult, ViewOption, ProgressiveDataFetcher, ProgressCallback, FormFieldConfig, FormFieldType } from './config';
import { SimplifiedDetailConfig, SimplifiedViewConfig, InternalFieldConfig, FieldType, extractFieldsFromConfig } from './simplifiedConfig';
import { SimpleOverviewCard, SimpleDetailsCard, SimpleOverviewSkeleton, SimpleDetailsSkeleton, VocabGroupRenderer } from './SimpleComponents';
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
import { ReferenceAddButtons } from '@/components/features/forms/AddResourceCard';
import { outlineButtonClass } from '@/theme/components/button';
import { GenericDetailPage } from './GenericDetailPage';

// ========================================
// Helpers pour timecodes
// ========================================

const formatTimecode = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const parseTimecode = (str: string): number => {
  const parts = str.split(':').map(Number).filter((n) => !isNaN(n));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
};

const inlineFieldClass =
  'w-full bg-c2 border-2 border-c3 rounded-lg px-3 py-2 text-c6 text-sm resize-none focus:outline-none focus:border-c3';
const inlineTimeFieldClass =
  'bg-c2 border-2 border-c3 rounded-lg px-3 py-2 text-c6 text-sm w-28 focus:outline-none focus:border-c3';
const inlineRemoveButtonClass = [modalCloseButtonClasses, 'inline-flex items-center justify-center shrink-0 p-1.5 text-xl'].join(' ');

const mapReferenceToToolItem = (
  ref: any,
  updatedResources?: Record<string, { title?: string; thumbnail?: string }>,
) => {
  const refId = String(ref.id || ref['o:id'] || ref['value_resource_id']);
  return {
    id: refId,
    title:
      updatedResources?.[refId]?.title ||
      getLinkedResourceTitle(ref) ||
      ref.title ||
      ref['o:title'] ||
      'Ressource',
    thumbnail: updatedResources?.[refId]?.thumbnail || ref.thumbnail || ref.thumbnailUrl,
    url: ref.url || '#',
    ownerId: getResourceOwnerId(ref),
  };
};

// ========================================
// Inline form: Ajouter des citations
// ========================================

const InlineCitationForm: React.FC<{
  items: any[];
  onChange: (items: any[]) => void;
}> = ({ items, onChange }) => {
  const add = () => onChange([...items, { citation: '', startTime: 0, endTime: 0 }]);
  const update = (i: number, field: string, value: any) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    onChange(updated);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className='flex flex-col gap-2.5'>
      {items.map((item, i) => (
        <div key={i} className='relative flex flex-col gap-2 p-3 bg-c2 rounded-lg border-2 border-c3'>
          <button
            type='button'
            onClick={() => remove(i)}
            className={`absolute top-2 right-2 ${inlineRemoveButtonClass}`}
            aria-label='Supprimer la citation'>
            <ModalCloseIcon />
          </button>
          <div className='flex gap-2 items-center pr-8'>
            <input
              type='text'
              value={formatTimecode(item.startTime || 0)}
              onChange={(e) => update(i, 'startTime', parseTimecode(e.target.value))}
              placeholder='00:00:00'
              className={inlineTimeFieldClass}
            />
            <p className='text-c4'> : </p>
            <input
              type='text'
              value={formatTimecode(item.endTime || 0)}
              onChange={(e) => update(i, 'endTime', parseTimecode(e.target.value))}
              placeholder='00:00:00'
              className={inlineTimeFieldClass}
            />
          </div>
          <textarea
            value={item.citation}
            onChange={(e) => update(i, 'citation', e.target.value)}
            placeholder='Contenu de la citation...'
            className={inlineFieldClass}
            rows={3}
          />
        </div>
      ))}
      <button type='button' onClick={add} className={outlineButtonClass}>
        <AddIcon size={14} className='text-c4' />
        Ajouter une citation
      </button>
    </div>
  );
};

// ========================================
// Inline form: Ajouter des micro-résumés
// ========================================

const InlineMicroresumeForm: React.FC<{
  items: any[];
  onChange: (items: any[]) => void;
}> = ({ items, onChange }) => {
  const add = () => onChange([...items, { title: '', description: '', startTime: 0, endTime: 0 }]);
  const update = (i: number, field: string, value: any) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    onChange(updated);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className='flex flex-col gap-2.5'>
      {items.map((item, i) => (
        <div key={i} className='relative flex flex-col gap-2 p-3 bg-c2 rounded-lg border-2 border-c3'>
          <button
            type='button'
            onClick={() => remove(i)}
            className={`absolute top-2 right-2 ${inlineRemoveButtonClass}`}
            aria-label='Supprimer le micro-résumé'>
            <ModalCloseIcon />
          </button>
          <div className='flex gap-2 items-center pr-8'>
            <input
              type='text'
              value={formatTimecode(item.startTime || 0)}
              onChange={(e) => update(i, 'startTime', parseTimecode(e.target.value))}
              placeholder='00:00:00'
              className={inlineTimeFieldClass}
            />
            <p className='text-c4'> : </p>
            <input
              type='text'
              value={formatTimecode(item.endTime || 0)}
              onChange={(e) => update(i, 'endTime', parseTimecode(e.target.value))}
              placeholder='00:00:00'
              className={inlineTimeFieldClass}
            />
          </div>
          <input
            type='text'
            value={item.title}
            onChange={(e) => update(i, 'title', e.target.value)}
            placeholder='Titre du micro-résumé'
            className={inlineFieldClass}
          />
          <textarea
            value={item.description}
            onChange={(e) => update(i, 'description', e.target.value)}
            placeholder='Description...'
            className={inlineFieldClass}
            rows={3}
          />
        </div>
      ))}
      <button type='button' onClick={add} className={outlineButtonClass}>
        <AddIcon size={14} className='text-c4' />
        Ajouter un micro-résumé
      </button>
    </div>
  );
};
import { getResourceConfigByTemplateId, isFormOnlyResourceType, resolveResourceTypeFromOmekaItem } from '@/config/resourceConfig';
import { buildCachedResourceUrl } from '@/lib/resourceUtils';
import { enrichItemWithResourceOwner } from '@/lib/resourceOwner';
import AutoResizingField, { getAutoResizeTextareaProps } from '@/components/features/database/AutoResizingTextarea';
import {
  inferViewCreateOnly,
  getLinkedResourceId,
  getLinkedResourceTitle,
  getResourceFallbackTitle,
  getResourceOwnerId,
  resolveViewTemplateId,
} from './resourceHelpers';

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
  itemset: 'selection',
  select: 'selection',
  media: 'media',
  status: 'text',
  percentage: 'slider',
};

export const fieldToFormField = (field: InternalFieldConfig): FormFieldConfig => {
  // For URL type fields, use @id instead of @value (Omeka S stores URIs in @id)
  // For itemset fields, use value_resource_id (linked resource)
  const dataPath = field.type === 'url'
    ? `${field.property}.0.@id`
    : field.type === 'itemset'
      ? `${field.property}.0.value_resource_id`
      : `${field.property}.0.@value`;
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
    options: field.options,
    customVocabId: field.customVocabId,
    selectionConfig: field.resourceTemplateId
      ? {
          resourceType: field.label,
          templateId: field.resourceTemplateId,
          multiple: field.multiSelect,
        }
      : field.itemSetId
        ? {
            resourceType: field.label,
            itemSetId: field.itemSetId,
            multiple: field.multiSelect ?? false,
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

type AssociatedMediaEntry = { url: string; mediaId?: number };

async function fetchOmekaMediaUrl(mediaId: number): Promise<string | null> {
  try {
    const res = await fetchWithRetry(`${API_BASE}media/${mediaId}`, 1, 300);
    if (!res || !res.ok) return null;
    const mediaData = await res.json();
    if (mediaData['o:ingester'] === 'youtube' && mediaData['o:source']) {
      return mediaData['o:source'];
    }
    return mediaData['o:original_url'] ?? null;
  } catch (err) {
    console.error(`Erreur chargement média ${mediaId}:`, err);
    return null;
  }
}

async function loadDirectOmekaMediaEntries(mediaRefs: any[]): Promise<AssociatedMediaEntry[]> {
  const results = await Promise.all(
    mediaRefs.slice(0, 10).map(async (mediaRef: any) => {
      const mediaId = mediaRef?.['o:id'];
      if (!mediaId) return null;
      const url = await fetchOmekaMediaUrl(mediaId);
      return url ? { url, mediaId } : null;
    }),
  );
  return results.filter(Boolean) as AssociatedMediaEntry[];
}

function sortAssociatedMediaEntries(entries: AssociatedMediaEntry[]): AssociatedMediaEntry[] {
  return [...entries].sort((a, b) => {
    const aIsYT = a.url.includes('youtube.com') || a.url.includes('youtu.be') ? 0 : 1;
    const bIsYT = b.url.includes('youtube.com') || b.url.includes('youtu.be') ? 0 : 1;
    return aIsYT - bIsYT;
  });
}

function applyAssociatedMediaToItem(enrichedData: Record<string, unknown>, entries: AssociatedMediaEntry[]) {
  const sorted = sortAssociatedMediaEntries(entries);
  enrichedData.associatedMedia = sorted.map((entry) => entry.url);
  enrichedData.associatedMediaIds = sorted.map((entry) => entry.mediaId ?? null);
}

// ========================================
// Media Management Functions
// ========================================

/**
 * Uploader un nouveau média vers Omeka S
 */
export const uploadMedia = async (file: File, itemId: string): Promise<boolean> => {
  const url = omekaApiUrl(`${API_BASE}media`);

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
  const url = omekaApiUrl(`${API_BASE}media/${mediaId}`);

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

    const templateId = item['o:resource_template']?.['o:id'];
    return {
      id: resourceId,
      title: item['o:title'] || getResourceFallbackTitle(resourceId, templateId),
      resourceClass: item['o:resource_class']?.['o:label'],
      templateId,
      thumbnailUrl,
    };
  } catch (err) {
    console.error(`Erreur chargement ressource ${resourceId}:`, err);
    return { id: resourceId, title: getResourceFallbackTitle(resourceId) };
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
    return items.map((item: any) => {
      const templateId = item['o:resource_template']?.['o:id'];
      return {
        id: item['o:id'],
        title: item['o:title'] || getResourceFallbackTitle(item['o:id'], templateId),
        resourceClass: item['o:resource_class']?.['o:label'],
        thumbnailUrl: item['thumbnail_display_urls']?.square,
        templateId,
      };
    });
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
const getResourceTypeFromTemplate = (
  templateId: number | undefined,
  resourceData?: Record<string, unknown>,
): string => {
  if (resourceData) {
    const fromItem = resolveResourceTypeFromOmekaItem(resourceData);
    if (fromItem) return fromItem;
  }
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
      // ÉTAPE 1 : Fetch de l'item principal (avec auth pour accéder aux items privés)
      const response = await fetchWithRetry(omekaApiUrl(`${API_BASE}items/${id}`));
      if (!response || !response.ok) {
        throw new Error(`Erreur: Item ${id} non trouvé ou API indisponible`);
      }
      const data = await response.json();

      const enrichedData: any = { ...data };
      await enrichItemWithResourceOwner(enrichedData);

      // ÉTAPE 2 : Charger les médias
      const mediaEntries: AssociatedMediaEntry[] = [];
      // 2a: Médias directs via o:media
      if (data['o:media'] && Array.isArray(data['o:media'])) {
        mediaEntries.push(...(await loadDirectOmekaMediaEntries(data['o:media'])));
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
                  const linkedUrl = await fetchOmekaMediaUrl(mediaId);
                  if (linkedUrl) return linkedUrl;
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
        linkedMediaUrls.filter(Boolean).forEach((url) => {
          if (url) mediaEntries.push({ url });
        });
      }

      // 2c: Fallback final — URL vidéo directe (schema:url sur l'item principal)
      if (mediaEntries.length === 0) {
        const videoUrl = data['schema:url']?.[0]?.['@id'];
        if (videoUrl) {
          mediaEntries.push({ url: videoUrl });
        }
      }

      applyAssociatedMediaToItem(enrichedData, mediaEntries);

      // ÉTAPE 2b : Charger les contributeurs EN PRIORITÉ (avant l'affichage)
      const contributorProperties = [
        'schema:agent',
        'jdc:hasActant',
        'dcterms:contributor',
        'schema:contributor',
        'cito:credits',
        'dcterms:creator',
        ...(config.contributorButtons?.map((btn) => btn.property) ?? []),
      ];
      const contributorIds = new Set<number>();
      [...new Set(contributorProperties)].forEach((prop) => {
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
              title: resourceData['o:title'] || `${firstname} ${lastname}`.trim() || getResourceFallbackTitle(resourceId, templateId),
              name: resourceData['o:title'] || `${firstname} ${lastname}`.trim(),
              firstname,
              lastname,
              picture: thumbnailUrl,
              thumbnail: thumbnailUrl,
              thumbnailUrl,
              type:
                templateId === 72
                  ? 'actant'
                  : templateId === 96
                    ? 'student'
                    : templateId === 104
                      ? 'organisation'
                      : templateId === 33
                        ? 'personne'
                        : 'personne',
              template: templateId,
              resource_template_id: templateId,
              ownerId: resourceData['o:owner']?.['o:id'],
              url: buildCachedResourceUrl(
                templateId === 72
                  ? 'actant'
                  : templateId === 96
                    ? 'student'
                    : templateId === 104
                      ? 'organisation'
                      : 'personne',
                resourceId,
                resourceData,
              ),
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
              // Use omekaApiUrl so private (draft) resources are also accessible
              const res = await fetchWithRetry(omekaApiUrl(`${API_BASE}items/${resourceId}`), 1, 300);
              if (!res || !res.ok) return;

              const resourceData = await res.json();

              let thumbnailUrl: string | undefined;
              if (resourceData['thumbnail_display_urls']?.square) {
                thumbnailUrl = resourceData['thumbnail_display_urls'].square;
              }

              const templateId = resourceData['o:resource_template']?.['o:id'];
              const resourceType = getResourceTypeFromTemplate(templateId, resourceData);

              resourceCache[resourceId] = {
                id: resourceId,
                title: resourceData['o:title'] || getResourceFallbackTitle(resourceId, templateId),
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
                url: buildCachedResourceUrl(resourceType, resourceId, resourceData),
                ownerId: resourceData['o:owner']?.['o:id'],
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

        if (data['schema:documentation']) {
          const docIds = getResourceIds(data, 'schema:documentation');
          enrichedData.documentations = docIds.map((id) => resourceCache[id]).filter(Boolean);
        }

        if (data['schema:associatedMedia']) {
          const mediaIds = getResourceIds(data, 'schema:associatedMedia');
          enrichedData.associatedMediaRefs = mediaIds.map((id) => resourceCache[id]).filter(Boolean);
        }

        onProgress({
          itemDetails: enrichedData,
          viewData: { rawData: data, resourceCache },
        });
      }

      // Fetch microresumes & citations si la config en a (getResourceDetails est déjà appelé
      // par les composants de vue, le cache HTTP évite un double appel réseau)
      const hasMicroresumesView = config.views?.some((v) => v.renderType === 'microresumes');
      const hasCitationsView = config.views?.some((v) => v.renderType === 'citations');
      if (hasMicroresumesView || hasCitationsView) {
        try {
          const details = await getResourceDetails(id);
          if (hasMicroresumesView && details?.microResumes) enrichedData.microResumes = details.microResumes;
          if (hasCitationsView && details?.citations) enrichedData.citations = details.citations;
        } catch (_) {
          // Non-bloquant
        }
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
      await enrichItemWithResourceOwner(enrichedData);

      // Charger les médias
      const mediaEntries: AssociatedMediaEntry[] = [];
      // Médias directs via o:media
      if (data['o:media'] && Array.isArray(data['o:media'])) {
        mediaEntries.push(...(await loadDirectOmekaMediaEntries(data['o:media'])));
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
                  const linkedUrl = await fetchOmekaMediaUrl(mediaId);
                  if (linkedUrl) return linkedUrl;
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
        linkedMediaUrls.filter(Boolean).forEach((url) => {
          if (url) mediaEntries.push({ url });
        });
      }

      // Fallback: URL vidéo directe (schema:url)
      if (mediaEntries.length === 0) {
        const videoUrl = data['schema:url']?.[0]?.['@id'];
        if (videoUrl) {
          mediaEntries.push({ url: videoUrl });
        }
      }

      applyAssociatedMediaToItem(enrichedData, mediaEntries);

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
              // Use omekaApiUrl so private (draft) resources are also accessible
              const res = await fetchWithRetry(omekaApiUrl(`${API_BASE}items/${resourceId}`), 1, 300);
              if (!res || !res.ok) return;

              const resourceData = await res.json();

              let thumbnailUrl: string | undefined;
              if (resourceData['thumbnail_display_urls']?.square) {
                thumbnailUrl = resourceData['thumbnail_display_urls'].square;
              }

              const templateId = resourceData['o:resource_template']?.['o:id'];
              const resourceType = getResourceTypeFromTemplate(templateId, resourceData);

              resourceCache[resourceId] = {
                id: resourceId,
                title: resourceData['o:title'] || getResourceFallbackTitle(resourceId, templateId),
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
                url: buildCachedResourceUrl(resourceType, resourceId, resourceData),
                ownerId: resourceData['o:owner']?.['o:id'],
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

      if (data['schema:documentation']) {
        const docIds = getResourceIds(data, 'schema:documentation');
        enrichedData.documentations = docIds.map((id) => resourceCache[id]).filter(Boolean);
      }

      if (data['schema:associatedMedia']) {
        const mediaIds = getResourceIds(data, 'schema:associatedMedia');
        enrichedData.associatedMediaRefs = mediaIds.map((id) => resourceCache[id]).filter(Boolean);
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
  const getItemCount = (itemDetails: any, formData: any): number => {
    // formData est prioritaire (edit mode)
    if (Array.isArray(formData?.[view.key])) return formData[view.key].length;

    switch (view.renderType) {
      case 'items': {
        if (Array.isArray(itemDetails?.[view.key])) return itemDetails[view.key].length;
        return getResourceIds(itemDetails, view.property || '').length;
      }
      case 'references': {
        const enrichedPropertyMap: Record<string, string> = {
          'dcterms:bibliographicCitation': 'bibliographicCitations',
          'dcterms:references': 'references',
          'dcterms:source': 'sources',
          'schema:review': 'reviews',
          'schema:documentation': 'documentations',
          'schema:associatedMedia': 'associatedMediaRefs',
        };
        const enrichedProp = enrichedPropertyMap[view.property || ''];
        const enrichedData = enrichedProp ? itemDetails?.[enrichedProp] : null;
        if (Array.isArray(enrichedData)) return enrichedData.length;
        return getResourceIds(itemDetails, view.property || '').length;
      }
      case 'microresumes':
        return Array.isArray(itemDetails?.microResumes) ? itemDetails.microResumes.length : 0;
      case 'citations':
        return Array.isArray(itemDetails?.citations) ? itemDetails.citations.length : 0;
      case 'categories': {
        if (!view.categories) return 0;
        const hasContent = view.categories.some((cat) =>
          cat.subcategories.some((sub) => {
            const raw = formData?.[sub.property] ?? itemDetails?.[sub.property];
            if (!raw) return false;
            if (typeof raw === 'string') return raw.trim() !== '';
            if (Array.isArray(raw)) return raw.some((v: any) => {
              if (typeof v === 'string') return v.trim() !== '';
              if (v?.['@value']) return String(v['@value']).trim() !== '';
              return !!v;
            });
            return true;
          }),
        );
        return hasContent ? 1 : 0;
      }
      case 'text': {
        const raw = formData?.[view.property || view.key] ?? itemDetails?.[view.property || view.key];
        if (!raw) return 0;
        if (typeof raw === 'string') return raw.trim() !== '' ? 1 : 0;
        if (Array.isArray(raw)) return raw.length > 0 ? 1 : 0;
        return 0;
      }
      case 'vocabGroup': {
        if (!view.vocabFields) return 0;
        const hasContent = view.vocabFields.some((f) => {
          const raw = formData?.[f.property] ?? itemDetails?.[f.property];
          if (!raw) return false;
          if (typeof raw === 'string') return raw.trim() !== '';
          if (Array.isArray(raw)) return raw.some((v: any) => {
            if (typeof v === 'string') return v.trim() !== '';
            if (v?.['@value']) return String(v['@value']).trim() !== '';
            return !!v;
          });
          return true;
        });
        return hasContent ? 1 : 0;
      }
      default:
        return 0;
    }
  };

  const viewKind: 'resources' | 'text' =
    view.renderType === 'items' || view.renderType === 'references' || view.renderType === 'microresumes' || view.renderType === 'citations'
      ? 'resources'
      : 'text';  // vocabGroup, text, categories, custom → 'text' (pas de bouton add/link)

  return {
    key: view.key,
    title: view.title,
    editable: view.editable !== false,
    hiddenInForm: view.hiddenInForm,
    createOnly: inferViewCreateOnly(view),
    resourceLabel: view.title,
    resourceTemplateId: view.resourceTemplateId,
    resourceTemplateIds: view.resourceTemplateIds,
    itemSetIds: view.itemSetIds,
    viewKind,
    getItemCount,
    renderContent: (context) => {
      const {
        itemDetails,
        loadingViews,
        isEditing,
        onLinkExisting,
        onCreateNew,
        onRemoveItem,
        onItemsChange,
        onEditResource,
        updatedResources,
        onTimeChange,
        formData,
        userCreatedResourceIds,
        currentOmekaUserId,
      } = context;
      switch (view.renderType) {
        case 'items': {
          let resourceIds = getResourceIds(itemDetails, view.property || '');
          const resourceCache = { ...(itemDetails?.resourceCache || {}) };
          const formDataItems: any[] = isEditing && Array.isArray(itemDetails[view.key]) ? itemDetails[view.key] : [];

          if (isEditing && formData?.[view.key] !== undefined && Array.isArray(formData[view.key])) {
            // formData[view.key] fait autorité sur les IDs (reflète ajouts et suppressions)
            resourceIds = formData[view.key]
              .map((item: any) => getLinkedResourceId(item))
              .filter((id: string | number | undefined): id is string | number => id != null)
              .map((id: string | number) => (Number.isFinite(Number(id)) ? Number(id) : id)) as number[];
            formData[view.key].forEach((item: any) => {
              const id = getLinkedResourceId(item);
              if (id == null || resourceCache[id]) return;
              resourceCache[id] = {
                title: getLinkedResourceTitle(item, view.resourceTemplateId),
                thumbnailUrl: item['thumbnail_display_urls']?.square || item.thumbnail || item.thumbnailUrl,
              };
            });
          } else if (isEditing && formDataItems.length > 0) {
            formDataItems.forEach((item: any) => {
              const id = getLinkedResourceId(item);
              if (id == null) return;
              if (!resourceIds.includes(Number(id)) && !resourceIds.includes(id as number)) {
                resourceIds = [...resourceIds, id as number];
              }
              if (!resourceCache[id]) {
                resourceCache[id] = {
                  title: getLinkedResourceTitle(item, view.resourceTemplateId),
                  thumbnailUrl: item['thumbnail_display_urls']?.square || item.thumbnail || item.thumbnailUrl,
                };
              }
            });
          }

          const items = resourceIds
            .map((id) => {
              const cached = resourceCache[id];
              const update = updatedResources?.[String(id)];
              const formItem = formDataItems.find((item) => String(getLinkedResourceId(item)) === String(id));

              if (loadingViews && !cached && !update && !formItem) {
                return null;
              }

              const cachedTemplateId = cached?.resource_template_id || cached?.template || cached?.class || view.resourceTemplateId;
              const cachedTitle = cached?.title?.startsWith('Item #') ? undefined : cached?.title;
              return {
                id,
                title:
                  update?.title ||
                  (formItem ? getLinkedResourceTitle(formItem, view.resourceTemplateId) : undefined) ||
                  cachedTitle ||
                  getResourceFallbackTitle(id, cachedTemplateId),
                thumbnail: update?.thumbnail || cached?.thumbnailUrl || formItem?.thumbnail || formItem?.thumbnailUrl,
                url: cached?.url,
                ownerId: getResourceOwnerId(cached) ?? getResourceOwnerId(formItem),
              };
            })
            .filter(Boolean) as { id: string | number; title: string; thumbnail?: string; url?: string }[];

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

          const viewCreateOnly = inferViewCreateOnly(view);
          const viewTemplateId = resolveViewTemplateId(view);

          return (
            <ItemsList
              items={allItems}
              mapUrl={mapUrl}
              loading={loadingViews}
              isEditing={isEditing}
              resourceLabel={view.title}
              userCreatedResourceIds={userCreatedResourceIds}
              currentOmekaUserId={currentOmekaUserId}
              onAdd={
                isEditing
                  ? viewCreateOnly
                    ? () => {
                        if (onCreateNew) onCreateNew(view.key);
                        else onLinkExisting?.(view.key);
                      }
                    : onLinkExisting
                      ? () => onLinkExisting(view.key)
                      : undefined
                  : undefined
              }
              onRemoveItem={onRemoveItem ? (id: string | number) => onRemoveItem(view.key, id) : undefined}
              resourceTemplateId={viewTemplateId}
              onEdit={
                onEditResource
                  ? (id: string | number) => onEditResource(view.key, id, viewTemplateId)
                  : undefined
              }
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
                  textareaProps={getAutoResizeTextareaProps()}
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
            'schema:documentation': 'documentations',
            'schema:associatedMedia': 'associatedMediaRefs',
          };

          const enrichedProperty = enrichedPropertyMap[view.property || ''];

          // Données enrichies pour l'affichage (avec titre, auteur, etc.)
          let enrichedRefs = enrichedProperty ? itemDetails?.[enrichedProperty] : null;
          if (!enrichedRefs || enrichedRefs.length === 0) {
            enrichedRefs = itemDetails?.[view.property || ''] || [];
          }

          let refs: any[];
          if (isEditing && formData?.[view.key] && Array.isArray(formData[view.key])) {
            // formData[view.key] fait autorité sur les IDs (reflète ajouts et suppressions)
            const formIds = new Set(formData[view.key].map((item: any) => String(item.id || item['o:id'] || item.value_resource_id)));
            // Filtrer les items enrichis par les IDs dans formData (gère suppressions)
            const kept = enrichedRefs.filter((r: any) => formIds.has(String(r.id || r['o:id'])));
            // Ajouter les nouveaux items de formData qui ne sont pas dans les enrichis
            const enrichedIds = new Set(enrichedRefs.map((r: any) => String(r.id || r['o:id'])));
            const added = formData[view.key].filter((item: any) => {
              const itemId = String(item.id || item['o:id'] || item.value_resource_id);
              return !enrichedIds.has(itemId);
            });
            refs = [...kept, ...added];
          } else {
            refs = enrichedRefs;
          }

          const mediagraphies = refs.filter((ref: any) => ref?.type === 'mediagraphie' || ref?.mediagraphyType);
          const bibliographies = refs.filter((ref: any) => {
            if (mediagraphies.includes(ref)) return false;
            if (ref?.type === 'bibliographie' || ref?.template || ref?.class || ref?.resource_template_id) return true;
            if ((ref?.['o:id'] || ref?.id) && (ref?.['o:title'] || ref?.title)) return true;
            // Format brut API (fallback quand l'enrichissement échoue) : { type: 'resource', value_resource_id: X }
            if (ref?.value_resource_id !== undefined) return true;
            return false;
          });

          const hasContent = mediagraphies.length > 0 || bibliographies.length > 0;
          const canEdit = isEditing && view.editable !== false;

          if (!hasContent && !canEdit) {
            return null;
          }

          const refTemplateId = resolveViewTemplateId(view);

          return (
            <div className='space-y-6'>
              {mediagraphies.length > 0 && (
                <div>
                  <h3 className='text-lg text-c5 font-semibold mb-4'>Médias</h3>
                  {canEdit ? (
                    <ItemsList
                      items={mediagraphies.map((ref: any) => mapReferenceToToolItem(ref, updatedResources))}
                      isEditing={canEdit}
                      userCreatedResourceIds={userCreatedResourceIds}
                      currentOmekaUserId={currentOmekaUserId}
                      resourceTemplateId={refTemplateId}
                      onEdit={(id) => onEditResource?.(view.key, id, refTemplateId)}
                      onRemoveItem={onRemoveItem ? (id) => onRemoveItem(view.key, id) : undefined}
                    />
                  ) : (
                    <Mediagraphies items={mediagraphies} loading={loadingViews ?? false} notitle />
                  )}
                </div>
              )}
              {bibliographies.length > 0 && (
                <div>
                  <h3 className='text-lg text-c5 font-semibold mb-4'>Bibliographies</h3>
                  {canEdit ? (
                    <ItemsList
                      items={bibliographies.map((ref: any) => mapReferenceToToolItem(ref, updatedResources))}
                      isEditing={canEdit}
                      userCreatedResourceIds={userCreatedResourceIds}
                      currentOmekaUserId={currentOmekaUserId}
                      resourceTemplateId={refTemplateId}
                      onEdit={(id) => onEditResource?.(view.key, id, refTemplateId)}
                      onRemoveItem={onRemoveItem ? (id) => onRemoveItem(view.key, id) : undefined}
                    />
                  ) : (
                    <Bibliographies sections={[{ title: 'Bibliographies', bibliographies }]} loading={loadingViews ?? false} notitle />
                  )}
                </div>
              )}
              {canEdit && (
                <ReferenceAddButtons
                  viewKey={view.key}
                  templateIds={view.resourceTemplateIds}
                  onLinkExisting={onLinkExisting}
                />
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
            <div className='flex flex-col gap-6'>
              {view.categories.map((category) => {
                if (!canEdit) {
                  const categoryHasContent = category.subcategories.some((sub) => {
                    const values = getAllOmekaValues(itemDetails, sub.property);
                    return values.length > 0 && values.some((v) => v.trim() !== '');
                  });
                  if (!categoryHasContent) return null;
                }

                return (
                  <div key={category.key} className='flex flex-col gap-4'>
                    {showCategoryTitle && <h2 className='text-xl font-semibold text-c6'>{category.title}</h2>}
                    <div className='flex flex-col gap-5'>
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
                          const allowMultiple = subcategory.allowMultipleInputs !== false;
                          const displayValues = allowMultiple
                            ? editValues.length > 0
                              ? editValues
                              : ['']
                            : [editValues[0] ?? ''];

                          return (
                            <div key={subcategory.key} className='flex flex-col gap-2.5'>
                              <h3 className='text-c6 font-semibold text-base'>{subcategory.label}</h3>

                              {displayValues.map((value, index) => (
                                <div key={index} className='flex gap-2 items-center'>
                                  <div className='flex-1 min-w-0'>
                                    <AutoResizingField
                                      textareaProps={getAutoResizeTextareaProps({ size: 'sm' })}
                                      value={value}
                                      onChange={(e) => {
                                        if (allowMultiple) {
                                          const newValues = [...displayValues];
                                          newValues[index] = e.target.value;
                                          onItemsChange?.(subcategory.property, newValues);
                                        } else {
                                          onItemsChange?.(subcategory.property, [e.target.value]);
                                        }
                                      }}
                                      placeholder={`Saisissez ${subcategory.label.toLowerCase()}...`}
                                      isReadOnly={false}
                                    />
                                  </div>
                                  {allowMultiple && (displayValues.length > 1 || value.trim() !== '') && (
                                    <button
                                      type='button'
                                      className={inlineRemoveButtonClass}
                                      aria-label={`Retirer ${subcategory.label}`}
                                      onClick={() => {
                                        const newValues = displayValues.filter((_, i) => i !== index);
                                        onItemsChange?.(subcategory.property, newValues.length > 0 ? newValues : ['']);
                                      }}>
                                      <ModalCloseIcon />
                                    </button>
                                  )}
                                </div>
                              ))}

                              {allowMultiple && (
                                <button
                                  type='button'
                                  className={`w-fit ${outlineButtonClass}`}
                                  onClick={() => {
                                    onItemsChange?.(subcategory.property, [...displayValues, '']);
                                  }}>
                                  <AddIcon size={14} className='text-c4' />
                                  Ajouter
                                </button>
                              )}
                            </div>
                          );
                        }

                        if (allValues.length === 0 || allValues.every((v) => v.trim() === '')) {
                          return null;
                        }

                        const isUri = isUriProperty(itemDetails, subcategory.property);

                        return (
                          <div key={subcategory.key} className='flex flex-col gap-2.5'>
                            <h3 className='text-c6 font-semibold text-base'>{subcategory.label}</h3>
                            {allValues.map(
                              (val, i) =>
                                val.trim() !== '' && (
                                  <div key={i} className='bg-c2 rounded-xl p-6 border-2 border-c3'>
                                    {isUri ? (
                                      <a href={val} target='_blank' rel='noopener noreferrer' className='text-action text-sm leading-snug hover:underline break-all'>
                                        {val}
                                      </a>
                                    ) : (
                                      <p className='text-c5 text-sm leading-snug'>{val}</p>
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
          const canEditCitations = isEditing && view.editable !== false;
          const newCitations = (formData?.[view.key] as any[]) || [];
          return (
            <div className='flex flex-col gap-4'>
              {itemId && <CitationsView itemId={itemId} onTimeChange={onTimeChange} />}
              {canEditCitations && onItemsChange && (
                <InlineCitationForm items={newCitations} onChange={(items) => onItemsChange(view.key, items)} />
              )}
            </div>
          );
        }

        case 'microresumes': {
          const itemId = itemDetails?.['o:id'] || itemDetails?.id;
          const canEditMicroresumes = isEditing && view.editable !== false;
          const newMicroresumes = (formData?.[view.key] as any[]) || [];
          return (
            <div className='flex flex-col gap-4'>
              {itemId && <MicroresumesView itemId={itemId} onTimeChange={onTimeChange} />}
              {canEditMicroresumes && onItemsChange && (
                <InlineMicroresumeForm items={newMicroresumes} onChange={(items) => onItemsChange(view.key, items)} />
              )}
            </div>
          );
        }

        case 'custom': {
          if (!view.customRender) return null;
          return view.customRender(context);
        }

        case 'vocabGroup': {
          if (!view.vocabFields || view.vocabFields.length === 0) return null;
          return (
            <VocabGroupRenderer
              fields={view.vocabFields}
              itemDetails={itemDetails}
              formData={formData}
              isEditing={isEditing ?? false}
              onFieldChange={(property, value) => onItemsChange?.(property, Array.isArray(value) ? value : [value])}
            />
          );
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
      const contributorProperties = config.contributorButtons?.length
        ? [...new Set(config.contributorButtons.map((btn) => btn.property))]
        : undefined;

      return (
        <SimpleOverviewCard
          {...props}
          fields={fields}
          resourceType={config.resourceType}
          contributorProperties={contributorProperties}
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
    resourceType: config.resourceType,
    resourceLabel: config.resourceLabel,
    formOnly: isFormOnlyResourceType(config.resourceType),

    // Formulaire
    formEnabled: config.formEnabled ?? false,
    editSingleColumn: config.editSingleColumn ?? false,
    mediaUploadMode: config.mediaUploadMode ?? 'gallery',
    resourcePickerDisplay: config.resourcePickerDisplay ?? 'grid',
    contributorButtons: config.contributorButtons,
    resourceTemplateId: config.templateId,
    formFields,

    // Mapping viewKey → propriété Omeka S (généré depuis les vues)
    viewKeyToProperty: config.views?.reduce((map, view) => {
      if (view.key && view.property) {
        map[view.key] = view.property;
      }
      return map;
    }, {} as Record<string, string>),
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
// Résolution property_id Omeka (template + fallback API)
// ========================================

const omekaPropertyIdCache: Record<string, number> = {};

async function fetchOmekaPropertyId(term: string): Promise<number | null> {
  if (omekaPropertyIdCache[term]) return omekaPropertyIdCache[term];
  try {
    const res = await fetch(omekaApiUrl(`${API_BASE}properties?term=${encodeURIComponent(term)}`));
    if (!res.ok) return null;
    const props = await res.json();
    if (!Array.isArray(props)) return null;
    const match = props.find((p: { 'o:term'?: string }) => p['o:term'] === term) ?? props[0];
    const id = match?.['o:id'];
    if (typeof id === 'number') {
      omekaPropertyIdCache[term] = id;
      return id;
    }
  } catch (err) {
    console.warn('[resolveOmekaPropertyId] fetch failed for', term, err);
  }
  return null;
}

export async function resolveOmekaPropertyId(
  term: string,
  propMap: Record<string, number>,
  item: Record<string, unknown>,
): Promise<number | null> {
  if (propMap[term]) return propMap[term];
  const localName = term.split(':')[1];
  if (localName && propMap[localName]) return propMap[localName];
  const existing = item[term];
  if (Array.isArray(existing) && existing[0]?.property_id) return existing[0].property_id as number;
  if (OMEKA_PROPERTY_IDS[term]) return OMEKA_PROPERTY_IDS[term];
  return fetchOmekaPropertyId(term);
}

function normalizeResourceItems(value: unknown): { id?: number; 'o:id'?: number; value_resource_id?: number }[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'number') return [{ id: value }];
  return [];
}

function buildOmekaResourceLinks(items: { id?: number; 'o:id'?: number; value_resource_id?: number }[], propertyId: number) {
  return items
    .map((item) => item?.id ?? item?.['o:id'] ?? item?.value_resource_id)
    .filter((id): id is number => id != null)
    .map((resourceId) => ({
      type: 'resource' as const,
      property_id: propertyId,
      value_resource_id: Number(resourceId),
      is_public: true,
    }));
}

const URL_OMEKA_PROPERTIES = new Set(['bibo:uri', 'schema:url']);

const LINKED_RESOURCE_RENDER_TYPES = new Set(['items', 'references', 'microresumes', 'citations']);

/** Vues dont la propriété Omeka référence d'autres items (pas un champ texte / vocab). */
function isLinkedResourceView(view: { renderType?: string }): boolean {
  return LINKED_RESOURCE_RENDER_TYPES.has(view.renderType ?? '');
}

function buildLinkedResourceViewMaps(views?: { key?: string; property?: string; renderType?: string }[]) {
  const viewKeyToPropertyMap: Record<string, string> = {};
  views?.forEach((view) => {
    if (view.key && view.property && isLinkedResourceView(view)) {
      viewKeyToPropertyMap[view.key] = view.property;
    }
  });
  return {
    viewKeyToPropertyMap,
    linkedViewKeys: new Set(Object.keys(viewKeyToPropertyMap)),
    linkedOmekaProperties: new Set(Object.values(viewKeyToPropertyMap)),
  };
}

function isOmekaValueObjectArray(value: unknown[]): boolean {
  if (value.length === 0) return true;
  const first = value[0];
  if (typeof first === 'string') return false;
  if (typeof first !== 'object' || first == null) return false;
  const entry = first as Record<string, unknown>;
  return (
    entry['@value'] !== undefined &&
    entry.value_resource_id == null &&
    entry.id == null &&
    entry['o:id'] == null
  );
}

function buildOmekaValueEntries(
  value: unknown[],
  propertyId: number,
  omekaProperty: string,
  customVocabByProperty: Record<string, number>,
) {
  const vocabId = customVocabByProperty[omekaProperty];
  return (value as any[])
    .map((v: any) => {
      if (typeof v === 'object' && v?.property_id && v?.type && v?.['@value'] !== undefined) return v;
      const str = typeof v === 'string' ? v : String(v?.['@value'] ?? '');
      if (!str.trim()) return null;
      return {
        type: v?.type ?? (vocabId ? `customvocab:${vocabId}` : 'literal'),
        property_id: v?.property_id ?? propertyId,
        '@value': str,
        is_public: v?.is_public ?? true,
      };
    })
    .filter(Boolean);
}

function isUrlOmekaField(
  formKey: string,
  omekaProperty: string,
  fieldTypeByKey: Record<string, FieldType>,
): boolean {
  return (
    fieldTypeByKey[formKey] === 'url' ||
    URL_OMEKA_PROPERTIES.has(omekaProperty) ||
    formKey === 'fullUrl' ||
    formKey === 'externalLink' ||
    formKey === 'url'
  );
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
  // Index: omekaProperty → customVocabId (for fields that store custom-vocab terms)
  const customVocabByProperty: Record<string, number> = {};
  fields.forEach((f) => {
    if (f.customVocabId) customVocabByProperty[f.property] = f.customVocabId;
  });
  const fieldTypeByKey: Record<string, FieldType> = {};
  fields.forEach((f) => {
    fieldTypeByKey[f.key] = f.type;
  });
  config.views?.forEach((view) => {
    view.vocabFields?.forEach((f) => {
      if (f.type === 'customVocab' && f.vocabId) {
        customVocabByProperty[f.property] = f.vocabId;
      }
    });
  });
  const vocabPropertyIds: Record<string, number> = {};
  config.views?.forEach((view) => {
    view.vocabFields?.forEach((f) => {
      if (f.propertyId) vocabPropertyIds[f.property] = f.propertyId;
    });
  });

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
          view.vocabFields?.forEach((f) => {
            keyToProperty[f.property] = f.property;
          });
        });
      }

      // 4. Préparer l'item mis à jour
      const updatedItem = { ...itemData };

      // Toute sauvegarde explicite publie l'item (brouillon ou item masqué).
      updatedItem['o:is_public'] = true;

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

      // Mapping viewKey → propriété Omeka (uniquement vues « ressources liées »)
      const { linkedViewKeys, linkedOmekaProperties } = buildLinkedResourceViewMaps(config.views);
      const writtenOmekaProperties = new Set<string>();

      // Propriété Omeka → clé formulaire préférée (keywords, genre, domaine…)
      const propertyToFormKey: Record<string, string> = {};
      Object.entries(keyToProperty).forEach(([formKey, property]) => {
        if (formKey.includes(':')) return;
        if (!propertyToFormKey[property]) {
          propertyToFormKey[property] = formKey;
        }
      });

      // 5a. Itemset + ressources liées (genre, domaine, mots-clés…) via clés formulaire
      for (const field of fields) {
        if (field.type !== 'itemset' && field.type !== 'resource') continue;
        const raw = data[field.key];
        if (raw === undefined || raw === null) continue;

        const omekaProperty = field.property;
        if (writtenOmekaProperties.has(omekaProperty)) continue;

        const items = normalizeResourceItems(raw);
        const propertyId =
          vocabPropertyIds[omekaProperty] ??
          (await resolveOmekaPropertyId(omekaProperty, propMap, updatedItem));
        if (!propertyId) {
          console.warn(`[handleSave] Property ID non trouvé pour: ${omekaProperty} (clé: ${field.key})`);
          continue;
        }

        updatedItem[omekaProperty] = items.length === 0 ? [] : buildOmekaResourceLinks(items, propertyId);
        writtenOmekaProperties.add(omekaProperty);
      }

      // 5b. Autres champs
      for (const [key, value] of Object.entries(data)) {
        if (ignoredKeys.has(key) || value === undefined || value === null) {
          continue;
        }

        // Ne pas réappliquer une propriété Omeka brute si la clé formulaire porte la valeur à jour
        if (key.includes(':')) {
          const preferredKey = propertyToFormKey[key];
          if (preferredKey && preferredKey !== key && data[preferredKey] !== undefined) {
            continue;
          }
        }

        // Trouver la propriété Omeka S correspondante
        const omekaProperty = keyToProperty[key] || key;

        const isFormResourceKey = !key.includes(':') && Boolean(keyToProperty[key]) && keyToProperty[key] !== key;
        const isLinkedResourceArray =
          Array.isArray(value) &&
          (linkedViewKeys.has(key) ||
            linkedOmekaProperties.has(key) ||
            isFormResourceKey ||
            (value.length > 0 &&
              (value[0].id || value[0]['o:id'] || value[0].value_resource_id)));

        if (isLinkedResourceArray) {
          if (writtenOmekaProperties.has(omekaProperty)) {
            continue;
          }

          const propertyId =
          vocabPropertyIds[omekaProperty] ??
          (await resolveOmekaPropertyId(omekaProperty, propMap, updatedItem));
          if (!propertyId) {
            console.warn(`[handleSave] Property ID non trouvé pour: ${omekaProperty} (clé: ${key})`);
            continue;
          }

          updatedItem[omekaProperty] =
            value.length === 0
              ? []
              : buildOmekaResourceLinks(value, propertyId);
          writtenOmekaProperties.add(omekaProperty);
          continue;
        }

        const propertyId =
          vocabPropertyIds[omekaProperty] ??
          (await resolveOmekaPropertyId(omekaProperty, propMap, updatedItem));

        if (!propertyId) {
          console.warn(`[handleSave] Property ID non trouvé pour: ${omekaProperty} (clé: ${key})`);
          continue;
        }

        // Traiter selon le type de valeur
        if (typeof value === 'string' || typeof value === 'number') {
          const strValue = String(value).trim();

          if (isUrlOmekaField(key, omekaProperty, fieldTypeByKey)) {
            updatedItem[omekaProperty] =
              strValue === ''
                ? []
                : [
                    {
                      type: 'uri',
                      property_id: propertyId,
                      '@id': strValue,
                      is_public: true,
                    },
                  ];
            writtenOmekaProperties.add(omekaProperty);
            continue;
          }

          const vocabId = customVocabByProperty[omekaProperty];
          updatedItem[omekaProperty] = [
            {
              type: vocabId ? `customvocab:${vocabId}` : 'literal',
              property_id: propertyId,
              '@value': strValue,
              is_public: true,
            },
          ];
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            updatedItem[omekaProperty] = [];
            writtenOmekaProperties.add(omekaProperty);
          } else if (typeof value[0] === 'string') {
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
              updatedItem[omekaProperty] = [];
            }
            writtenOmekaProperties.add(omekaProperty);
          } else if (value[0].id || value[0]['o:id'] || value[0].value_resource_id) {
            // Tableau de ressources liées (personnes, projets, etc.)
            // Supporte les formats: {id}, {o:id}, {value_resource_id} (format Omeka brut)
            const resourceIds = value.map((item: any) => item.id || item['o:id'] || item.value_resource_id);
            updatedItem[omekaProperty] = resourceIds.filter(Boolean).map((resourceId: number) => ({
              type: 'resource',
              property_id: propertyId,
              value_resource_id: resourceId,
              is_public: true,
            }));
            writtenOmekaProperties.add(omekaProperty);
          } else if (isOmekaValueObjectArray(value)) {
            updatedItem[omekaProperty] = buildOmekaValueEntries(value, propertyId, omekaProperty, customVocabByProperty);
            writtenOmekaProperties.add(omekaProperty);
          }
        }
      }

      // 6. Restaurer les champs système
      Object.entries(originalSystemFields).forEach(([key, value]) => {
        updatedItem[key] = value;
      });

      console.log('[handleSave] Item data to send:', updatedItem);

      // 7. Sauvegarder
      const url = omekaApiUrl(`${API_BASE}items/${itemId}`);
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
