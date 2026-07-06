import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Spinner, Chip, Checkbox } from '@heroui/react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  modalCloseButtonClasses,
  modalFooterCancelButtonClass,
  modalFooterConfirmButtonClass,
  modalBottomFadeClass,
  Input,
  Select,
  SelectItem,
} from '@/theme/components';
import { Button } from '@/theme/components/button';
import { SearchIcon, ThumbnailIcon, UserIcon, AddIcon } from '@/components/ui/icons';
import { useGetDataByClass } from '@/hooks/useFetchData';
import { getResourceConfigByTemplateId, getResourceIcon } from '@/config/resourceConfig';
import {
  fetchAllPickerResources,
  getPickerResourceTypeLabel,
  normalizePickerItem,
  resolvePickerResourceTypeKey,
} from '@/services/resourcePickerApi';
import { QUICK_CREATE_CONFIGS, QuickCreateModal, type QuickCreatedItem } from './QuickCreateModal';
import { PickerSuggestionsPanel } from './PickerSuggestionsPanel';
import { PICKER_CARD_CHECKBOX_CLASSNAMES } from './pickerConstants';

export interface ResourcePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (resources: any[]) => void;
  title: string;
  resourceClassId?: number; // ID de classe Omeka S pour filtrer les ressources (obsolète, utilisez resourceTemplateId)
  resourceTemplateId?: number; // ID de template Omeka S pour filtrer les ressources (recommandé)
  resourceTemplateIds?: number[]; // IDs de templates multiples (pour bibliographies/médiagraphies)
  itemSetIds?: number[]; // IDs d'item sets Omeka S (pour filtrer par groupe d'objets)
  multiSelect?: boolean; // Autoriser la sélection multiple
  selectedIds?: (string | number)[]; // IDs déjà sélectionnés
  displayProperty?: string; // Propriété à afficher (default: 'dcterms:title')
  filterFn?: (resource: any) => boolean; // Fonction de filtre personnalisée
  maxSelection?: number; // Nombre max de sélections
  displayMode?: 'grid' | 'alphabetic'; // Mode d'affichage: grille (défaut) ou alphabétique (pour mots-clés)
  /** Affiche un bouton "Créer" (QuickCreateModal ou nouvel onglet selon le template) */
  allowCreate?: boolean;
  /** Remplace la création par défaut (ex. modale item set pour les domaines) */
  onCreateOverride?: () => void;
  /** Si true, masque la grille de sélection (création uniquement) */
  createOnly?: boolean;
  /** Section optionnelle au-dessus de la grille (ex. suggestions par mots-clés) */
  suggestionSection?: {
    title: string;
    items: any[];
    loading?: boolean;
    keywordCount?: number;
  };
  /** Affiche le type de ressource sous le titre (ex. contenus associés) au lieu de l'intervenant */
  showResourceType?: boolean;
}

/**
 * Composant popup réutilisable pour sélectionner des ressources
 * Utilisé pour : keywords, actants, feedbacks, outils, etc.
 */
const API_BASE = '/omk/api/';

// Charger les infos d'un template pour avoir son label
const loadTemplateInfo = async (templateId: number): Promise<string> => {
  const localConfig = getResourceConfigByTemplateId(templateId);
  if (localConfig) return localConfig.label;

  try {
    const response = await fetch(`${API_BASE}resource_templates/${templateId}`);
    if (!response.ok) return `Template ${templateId}`;
    const data = await response.json();
    return data['o:label'] || `Template ${templateId}`;
  } catch {
    return `Template ${templateId}`;
  }
};

const loadResourcesByTemplateId = async (
  templateId: number,
  options?: { search?: string },
): Promise<{ resources: any[]; templateLabel: string }> => {
  try {
    const [items, templateLabel] = await Promise.all([
      fetchAllPickerResources({ templateId, q: options?.search }),
      loadTemplateInfo(templateId),
    ]);
    return { resources: items.map((item) => normalizePickerItem(item, templateId)), templateLabel };
  } catch (err) {
    console.error('[ResourcePicker] Erreur chargement ressources:', err);
    return { resources: [], templateLabel: `Template ${templateId}` };
  }
};

