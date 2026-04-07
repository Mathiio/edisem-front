import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Spinner, Chip, Checkbox, Tabs, Tab } from '@heroui/react';
import { SearchIcon, SortIcon, ThumbnailIcon, UserIcon } from '@/components/ui/icons';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { useGetDataByClass } from '@/hooks/useFetchData';
import { getResourceConfigByTemplateId } from '@/config/resourceConfig';

export interface ResourcePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (resources: any[]) => void;
  title: string;
  resourceClassId?: number; // ID de classe Omeka S pour filtrer les ressources (obsolète, utilisez resourceTemplateId)
  resourceTemplateId?: number; // ID de template Omeka S pour filtrer les ressources (recommandé)
  resourceTemplateIds?: number[]; // IDs de templates multiples (pour bibliographies/médiagraphies)
  multiSelect?: boolean; // Autoriser la sélection multiple
  selectedIds?: (string | number)[]; // IDs déjà sélectionnés
  displayProperty?: string; // Propriété à afficher (default: 'dcterms:title')
  filterFn?: (resource: any) => boolean; // Fonction de filtre personnalisée
  maxSelection?: number; // Nombre max de sélections
  displayMode?: 'grid' | 'alphabetic'; // Mode d'affichage: grille (défaut) ou alphabétique (pour mots-clés)
}

/**
 * Composant popup réutilisable pour sélectionner des ressources
 * Utilisé pour : keywords, actants, feedbacks, outils, etc.
 */
// Helper function to load resources by template ID (from Omeka S API)
const API_BASE = '/omk/api/';

// Charger les infos d'un template pour avoir son label
const loadTemplateInfo = async (templateId: number): Promise<string> => {
  // 1. Chercher dans le registre local (instantané, pas de fetch)
  const localConfig = getResourceConfigByTemplateId(templateId);
  if (localConfig) return localConfig.label;

  // 2. Fallback : charger depuis l'API Omeka S
  try {
    const response = await fetch(`${API_BASE}resource_templates/${templateId}`);
    if (!response.ok) return `Template ${templateId}`;
    const data = await response.json();
    return data['o:label'] || `Template ${templateId}`;
  } catch {
    return `Template ${templateId}`;
  }
};

const loadResourcesByTemplateId = async (templateId: number): Promise<{ resources: any[]; templateLabel: string }> => {
  try {
    // Charger jusqu'à 500 items par template (pagination)
    const allResources: any[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    // Charger le label du template en parallèle
    const templateLabelPromise = loadTemplateInfo(templateId);

    while (hasMore && page <= 5) {
      // Max 5 pages = 500 items par template
      const url = `${API_BASE}items?resource_template_id=${templateId}&per_page=${perPage}&page=${page}`;
      console.log('[ResourcePicker] Fetching:', url);
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[ResourcePicker] Erreur chargement ressources par template', response.status);
        break;
      }

      const data = await response.json();
      console.log(`[ResourcePicker] Template ${templateId} - Page ${page}: ${data.length} items`);

      allResources.push(...data);
      hasMore = data.length === perPage;
      page++;
    }

    const templateLabel = await templateLabelPromise;
    console.log(`[ResourcePicker] Template ${templateId} (${templateLabel}) - Total: ${allResources.length} items`);

    return { resources: allResources, templateLabel };
  } catch (err) {
    console.error('[ResourcePicker] Erreur chargement ressources:', err);
    return { resources: [], templateLabel: `Template ${templateId}` };
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
        existing.resources = [...existing.resources, ...r.resources];
      } else {
        grouped.set(r.templateLabel, { templateId: r.templateId, templateLabel: r.templateLabel, resources: r.resources });
      }
    }

    const results = [...grouped.values()];
    const total = results.reduce((sum, t) => sum + t.resources.length, 0);
    console.log('[ResourcePicker] Total ressources chargées:', total, '(' + results.length + ' onglets)');
    return results;
  } catch (err) {
    console.error('[ResourcePicker] Erreur chargement ressources multiples:', err);
    return [];
  }
};