const loadResourcesByItemSetIds = async (itemSetIds: number[]): Promise<TemplateData[]> => {
  try {
    const batches = await Promise.all(itemSetIds.map((itemSetId) => fetchAllPickerResources({ itemSetId })));
    const seen = new Set<number>();
    const resources: any[] = [];
    for (const items of batches) {
      for (const item of items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        resources.push(normalizePickerItem(item));
      }
    }
    return [{ templateId: 0, templateLabel: 'Domaine', resources }];
  } catch (err) {
    console.error('[ResourcePicker] Erreur chargement ressources par item set:', err);
    return [];
  }
};

// Structure pour stocker les ressources par template
interface TemplateData {
  templateId: number;
  templateLabel: string;
  resources: any[];
}

// Helper function to load resources from multiple template IDs
// Groups templates with the same label into a single tab
const loadResourcesByMultipleTemplateIds = async (templateIds: number[]): Promise<TemplateData[]> => {
  try {
    const rawResults = await Promise.all(
      templateIds.map(async (templateId) => {
        const { resources, templateLabel } = await loadResourcesByTemplateId(templateId);
        return { templateId, templateLabel, resources };
      }),
    );

    // Group by label to avoid duplicate tabs (e.g. Bibliographie 81 + 99)
    const grouped = new Map<string, TemplateData>();
    for (const r of rawResults) {
      const existing = grouped.get(r.templateLabel);
      if (existing) {
        const seen = new Set(existing.resources.map((item) => item['o:id'] ?? item.id));
        for (const item of r.resources) {
          const id = item['o:id'] ?? item.id;
          if (!seen.has(id)) {
            existing.resources.push(item);
            seen.add(id);
          }
        }
      } else {
        grouped.set(r.templateLabel, { templateId: r.templateId, templateLabel: r.templateLabel, resources: r.resources });
      }
    }

    return [...grouped.values()];
  } catch (err) {
    console.error('[ResourcePicker] Erreur chargement ressources multiples:', err);
    return [];
  }
};

const PickerScrollArea: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className='relative'>
    <div className='max-h-[450px] overflow-y-auto pr-px'>{children}</div>
    <div className={`absolute bottom-0 left-0 right-0 z-10 ${modalBottomFadeClass}`} aria-hidden />
  </div>
);

const EMPTY_SELECTED_IDS: (string | number)[] = [];

const serializeSelectedIds = (ids: (string | number)[]): string =>
  ids.map((id) => String(id)).sort().join(',');

type ResourcePickerCardProps = {
  selected: boolean;
  title: string;
  thumbnailUrl: string | null;
  secondaryLabel: string | null;
  showResourceType: boolean;
  TypeIcon?: React.FC<{ size?: number; className?: string }>;
  onToggle: () => void;
};

const ResourcePickerCard: React.FC<ResourcePickerCardProps> = ({
  selected,
  title,
  thumbnailUrl,
  secondaryLabel,
  showResourceType,
  TypeIcon,
  onToggle,
}) => (
  <div
    onClick={onToggle}
    className={`
      relative cursor-pointer rounded-xl border-2 transition-all ease-in-out duration-200
      ${
        selected
          ? 'border-action bg-action/10 shadow-[inset_0_0px_30px_rgba(var(--action-rgb),0.1)]'
          : 'border-c3 hover:border-c4 hover:bg-c2 shadow-[inset_0_0px_30px_rgba(255,255,255,0.04)]'
      }
    `}>
    <div className='absolute top-2 left-2 z-10 pointer-events-none'>
      <Checkbox isSelected={selected} classNames={PICKER_CARD_CHECKBOX_CLASSNAMES} />
    </div>

    <div className='p-3 flex flex-col gap-2'>
      <div
        className={`w-full h-[80px] rounded-lg flex justify-center items-center overflow-hidden ${thumbnailUrl ? 'bg-cover bg-center' : 'bg-gradient-to-br from-c2 to-c3'}`}
        style={thumbnailUrl ? { backgroundImage: `url(${thumbnailUrl})` } : {}}>
        {!thumbnailUrl && <ThumbnailIcon className='text-c4/30' size={28} />}
      </div>

      <div className='flex flex-col gap-px'>
        <p className='text-sm text-c6 font-medium line-clamp-2 leading-tight'>{title}</p>
        {secondaryLabel && (
          <div className='flex gap-1.5 items-center min-w-0'>
            {showResourceType && TypeIcon ? (
              <TypeIcon size={12} className='text-c4 shrink-0' />
            ) : (
              <div className='w-1.5 h-1.5 flex items-center justify-center bg-c3 rounded-md shrink-0'>
                <UserIcon className='text-c4' size={10} />
              </div>
            )}
            <p className='text-[11px] text-c4 font-normal truncate'>{secondaryLabel}</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

export const ResourcePicker: React.FC<ResourcePickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  title,
  resourceClassId,
  resourceTemplateId,
  resourceTemplateIds,
  itemSetIds,
  multiSelect = false,
  selectedIds: selectedIdsProp,
  displayProperty = 'dcterms:title',
  filterFn,
  maxSelection,
  displayMode = 'grid',
  allowCreate = false,
  onCreateOverride,
  createOnly = false,
  suggestionSection,
  showResourceType = false,
}) => {
  const selectedIds = selectedIdsProp ?? EMPTY_SELECTED_IDS;
  const selectedIdsKey = serializeSelectedIds(selectedIds);
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string | number>>(new Set(selectedIds));
  // Ressources créées via postMessage, en attente d'apparaître dans la liste rechargée
  const pendingCreatedRef = useRef<Map<string | number, any>>(new Map());
  const sessionCreatedIdsRef = useRef<Set<string | number>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('all');
  const [quickCreateTemplateId, setQuickCreateTemplateId] = useState<number | null>(null);

  // État pour les ressources chargées par template ID (nouvelle structure avec onglets)
  const [templateDataList, setTemplateDataList] = useState<TemplateData[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [apiSearchResults, setApiSearchResults] = useState<any[] | null>(null);
  const [apiSearchLoading, setApiSearchLoading] = useState(false);

  // Fetch resources (ancien système avec resourceClassId)
  const { data: classResources, loading: classLoading } = useGetDataByClass(resourceClassId || 0);

  // Charger les ressources par template ID(s) ou item set ID(s) quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      // Priorité aux itemSetIds
      if (itemSetIds && itemSetIds.length > 0) {
        setTemplateLoading(true);
        setActiveTab('all');
        loadResourcesByItemSetIds(itemSetIds).then((res) => {
          setTemplateDataList(res);
          setTemplateLoading(false);
        });
      } else if (resourceTemplateIds && resourceTemplateIds.length > 0) {
        setTemplateLoading(true);
        setActiveTab('all'); // Reset to "all" tab
        loadResourcesByMultipleTemplateIds(resourceTemplateIds).then((res) => {
          setTemplateDataList(res);
          setTemplateLoading(false);
        });
      } else if (resourceTemplateId) {
        setTemplateLoading(true);
        setActiveTab('all');
        loadResourcesByTemplateId(resourceTemplateId).then(({ resources, templateLabel }) => {
          setTemplateDataList([{ templateId: resourceTemplateId, templateLabel, resources }]);
          setTemplateLoading(false);
        });
      }
    }
  }, [isOpen, resourceTemplateId, resourceTemplateIds, itemSetIds]);

  // Recherche côté backend ResourcePicker (q=…)
  useEffect(() => {
    const trimmed = searchTerm.trim();
    const templateIds =
      resourceTemplateIds && resourceTemplateIds.length > 0
        ? resourceTemplateIds
        : resourceTemplateId
          ? [resourceTemplateId]
          : [];
    const itemSetIdList = itemSetIds && itemSetIds.length > 0 ? itemSetIds : [];

    if (!isOpen || trimmed.length < 2 || (templateIds.length === 0 && itemSetIdList.length === 0)) {
      setApiSearchResults((prev) => (prev === null ? prev : null));
      setApiSearchLoading((prev) => (prev ? false : prev));
      return;
    }

    const timer = window.setTimeout(async () => {
      setApiSearchLoading(true);
      try {
        const batches = await Promise.all([
          ...templateIds.map(async (id) => {
            const items = await fetchAllPickerResources({ templateId: id, q: trimmed });
            return items.map((item) => normalizePickerItem(item, id));
          }),
          ...itemSetIdList.map(async (id) => {
            const items = await fetchAllPickerResources({ itemSetId: id, q: trimmed });
            return items.map((item) => normalizePickerItem(item));
          }),
        ]);
        const unique = new Map<string | number, any>();
        batches.flat().forEach((item) => unique.set(item.id as number, item));
        setApiSearchResults([...unique.values()]);
      } catch {
        setApiSearchResults([]);
      } finally {
        setApiSearchLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [isOpen, searchTerm, resourceTemplateId, resourceTemplateIds, itemSetIds]);

  const reloadResources = useCallback(async () => {
    if (itemSetIds && itemSetIds.length > 0) {
      setTemplateLoading(true);
      const res = await loadResourcesByItemSetIds(itemSetIds);
      setTemplateDataList(res);
      setTemplateLoading(false);
    } else if (resourceTemplateIds && resourceTemplateIds.length > 0) {
      setTemplateLoading(true);
      const res = await loadResourcesByMultipleTemplateIds(resourceTemplateIds);
      setTemplateDataList(res);
      setTemplateLoading(false);
    } else if (resourceTemplateId) {
      setTemplateLoading(true);
      const { resources, templateLabel } = await loadResourcesByTemplateId(resourceTemplateId);
      setTemplateDataList([{ templateId: resourceTemplateId, templateLabel, resources }]);
      setTemplateLoading(false);
    }
  }, [itemSetIds, resourceTemplateIds, resourceTemplateId]);

  const createableTemplateId = useMemo(() => {
    if (!allowCreate) return null;
    const ids = resourceTemplateId ? [resourceTemplateId] : resourceTemplateIds || [];
    return ids.find((id) => {
      const cfg = getResourceConfigByTemplateId(id);
      return cfg?.createUrl || QUICK_CREATE_CONFIGS[id];
    }) ?? null;
  }, [allowCreate, resourceTemplateId, resourceTemplateIds]);

  const handleCreate = (templateId: number) => {
    if (onCreateOverride) {
      onCreateOverride();
      return;
    }
    const cfg = getResourceConfigByTemplateId(templateId);
    if (cfg?.createUrl) {
      window.open(`${cfg.createUrl}?fromPicker=1`, '_blank');
    } else if (QUICK_CREATE_CONFIGS[templateId]) {
      setQuickCreateTemplateId(templateId);
    }
  };

  const handleQuickCreated = async (item: QuickCreatedItem) => {
    setQuickCreateTemplateId(null);
    sessionCreatedIdsRef.current.add(item.id);
    await reloadResources();
    setLocalSelectedIds((prev) => new Set([...prev, item.id]));
  };

  const injectCreatedResource = useCallback((id: number, title: string) => {
    sessionCreatedIdsRef.current.add(id);
    const newResource = {
      'o:id': id,
      id,
      'dcterms:title': [{ '@value': title }],
      title,
      display_title: title,
    };
    pendingCreatedRef.current.set(id, newResource);

    setTemplateDataList((prev) => {
      if (prev.length === 0) {
        return [{ templateId: resourceTemplateId || 0, templateLabel: '', resources: [newResource] }];
      }
      return prev.map((t, idx) => {
        const targetTemplate = resourceTemplateId ? t.templateId === resourceTemplateId : idx === 0;
        if (!targetTemplate && prev.length > 1) return t;
        const exists = t.resources.some((r) => (r['o:id'] || r.id) === id);
        if (exists) return t;
        return { ...t, resources: [newResource, ...t.resources] };
      });
    });

    setLocalSelectedIds((prev) => new Set([...prev, id]));
  }, [resourceTemplateId]);

  // Écouter le postMessage d'une page /add-resource créée depuis le picker
  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'RESOURCE_CREATED') return;
      const { id, title: newTitle } = event.data as { id: number; title: string };
      const title = newTitle || `Item ${id}`;
      injectCreatedResource(id, title);
      // Re-injecter après reload au cas où l'API n'a pas encore l'item
      void reloadResources().then(() => injectCreatedResource(id, title));
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isOpen, reloadResources, injectCreatedResource]);

  // Calculer les ressources plates (pour la compatibilité avec le reste du code)
  const allTemplateResources = useMemo(() => {
    return templateDataList.flatMap((t) => t.resources);
  }, [templateDataList]);

  // Choisir la source de données appropriée
  const resources = resourceTemplateId || resourceTemplateIds || itemSetIds ? allTemplateResources : classResources;
  const loading =
    (resourceTemplateId || resourceTemplateIds || itemSetIds ? templateLoading : classLoading) || apiSearchLoading;

  // Ressources filtrées par onglet actif
  const resourcesForActiveTab = useMemo(() => {
    if (!resources) return [];
    if (activeTab === 'all') return resources;

    const templateId = parseInt(activeTab, 10);
    const templateData = templateDataList.find((t) => t.templateId === templateId);
    return templateData?.resources || [];
  }, [resources, activeTab, templateDataList]);

  // Reset local selection when modal opens (selectedIdsKey évite une boucle si le parent recrée le tableau)
  useEffect(() => {
    if (isOpen) {
      setLocalSelectedIds((prev) => {
        const next = new Set(selectedIds);
        if (prev.size === next.size && [...prev].every((id) => next.has(id))) return prev;
        return next;
      });
      setSearchTerm((prev) => (prev === '' ? prev : ''));
    } else {
      pendingCreatedRef.current.clear();
      sessionCreatedIdsRef.current.clear();
    }
  }, [isOpen, selectedIdsKey]);

  const getDisplayValue = useCallback(
    (resource: any): string => {
      if (displayProperty.includes('.')) {
        const parts = displayProperty.split('.');
        let value = resource;
        for (const part of parts) {
          if (value === undefined || value === null) return '';
          value = value[part];
        }
        return String(value || '');
      }

      const prop = resource[displayProperty];
      if (Array.isArray(prop) && prop[0]) {
        return prop[0]['@value'] || prop[0]['display_title'] || '';
      }
      if (typeof prop === 'string') return prop;

      return resource['o:title'] || resource['display_title'] || resource['title'] || '';
    },
    [displayProperty],
  );

  // Extract thumbnail URL from resource (backend picker ou Omeka complet)
  const getThumbnailUrl = (resource: any): string | null => {
    if (typeof resource.thumbnail === 'string' && resource.thumbnail) return resource.thumbnail;
    return (
      resource['thumbnail_display_urls']?.medium ||
      resource['thumbnail_display_urls']?.square ||
      resource['thumbnail_display_urls']?.large ||
      resource['o:thumbnail']?.['@id'] ||
      resource['o:primary_media']?.['thumbnail_display_urls']?.medium ||
      null
    );
  };

  // Extract actant/author name from resource (backend picker ou Omeka complet)
  const getActantName = (resource: any): string | null => {
    if (typeof resource.subtitle === 'string' && resource.subtitle) return resource.subtitle;
    const actant = resource['jdc:hasActant']?.[0];
    return actant?.['display_title'] || actant?.['@value'] || null;
  };

  // Get resource class/template label
  const getResourceLabel = (resource: any): string | null => {
    return resource['o:resource_class']?.['o:label'] || resource['o:resource_template']?.['o:label'] || null;
  };

  // Get resource ID
  const getResourceId = (resource: any): string | number => {
    return resource['o:id'] || resource['id'] || resource['@id'];
  };

  // Filter and sort resources
  const filteredResources = useMemo(() => {
    const trimmedSearch = searchTerm.trim();
    const useApiSearch = trimmedSearch.length >= 2 && apiSearchResults !== null;
    const baseList = useApiSearch ? apiSearchResults : resourcesForActiveTab;

    if (!baseList || !Array.isArray(baseList)) return [];

    let result = [...baseList];

    if (filterFn) {
      result = result.filter(filterFn);
    }

    if (!useApiSearch && trimmedSearch) {
      const lowerSearch = trimmedSearch.toLowerCase();
      result = result.filter((r) => getDisplayValue(r).toLowerCase().includes(lowerSearch));
    }

    return result;
  }, [resourcesForActiveTab, searchTerm, filterFn, getDisplayValue, apiSearchResults]);

  // Toggle selection
  const toggleSelection = (resource: any) => {
    const id = getResourceId(resource);
    const newSelected = new Set(localSelectedIds);

    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (!multiSelect) {
        newSelected.clear();
      }
      if (!maxSelection || newSelected.size < maxSelection) {
        newSelected.add(id);
      }
    }

    setLocalSelectedIds(newSelected);
  };

  // Check if resource is selected
  const isSelected = (resource: any): boolean => {
    const id = getResourceId(resource);
    return localSelectedIds.has(id);
  };

  // Handle confirm
  const handleConfirm = () => {
    const selectedFromList = (resources || []).filter((r) => localSelectedIds.has(getResourceId(r)));
    const foundIds = new Set(selectedFromList.map((r) => getResourceId(r)));
    const orphanResources = [...localSelectedIds]
      .filter((id) => !foundIds.has(id))
      .map((id) => pendingCreatedRef.current.get(id))
      .filter(Boolean);

    const allSelected = [...selectedFromList, ...orphanResources];
    onSelect(
      allSelected.map((r) => ({
        ...r,
        _sessionCreated: sessionCreatedIdsRef.current.has(getResourceId(r)),
      })),
    );
    onClose();
  };

  // Truncate text
  const truncate = (text: string, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // Composant carte pour une ressource — props calculées ici, composant stable au niveau module
  const renderResourceCard = (resource: any) => {
    const typeKey = showResourceType ? resolvePickerResourceTypeKey(resource) : null;
    const actantName = getActantName(resource);
    const resourceLabel = getResourceLabel(resource);
    const typeLabel = showResourceType ? getPickerResourceTypeLabel(resource) : null;

    return (
      <ResourcePickerCard
        selected={isSelected(resource)}
        title={getDisplayValue(resource)}
        thumbnailUrl={getThumbnailUrl(resource)}
        secondaryLabel={showResourceType ? typeLabel : actantName || resourceLabel}
        showResourceType={showResourceType}
        TypeIcon={typeKey ? getResourceIcon(typeKey) : undefined}
        onToggle={() => toggleSelection(resource)}
      />
    );
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='4xl'
      backdrop='blur'
      scrollBehavior='inside'
      classNames={{ closeButton: modalCloseButtonClasses }}>
      <ModalContent>
        <ModalHeader className='flex flex-col gap-px'>
          <h2 className='text-c6 text-xl font-semibold'>{title}</h2>
          <p className='text-c4 text-sm font-normal'>
            {createOnly
              ? 'Créez une nouvelle ressource pour la lier à cet élément.'
              : `${localSelectedIds.size} sélectionné(s) sur ${filteredResources.length} disponibles${maxSelection ? ` (max: ${maxSelection})` : ''}`}
          </p>
        </ModalHeader>

        <ModalBody>
          {/* Search, type filter and sort */}
          <div className='flex flex-col sm:flex-row gap-3 mb-4'>
            {!createOnly && (
            <Input
              aria-label='Rechercher'
              classNames={{
                base: 'flex-1 w-full',
                mainWrapper: 'w-full',
                inputWrapper: '!min-h-10 !h-10 !rounded-lg',
                input: 'text-c6 text-sm',
              }}
              placeholder='Rechercher...'
              startContent={<SearchIcon size={16} className='text-c5 shrink-0' />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              type='search'
              isClearable
              onClear={() => setSearchTerm('')}
            />
            )}

            {allowCreate && (createableTemplateId || onCreateOverride) && (
              <Button
                variant='bordered'
                onPress={() => handleCreate(createableTemplateId || 0)}
                className={`shrink-0 border-2 border-c3 bg-c2 hover:bg-c3 text-c6 text-xs rounded-lg min-h-10 h-10 px-3 ${createOnly ? 'w-full sm:w-auto' : ''}`}>
                <AddIcon size={14} className='text-c5' />
                {onCreateOverride
                  ? 'Créer'
                  : QUICK_CREATE_CONFIGS[createableTemplateId!]?.title ||
                    (getResourceConfigByTemplateId(createableTemplateId!)?.label
                      ? `Créer ${getResourceConfigByTemplateId(createableTemplateId!)!.label.toLowerCase()}`
                      : 'Créer')}
              </Button>
            )}

            {!createOnly && templateDataList.length > 1 && (
              <Select
                aria-label='Type de ressource'
                disallowEmptySelection
                selectionMode='single'
                selectedKeys={[activeTab]}
                onSelectionChange={(keys) => {
                  const selectedKey = Array.from(keys)[0] as string;
                  if (selectedKey) setActiveTab(selectedKey);
                }}
                classNames={{
                  base: 'w-full sm:w-auto sm:min-w-[160px] shrink-0',
                  trigger: '!min-h-10 !h-10 max-h-10',
                  value: 'text-c6 text-sm',
                }}>
                {[
                  { key: 'all', label: 'Tous' },
                  ...templateDataList.map((template) => ({
                    key: String(template.templateId),
                    label: template.templateLabel,
                  })),
                ].map((option) => (
                  <SelectItem key={option.key}>{option.label}</SelectItem>
                ))}
              </Select>
            )}

          </div>

          {/* Selected chips */}
          {localSelectedIds.size > 0 && (
            <div className='flex flex-wrap items-center gap-2 mb-4 '>
              <span className='text-c5 text-sm mr-2'>Sélection :</span>
              {Array.from(localSelectedIds).map((id) => {
                const resource = resources?.find((r) => getResourceId(r) === id);
                if (!resource) return null;
                return (
                  <Chip
                    key={String(id)}
                    onClose={() => toggleSelection(resource)}
                    variant='flat'
                    classNames={{
                      base: 'bg-action px-2 py-px rounded-lg',
                      content: 'text-selected font-medium px-3',
                      closeButton: 'text-selected/70 hover:text-selected',
                    }}>
                    {truncate(getDisplayValue(resource), 30)}
                  </Chip>
                );
              })}
            </div>
          )}

          {/* Suggestions (RelatedResourcePicker) */}
          {!createOnly && suggestionSection && (suggestionSection.loading || suggestionSection.items.length > 0) && (
            <PickerSuggestionsPanel
              title={suggestionSection.title}
              items={suggestionSection.items}
              loading={suggestionSection.loading}
              keywordCount={suggestionSection.keywordCount}
              getResourceId={getResourceId}
              getTitle={getDisplayValue}
              getThumbnailUrl={getThumbnailUrl}
              isSelected={isSelected}
              onToggle={toggleSelection}
            />
          )}

          {/* Loading state */}
          {loading && (
            <div className='flex justify-center items-center py-12'>
              <Spinner size='sm' color='current' className='text-c6' />
              <span className='ml-3 text-c5'>Chargement...</span>
            </div>
          )}

          {/* Resource grid ou liste alphabétique */}
          {!loading && !createOnly && (
            <>
              {filteredResources.length === 0 ? (
                <div className='text-center py-12'>
                  <ThumbnailIcon className='text-c4/30 mx-auto mb-3' size={40} />
                  <p className='text-c5 text-sm'>Aucun résultat trouvé</p>
                </div>
              ) : displayMode === 'alphabetic' ? (
                // Affichage alphabétique pour les mots-clés
                <PickerScrollArea>
                  <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-px'>
                    {(() => {
                      // Grouper les ressources par première lettre
                      const grouped = filteredResources.reduce(
                        (acc, resource) => {
                          const name = getDisplayValue(resource);
                          const letter = name.charAt(0).toUpperCase();
                          if (!acc[letter]) acc[letter] = [];
                          acc[letter].push(resource);
                          return acc;
                        },
                        {} as Record<string, any[]>,
                      );

                      // Trier les lettres
                      const sortedLetters = Object.keys(grouped).sort();

                      return sortedLetters.map((letter) => (
                        <div key={letter} className='mb-4'>
                          <div className='text-action font-bold text-lg mb-2 border-b border-c3 pb-px'>{letter}</div>
                          <div className='flex flex-col gap-px'>
                            {grouped[letter].map((resource: any) => {
                              const selected = isSelected(resource);
                              return (
                                <div
                                  key={String(getResourceId(resource))}
                                  onClick={() => toggleSelection(resource)}
                                  className={`
                                    flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all
                                    ${selected ? 'bg-action/20 text-action' : 'hover:bg-c2 text-c6'}
                                  `}>
                                  <Checkbox
                                    isSelected={selected}
                                    onValueChange={() => toggleSelection(resource)}
                                    classNames={PICKER_CARD_CHECKBOX_CLASSNAMES}
                                  />
                                  <span className='text-sm'>{getDisplayValue(resource)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </PickerScrollArea>
              ) : (
                // Affichage en grille standard
                <PickerScrollArea>
                  <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'>
                    {filteredResources.map((resource) => (
                      <div key={String(getResourceId(resource))}>{renderResourceCard(resource)}</div>
                    ))}
                  </div>
                </PickerScrollArea>
              )}
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant='light' onPress={onClose} className={modalFooterCancelButtonClass}>
            Annuler
          </Button>
          <Button
            onPress={handleConfirm}
            className={modalFooterConfirmButtonClass}
            isDisabled={localSelectedIds.size === 0}>
            Confirmer ({localSelectedIds.size})
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>

    {quickCreateTemplateId && QUICK_CREATE_CONFIGS[quickCreateTemplateId] && (
      <QuickCreateModal
        isOpen={true}
        onClose={() => setQuickCreateTemplateId(null)}
        onCreated={handleQuickCreated}
        templateId={quickCreateTemplateId}
        title={QUICK_CREATE_CONFIGS[quickCreateTemplateId].title}
        fields={QUICK_CREATE_CONFIGS[quickCreateTemplateId].fields}
      />
    )}
  </>
  );
};

export default ResourcePicker;