export const ResourcePicker: React.FC<ResourcePickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  title,
  resourceClassId,
  resourceTemplateId,
  resourceTemplateIds,
  multiSelect = false,
  selectedIds = [],
  displayProperty = 'dcterms:title',
  filterFn,
  maxSelection,
  displayMode = 'grid',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string | number>>(new Set(selectedIds));
  const [activeTab, setActiveTab] = useState<string>('all');

  // État pour les ressources chargées par template ID (nouvelle structure avec onglets)
  const [templateDataList, setTemplateDataList] = useState<TemplateData[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);

  // Fetch resources (ancien système avec resourceClassId)
  const { data: classResources, loading: classLoading } = useGetDataByClass(resourceClassId || 0);

  // Charger les ressources par template ID(s) quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      // Priorité aux resourceTemplateIds multiples
      if (resourceTemplateIds && resourceTemplateIds.length > 0) {
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
  }, [isOpen, resourceTemplateId, resourceTemplateIds]);

  // Calculer les ressources plates (pour la compatibilité avec le reste du code)
  const allTemplateResources = useMemo(() => {
    return templateDataList.flatMap((t) => t.resources);
  }, [templateDataList]);

  // Choisir la source de données appropriée
  const resources = resourceTemplateId || resourceTemplateIds ? allTemplateResources : classResources;
  const loading = resourceTemplateId || resourceTemplateIds ? templateLoading : classLoading;

  // Ressources filtrées par onglet actif
  const resourcesForActiveTab = useMemo(() => {
    if (!resources) return [];
    if (activeTab === 'all') return resources;

    const templateId = parseInt(activeTab, 10);
    const templateData = templateDataList.find((t) => t.templateId === templateId);
    return templateData?.resources || [];
  }, [resources, activeTab, templateDataList]);

  // Reset local selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSelectedIds(new Set(selectedIds));
      setSearchTerm('');
    }
  }, [isOpen, selectedIds]);

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

  // Extract thumbnail URL from resource
  const getThumbnailUrl = (resource: any): string | null => {
    return (
      resource['thumbnail_display_urls']?.medium ||
      resource['thumbnail_display_urls']?.square ||
      resource['thumbnail_display_urls']?.large ||
      resource['o:thumbnail']?.['@id'] ||
      resource['o:primary_media']?.['thumbnail_display_urls']?.medium ||
      null
    );
  };

  // Extract actant/author name from resource
  const getActantName = (resource: any): string | null => {
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
    if (!resourcesForActiveTab || !Array.isArray(resourcesForActiveTab)) return [];

    let result = [...resourcesForActiveTab];

    // Apply custom filter
    if (filterFn) {
      result = result.filter(filterFn);
    }

    // Apply search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((r) => {
        const displayValue = getDisplayValue(r).toLowerCase();
        return displayValue.includes(lowerSearch);
      });
    }

    // Sort
    result.sort((a, b) => {
      const aValue = getDisplayValue(a);
      const bValue = getDisplayValue(b);
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });

    return result;
  }, [resourcesForActiveTab, searchTerm, sortOrder, filterFn, getDisplayValue]);

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
    if (!resources) return;

    const selectedResources = resources.filter((r) => localSelectedIds.has(getResourceId(r)));
    onSelect(selectedResources);
    onClose();
  };

  // Handle sort order change
  const handleSortOrderChange = (key: any) => {
    const selectedKey = Array.from(key)[0];
    if (selectedKey === 'asc' || selectedKey === 'desc') {
      setSortOrder(selectedKey);
    }
  };

  // Truncate text
  const truncate = (text: string, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // Composant carte pour une ressource
  const ResourceCard: React.FC<{ resource: any }> = ({ resource }) => {
    const selected = isSelected(resource);
    const thumbnailUrl = getThumbnailUrl(resource);
    const actantName = getActantName(resource);
    const resourceLabel = getResourceLabel(resource);

    return (
      <div
        onClick={() => toggleSelection(resource)}
        className={`
          relative cursor-pointer rounded-xl border-2 transition-all ease-in-out duration-200
          ${
            selected
              ? 'border-action bg-action/10 shadow-[inset_0_0px_30px_rgba(var(--action-rgb),0.1)]'
              : 'border-c3 hover:border-c4 hover:bg-c2 shadow-[inset_0_0px_30px_rgba(255,255,255,0.04)]'
          }
        `}>
        {/* Checkbox en haut à gauche */}
        <div className='absolute top-2 left-2 z-10'>
          <Checkbox
            isSelected={selected}
            onValueChange={() => toggleSelection(resource)}
            classNames={{
              wrapper: 'w-6 h-6 before:border-c4 before:border-2 after:bg-action',
              icon: 'w-4 h-4',
            }}
          />
        </div>

        <div className='p-3 flex flex-col gap-2'>
          {/* Thumbnail ou placeholder */}
          <div
            className={`w-full h-[80px] rounded-lg flex justify-center items-center overflow-hidden ${thumbnailUrl ? 'bg-cover bg-center' : 'bg-gradient-to-br from-c2 to-c3'}`}
            style={thumbnailUrl ? { backgroundImage: `url(${thumbnailUrl})` } : {}}>
            {!thumbnailUrl && <ThumbnailIcon className='text-c4/30' size={28} />}
          </div>

          {/* Contenu */}
          <div className='flex flex-col gap-px'>
            {/* Titre */}
            <p className='text-sm text-c6 font-medium line-clamp-2 leading-tight'>{getDisplayValue(resource)}</p>

            {/* Actant ou classe */}
            {(actantName || resourceLabel) && (
              <div className='flex gap-1.5 items-center'>
                <div className='w-1.5 h-1.5 flex items-center justify-center bg-c3 rounded-md'>
                  <UserIcon className='text-c4' size={10} />
                </div>
                <p className='text-[11px] text-c4 font-normal truncate'>{actantName || resourceLabel}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='4xl'
      scrollBehavior='inside'
      classNames={{
        base: 'bg-c1 border-2 border-c3',
        header: 'border-b border-c3',
        body: 'py-4',
        footer: 'border-t border-c3',
      }}>
      <ModalContent>
        <ModalHeader className='flex flex-col gap-px'>
          <h2 className='text-c6 text-xl font-medium'>{title}</h2>
          <p className='text-c4 text-sm font-normal'>
            {localSelectedIds.size} sélectionné(s) sur {filteredResources.length} disponibles
            {maxSelection && ` (max: ${maxSelection})`}
          </p>
        </ModalHeader>

        <ModalBody>
          {/* Onglets par type de ressource */}
          {templateDataList.length > 1 && (
            <div className='mb-4'>
              <Tabs
                aria-label='Types de ressources'
                selectedKey={activeTab}
                onSelectionChange={(key) => setActiveTab(String(key))}
                classNames={{
                  tabList: 'bg-c2 border-2 border-c3 rounded-xl p-px gap-px',
                  cursor: 'bg-action rounded-lg',
                  tab: 'px-4 py-2 text-c5 data-[selected=true]:text-white',
                  tabContent: 'group-data-[selected=true]:text-white',
                }}>
                <Tab
                  key='all'
                  title={
                    <div className='flex items-center gap-2'>
                      <span>Tous</span>
                      <span className='text-xs bg-c3 group-data-[selected=true]:bg-white/20 px-2 py-0.5 rounded-full'>{resources?.length || 0}</span>
                    </div>
                  }
                />
                {templateDataList.map((template) => (
                  <Tab
                    key={String(template.templateId)}
                    title={
                      <div className='flex items-center gap-2'>
                        <span>{template.templateLabel}</span>
                        <span className='text-xs bg-c3 group-data-[selected=true]:bg-white/20 px-2 py-0.5 rounded-full'>{template.resources.length}</span>
                      </div>
                    }
                  />
                ))}
              </Tabs>
            </div>
          )}

          {/* Search and Sort */}
          <div className='flex flex-col sm:flex-row gap-3 mb-4'>
            <Input
              classNames={{
                mainWrapper: 'flex-1',
                input: 'text-c6 text-base',
                inputWrapper: 'bg-c3 border-2 border-c3 hover:bg-c4 hover:border-c4 rounded-lg min-h-[40px]',
              }}
              placeholder='Rechercher...'
              startContent={<SearchIcon size={16} className='text-c5' />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              type='search'
              isClearable
              onClear={() => setSearchTerm('')}
            />

            <Dropdown
              classNames={{
                content:
                  'shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] cursor-pointer bg-c2 rounded-xl border-2 border-c3 min-w-[140px]',
              }}>
              <DropdownTrigger>
                <Button
                  startContent={<SortIcon size={16} className='text-c6' />}
                  className='px-4 min-h-[40px] bg-c3 border-2 border-c3 hover:bg-c4 hover:border-c4 rounded-lg text-c6 font-medium'>
                  Trier
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label='Sort order selection'
                variant='flat'
                disallowEmptySelection
                selectedKeys={new Set([sortOrder])}
                onSelectionChange={handleSortOrderChange}
                selectionMode='single'
                className='p-2'
                classNames={{
                  base: 'bg-transparent shadow-none border-0',
                  list: 'bg-transparent',
                }}>
                <DropdownItem
                  key='asc'
                  className='cursor-pointer text-c6 rounded-lg py-2 px-3 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3'>
                  A - Z
                </DropdownItem>
                <DropdownItem
                  key='desc'
                  className='cursor-pointer text-c6 rounded-lg py-2 px-3 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3'>
                  Z - A
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>

            {multiSelect && (
              <div className='flex gap-2'>
                <Button
                  size='md'
                  onPress={() => {
                    // Sélectionner uniquement les ressources de l'onglet actif
                    const allIds = new Set(filteredResources.map((r) => getResourceId(r)));
                    setLocalSelectedIds((prev) => new Set([...prev, ...allIds]));
                  }}
                  className='bg-c3 border-2 border-c3 text-c6 hover:bg-c4 hover:border-c4 rounded-lg px-4 min-h-[40px] font-medium'>
                  Tout sélectionner
                </Button>
                <Button
                  size='md'
                  onPress={() => setLocalSelectedIds(new Set())}
                  className='bg-c3 border-2 border-c3 text-c6 hover:bg-c4 hover:border-c4 rounded-lg px-4 min-h-[40px] font-medium'>
                  Tout désélectionner
                </Button>
              </div>
            )}
          </div>

          {/* Selected chips */}
          {localSelectedIds.size > 0 && (
            <div className='flex flex-wrap gap-2 mb-4 p-3 bg-c2 rounded-lg border-2 border-c3'>
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
                      base: 'bg-c6 text-white px-2 py-px rounded-lg',
                      content: 'text-white font-medium px-3',
                      closeButton: 'text-white/70 hover:text-white',
                    }}>
                    {truncate(getDisplayValue(resource), 30)}
                  </Chip>
                );
              })}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className='flex justify-center items-center py-12'>
              <Spinner size='lg' />
              <span className='ml-3 text-c5'>Chargement...</span>
            </div>
          )}

          {/* Resource grid ou liste alphabétique */}
          {!loading && (
            <>
              {filteredResources.length === 0 ? (
                <div className='text-center py-12'>
                  <ThumbnailIcon className='text-c4/30 mx-auto mb-3' size={40} />
                  <p className='text-c5 text-sm'>Aucun résultat trouvé</p>
                </div>
              ) : displayMode === 'alphabetic' ? (
                // Affichage alphabétique pour les mots-clés
                <div className='max-h-[450px] overflow-y-auto pr-px'>
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
                                    size='sm'
                                    classNames={{
                                      wrapper: 'w-1.5 h-1.5 before:border-c4 before:border-2 after:bg-action',
                                      icon: 'w-3 h-3',
                                    }}
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
                </div>
              ) : (
                // Affichage en grille standard
                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[450px] overflow-y-auto pr-px'>
                  {filteredResources.map((resource) => (
                    <ResourceCard key={String(getResourceId(resource))} resource={resource} />
                  ))}
                </div>
              )}
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <Button onPress={onClose} className='bg-c3 border-2 border-c3 text-c6 hover:bg-c4 hover:border-c4 rounded-lg px-6 min-h-[40px] font-medium'>
            Annuler
          </Button>
          <Button onPress={handleConfirm} className='bg-action hover:bg-action/80 text-c6 rounded-lg px-6 min-h-[40px] font-medium' isDisabled={localSelectedIds.size === 0}>
            Confirmer ({localSelectedIds.size})
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ResourcePicker;
