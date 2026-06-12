import { useState, useEffect } from 'react';
import {
  Button,
  Link,
  Divider,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
  Select,
  SelectItem,
} from '@heroui/react';
import { ArrowIcon, CrossIcon, AddIcon, DotsIcon } from '@/components/ui/icons';
import { getItemByID } from '@/services/api';

const generateSearchTitle = (filterGroups: any[]): string => {
  // Si aucun groupe de filtres, retourner un titre par défaut
  if (!filterGroups || filterGroups.length === 0) {
    return 'Recherche sans filtre';
  }

  const titles: string[] = [];

  // Parcourir chaque groupe de filtres
  for (const group of filterGroups) {
    if (!group.itemType) continue;

    // Récupérer le type d'élément en français
    const itemTypeLabel =
      Object.entries(ITEM_TYPES).find(([, value]) => value === group.itemType)?.[0] || group.itemType;

    // Créer une description des conditions
    if (group.conditions && group.conditions.length > 0) {
      const validConditions = group.conditions.filter((c: any) => c.property && c.value);

      if (validConditions.length > 0) {
        const firstCondition = validConditions[0];

        // Créer un titre basé sur la première condition
        const conditionText = `${itemTypeLabel} - ${firstCondition.property}: ${firstCondition.value}`;

        // Ajouter une indication s'il y a plus de conditions
        const title = validConditions.length > 1 ? `${conditionText} (+${validConditions.length - 1})` : conditionText;

        titles.push(title);
      } else {
        titles.push(`Tous les ${itemTypeLabel}`);
      }
    } else {
      titles.push(`Tous les ${itemTypeLabel}`);
    }
  }

  // Si nous avons plusieurs groupes, créer un titre combiné
  if (titles.length > 1) {
    return `${titles[0]} et plus`;
  } else if (titles.length === 1) {
    return titles[0];
  } else {
    return 'Recherche personnalisée';
  }
};

export const storeSearchHistory = (filterGroups: any[], nodePositions?: NodePosition[]) => {
  try {
    // Récupérer l'historique existant ou initialiser un nouveau tableau
    const existingHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');

    // Limiter l'historique aux 10 dernières recherches
    if (existingHistory.length >= 10) {
      existingHistory.pop(); // Supprimer la plus ancienne recherche
    }

    // Générer un titre pour la recherche
    const searchTitle = generateSearchTitle(filterGroups);

    // Créer un nouvel enregistrement d'historique
    const newHistoryItem = {
      id: Date.now(), // Identifiant unique basé sur le timestamp
      title: searchTitle,
      timestamp: new Date().toISOString(),
      filters: filterGroups, // Stocker les filtres pour pouvoir les réutiliser
      nodePositions: nodePositions || [], // Stocker les positions des nodes
    };

    // Ajouter la nouvelle recherche au début de l'historique
    existingHistory.unshift(newHistoryItem);

    // Mettre à jour le localStorage
    localStorage.setItem('searchHistory', JSON.stringify(existingHistory));

    return newHistoryItem;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de l'historique de recherche:", error);
    return null;
  }
};

export const ITEM_PROPERTIES: any = {
  actant: [
    { key: 'firstname', label: 'Prénom' },
    { key: 'lastname', label: 'Nom' },
    {
      key: 'laboratories',
      label: 'Laboratoire',
      transform: (labs: any[]) => labs.map((lab) => lab.title).join(', '),
    },
    {
      key: 'doctoralSchools',
      label: 'Ecole doctorale',
      transform: (schools: any[]) => schools.map((school) => school.title).join(', '),
    },
    {
      key: 'universities',
      label: 'Université',
      transform: (universities: any[]) => universities.map((uni) => uni.title).join(', '),
    },
  ],
  colloque: [
    { key: 'title', label: 'Nom' },
    {
      key: 'actant',
      label: 'Actant',
      transform: async (id: any) => {
        const item = await getItemByID(id);
        return item?.title || 'Inconnu';
      },
    },
    {
      key: 'motcles',
      label: 'Mot clé',
      transform: async (ids: any) => {
        const titles = await Promise.all(
          ids.map(async (id: any) => {
            const item = await getItemByID(id);
            return item?.title || 'Inconnu';
          }),
        );
        return titles.join(', ');
      },
    },
    { key: 'date', label: 'Date' },
  ],
  seminaire: [
    { key: 'title', label: 'Nom' },
    {
      key: 'actant',
      label: 'Actant',
      transform: async (id: any) => {
        const item = await getItemByID(id);
        return item?.title || 'Inconnu';
      },
    },
    {
      key: 'motcles',
      label: 'Mot clé',
      transform: async (ids: any) => {
        const titles = await Promise.all(
          ids.map(async (id: any) => {
            const item = await getItemByID(id);
            return item?.title || 'Inconnu';
          }),
        );
        return titles.join(', ');
      },
    },
    { key: 'date', label: 'Date' },
  ],
  journee_etudes: [
    { key: 'title', label: 'Nom' },
    {
      key: 'actant',
      label: 'Actant',
      transform: async (id: any) => {
        const item = await getItemByID(id);
        return item?.title || 'Inconnu';
      },
    },
    {
      key: 'motcles',
      label: 'Mot clé',
      transform: async (ids: any) => {
        const titles = await Promise.all(
          ids.map(async (id: any) => {
            const item = await getItemByID(id);
            return item?.title || 'Inconnu';
          }),
        );
        return titles.join(', ');
      },
    },
    { key: 'date', label: 'Date' },
  ],
  citation: [
    { key: 'citation', label: 'Citation' },
    {
      key: 'actant',
      label: 'Actant',
      transform: async (id: any) => {
        const item = await getItemByID(id);
        return item?.title || 'Inconnu';
      },
    },
    {
      key: 'motcles',
      label: 'Mot clé',
      transform: async (ids: any) => {
        const titles = await Promise.all(
          ids.map(async (id: any) => {
            const item = await getItemByID(id);
            return item?.title || 'Inconnu';
          }),
        );
        return titles.join(', ');
      },
    },
  ],
  collection: [{ key: 'title', label: 'Nom' }],
  keyword: [
    { key: 'title', label: 'Mot Clé' },
    { key: 'definition', label: 'Définition' },
  ],
  university: [
    { key: 'title', label: 'Nom' },
    { key: 'country', label: 'Pays' },
  ],
  doctoralschool: [{ key: 'title', label: 'Nom' }],
  laboratory: [{ key: 'title', label: 'Nom' }],
  bibliography: [{ key: 'title', label: 'Titre' }],
  mediagraphie: [{ key: 'title', label: 'Titre' }],
};

export const ITEM_TYPES = {
  citations: 'citation',
  colloques: 'colloque',
  séminaires: 'seminaire',
  'journées d\'étude': 'journee_etudes',
  actants: 'actant',
  'mots clés': 'keyword',
  bibliographies: 'bibliography',
  médiagraphies: 'mediagraphie',
  collections: 'collection',
  universités: 'university',
  laboratoires: 'laboratory',
  'écoles doctorales': 'doctoralschool',
};

const OPERATORS = [
  { key: 'contains', label: 'Contient' },
  { key: 'notEquals', label: 'Différent de' },
];

export interface FilterPopupProps {
  onSearch: (typesearch: FilterGroup[]) => void;
}

export type GroupVisibility = {
  groupId: string;
  groupName: string;
  baseType: string;
  visibleTypes: string[];
};

export type FilterCondition = {
  property: string;
  operator: string;
  value: string;
};

export type FilterGroup = {
  name: string;
  isExpanded: boolean;
  itemType: string;
  conditions: FilterCondition[];
  visibleTypes: string[];
};

// Position sauvegardée d'un node
export type NodePosition = {
  id: string | number;
  x: number;
  y: number;
  fx: number | null;
  fy: number | null;
};

const STORAGE_KEY = 'filterGroups';

const getInitialFilterGroups = (): FilterGroup[] => {
  const savedFilters = localStorage.getItem(STORAGE_KEY);
  if (savedFilters) {
    try {
      return JSON.parse(savedFilters);
    } catch (e) {
      console.error('Error parsing saved filters:', e);
    }
  }
  return [
    {
      name: 'Groupe 1',
      isExpanded: true,
      itemType: '',
      conditions: [],
      visibleTypes: [],
    },
  ];
};

const saveFilterGroups = (filterGroups: FilterGroup[]): boolean => {
  try {
    // Convertir les groupes de filtres en chaîne JSON
    const filterGroupsJson = JSON.stringify(filterGroups);

    // Sauvegarder dans le localStorage
    localStorage.setItem(STORAGE_KEY, filterGroupsJson);

    return true;
  } catch (error) {
    // Gérer les erreurs possibles (quota dépassé, mode privé, etc.)
    console.error('Erreur lors de la sauvegarde des filtres:', error);
    return false;
  }
};

export const compareValues = async (itemValue: any, searchValue: any, operator: string): Promise<boolean> => {
  if (itemValue === null || itemValue === undefined || searchValue === null || searchValue === undefined) {
    return false;
  }

  const prepareValue = (value: any): string => {
    if (typeof value === 'string') {
      return value.toLowerCase().trim();
    }
    return String(value).toLowerCase().trim();
  };

  const normalizedSearchValue = prepareValue(searchValue);
  const normalizedItemValue = prepareValue(itemValue);

  let result;
  switch (operator) {
    case 'contains':
      result = normalizedItemValue.includes(normalizedSearchValue);
      break;
    case 'notEquals':
      result = normalizedItemValue !== normalizedSearchValue;
      break;
    default:
      result = false;
  }

  return result;
};

export const getDataByType = async (type: string): Promise<any[]> => {
  switch (type) {
    // case 'conference':
    // case 'seminaire':
    // case 'journee_etudes':
    // case 'colloque':
    //   const confs = (await Items.getAllConfs()) || [];
    //   // Filtrer par le type spécifique demandé
    //   return confs.filter((conf: any) => conf.type === type);
    // case 'actant':
    //   return (await Items.getActants()) || [];
    // case 'keyword':
    //   return (await Items.getKeywords()) || [];
    // case 'bibliography':
    //   return (await Items.getBibliographies()) || [];
    // case 'mediagraphie':
    //   return (await Items.getMediagraphies()) || [];
    // case 'collection':
    //   return (await Items.getCollections()) || [];
    // case 'university':
    //   return (await Items.getUniversities()) || [];
    // case 'laboratory':
    //   return (await Items.getLaboratories()) || [];
    // case 'doctoralschool':
    //   return (await Items.getDoctoralSchools()) || [];
    default:
      return [];
  }
};

export const getPropertyValue = async (item: any, property: string): Promise<any> => {
  if (property in item) {
    const value = item[property];
    const propertyConfig = ITEM_PROPERTIES[item.type]?.find((p: any) => p.key === property);
    if (propertyConfig?.transform) {
      const transformed = await propertyConfig.transform(value);
      return transformed;
    }

    return value;
  }

  const propertyConfig = ITEM_PROPERTIES[item.type]?.find((p: any) => p.key === property);

  if (!propertyConfig) return null;

  if (propertyConfig.transform) {
    try {
      const transformed = await propertyConfig.transform(item[property]);
      return transformed;
    } catch (error) {
      return null;
    }
  }

  return null;
};

export default function FilterPopup({ onSearch }: FilterPopupProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>(getInitialFilterGroups());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filterGroups));
  }, [filterGroups]);

  const getPropertiesByType = (type: any): any => {
    return ITEM_PROPERTIES[type] || [];
  };

  const addGroup = () => {
    setFilterGroups((prev) => [
      ...prev,
      {
        name: `Groupe ${prev.length + 1}`,
        isExpanded: true,
        itemType: '',
        conditions: [],
        visibleTypes: [], // Initialiser avec tous les types visibles
      },
    ]);
  };

  const removeGroup = (groupIndex: number) => {
    setFilterGroups((prev) => prev.filter((_, i) => i !== groupIndex));
  };

  const duplicateGroup = (index: number) => {
    setFilterGroups((prev) => {
      const groupToDuplicate = prev[index];
      return [
        ...prev,
        {
          ...groupToDuplicate,
          name: `${groupToDuplicate.name} (copie)`,
          visibleTypes: Object.values(ITEM_TYPES), // Copie des types visibles
        },
      ];
    });
  };

  const toggleGroupExpansion = (groupIndex: number) => {
    setFilterGroups((prev) =>
      prev.map((group, i) => (i === groupIndex ? { ...group, isExpanded: !group.isExpanded } : group)),
    );
  };

  const addCondition = (groupIndex: number) => {
    setFilterGroups((prev) =>
      prev.map((group, i) => {
        if (i !== groupIndex) return group;
        return {
          ...group,
          conditions: [
            ...group.conditions,
            {
              property: '',
              operator: 'contains',
              value: '',
            },
          ],
        };
      }),
    );
  };

  const removeCondition = (groupIndex: number, conditionIndex: number) => {
    setFilterGroups((prev) =>
      prev.map((group, i) => {
        if (i !== groupIndex) return group;
        return {
          ...group,
          conditions: group.conditions.filter((_, j) => j !== conditionIndex),
        };
      }),
    );
  };

  const updateCondition = (groupIndex: number, conditionIndex: number, field: keyof FilterCondition, value: string) => {
    setFilterGroups((prev) =>
      prev.map((group, i) => {
        if (i !== groupIndex) return group;
        return {
          ...group,
          conditions: group.conditions.map((condition, j) => {
            if (j !== conditionIndex) return condition;
            return { ...condition, [field]: value };
          }),
        };
      }),
    );
  };

  const updateGroupType = (groupIndex: number, itemType: string) => {
    setFilterGroups((prev) =>
      prev.map((group, i) => {
        if (i !== groupIndex) return group;

        // S'assurer que le nouveau itemType est inclus dans visibleTypes
        const updatedVisibleTypes = [...new Set([...group.visibleTypes, itemType])];

        return {
          ...group,
          itemType,
          visibleTypes: updatedVisibleTypes,
          conditions: [
            {
              property: getPropertiesByType(itemType)[0]?.key || '', // Prend la première propriété par défaut
              operator: 'contains', // Opérateur par défaut
              value: '', // Valeur vide
            },
          ],
        };
      }),
    );
  };

  const applyFilters = async () => {
    onSearch(filterGroups);
    saveFilterGroups(filterGroups);
    storeSearchHistory(filterGroups);
  };

  const resetFilters = () => {
    setFilterGroups([
      {
        name: 'Recherche 1',
        isExpanded: true,
        itemType: '',
        conditions: [
          {
            property: '',
            operator: 'contains',
            value: '',
          },
        ],
        visibleTypes: [], // Initialiser avec tous les types visibles
      },
    ]);
  };

  return (
    <div className='w-full flex flex-col gap-4 h-full overflow-hidden'>
      <div className='flex flex-col gap-4'>
        <Link
          onClick={addGroup}
          underline='none'
          size={'sm'}
          className='text-sm flex justify-start w-full gap-2 rounded-none text-c6 bg-transparent cursor-pointer'>
          <AddIcon size={12} />
          Ajouter un groupe de filtres
        </Link>
        <Divider />
      </div>

      <div className='flex flex-col flex-1 gap-3 overflow-y-auto'>
        {filterGroups.map((group, groupIndex) => (
          <div key={groupIndex} className='border rounded-lg gap-4 p-4 bg-c3 rounded-xl'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Button
                  className='text-c6 bg-transparent px-0.5 py-0.5 h-auto'
                  onClick={() => toggleGroupExpansion(groupIndex)}>
                  <ArrowIcon
                    size={12}
                    className={`transition-all duration-200 ${group.isExpanded ? 'rotate-90' : ''}`}
                  />
                </Button>
                <span className='text-sm font-medium text-c6'>{group.name}</span>
              </div>

              <Dropdown
                className='min-w-0 w-fit'
                classNames={{
                  content:
                    'shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] cursor-pointer bg-c2 rounded-xl border-2 border-c3 min-w-[8rem]',
                }}>
                <DropdownTrigger>
                  <Button className='text-c6 bg-transparent px-0.5 py-0.5 h-auto'>
                    <DotsIcon size={14} className='text-c6' />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  className='p-2 w-32 text-c6'
                  classNames={{ base: 'bg-transparent shadow-none border-0', list: 'bg-transparent' }}>
                  <DropdownItem
                    className='cursor-pointer rounded-lg py-2 px-3 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3'
                    onPress={() => {
                      setActiveGroupIndex(groupIndex);
                      setNewGroupName(group.name);
                      onOpen();
                    }}
                    key='rename'>
                    Renommer
                  </DropdownItem>
                  <DropdownItem
                    className='cursor-pointer rounded-lg py-2 px-3 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3'
                    onPress={() => duplicateGroup(groupIndex)}
                    key='duplicate'>
                    Dupliquer
                  </DropdownItem>
                  <DropdownItem
                    className='cursor-pointer rounded-lg py-2 px-3 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3'
                    onPress={() => removeGroup(groupIndex)}
                    key='remove'>
                    Supprimer
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>

            {group.isExpanded && (
              <div className='flex flex-col gap-4 mt-4'>
                <div className='w-full flex gap-2 items-center'>
                  <p className='text-sm font-medium text-c6'>Ou</p>
                  <Dropdown
                    className='min-w-0 w-full'
                    classNames={{
                      content:
                        'shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] cursor-pointer bg-c2 rounded-xl border-2 border-c3',
                    }}>
                    <DropdownTrigger className='min-w-0 w-full'>
                      <Button className='h-auto text-sm text-extralight text-c6 px-2 py-1.5 flex justify-between gap-2.5 bg-transparent border-1.5 border-c4 rounded-lg w-full'>
                        {group.itemType
                          ? Object.entries(ITEM_TYPES).find(([, value]) => value === group.itemType)?.[0]
                          : "Sélectionner un type d'item"}
                        <ArrowIcon size={12} />
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                      className='p-2 w-full'
                      classNames={{ base: 'bg-transparent shadow-none border-0', list: 'bg-transparent' }}
                      selectionMode='single'
                      selectedKeys={group.itemType ? [group.itemType] : []}
                      onSelectionChange={(keys) => {
                        const type = Array.from(keys)[0] as string;
                        updateGroupType(groupIndex, type);
                      }}>
                      {Object.entries(ITEM_TYPES).map(([label, value]) => (
                        <DropdownItem
                          className='min-w-0 w-full text-c4 cursor-pointer rounded-lg py-2 px-3 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3'
                          key={value}>
                          {label}
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </Dropdown>
                </div>

                <div className=' flex flex-col gap-4'>
                  <Select
                    selectionMode='multiple'
                    labelPlacement='outside-left'
                    label='Visibilité'
                    placeholder='Sélectionnez les types visibles'
                    selectedKeys={
                      new Set([
                        ...group.visibleTypes.filter((type) => type !== group.itemType), // Exclure itemType de l'affichage
                        ...(group.itemType ? [group.itemType] : []), // Mais toujours l'inclure dans la sélection
                      ])
                    }
                    onSelectionChange={(selection) => {
                      const selectedTypes = Array.from(selection).map((key) => String(key));
                      // S'assurer que itemType est toujours inclus dans visibleTypes
                      const visibleTypes = group.itemType
                        ? [...new Set([...selectedTypes, group.itemType])]
                        : selectedTypes;

                      setFilterGroups((prev) =>
                        prev.map((group, i) => (i === groupIndex ? { ...group, visibleTypes } : group)),
                      );
                    }}
                    variant='bordered'
                    className='w-full'
                    classNames={{ trigger: 'rounded-lg h-[34px] border-1 border-c4', selectorIcon: 'text-c6' }}>
                    {Object.entries(ITEM_TYPES)
                      .filter(([, type]) => type !== group.itemType) // Filtrer le type sélectionné dans le dropdown
                      .map(([label, type]) => (
                        <SelectItem classNames={{ selectedIcon: 'text-c6' }} key={type} textValue={type}>
                          <div className='flex items-center gap-2'>
                            <img src={`/bulle-${type}.png`} alt={label} className='w-6 h-6' />
                            <span className='text-c6'>{label.charAt(0).toUpperCase() + label.slice(1)}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </Select>
                </div>

                <div className={`flex flex-col gap-2 ${group.conditions.length > 0 ? 'mb-4' : ''}`}>
                  {group.conditions.map((condition, conditionIndex) => (
                    <div key={conditionIndex} className='flex items-center gap-2'>
                      <Dropdown
                        className='min-w-0 w-fit'
                        classNames={{
                          content:
                            'shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] cursor-pointer bg-c2 rounded-xl border-2 border-c3',
                        }}>
                        <DropdownTrigger>
                          <Button className='h-auto text-sm text-extralight text-c6 px-2 py-1.5 flex gap-2.5 justify-between bg-transparent border-1.5 border-c4 rounded-lg min-w-[118px]'>
                            {(() => {
                              const props = getPropertiesByType(group.itemType);
                              const selectedKey = condition.property || props[0]?.key;

                              const label = props.find((prop: any) => prop.key === selectedKey)?.label || 'Propriété';
                              return label.length > 11 ? `${label.slice(0, 9)}...` : label;
                            })()}
                            <ArrowIcon size={12} />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                          className='p-2'
                          classNames={{ base: 'bg-transparent shadow-none border-0', list: 'bg-transparent' }}
                          selectionMode='single'
                          selectedKeys={[condition.property || getPropertiesByType(group.itemType)[0]?.key]}
                          onSelectionChange={(keys) => {
                            const prop = Array.from(keys)[0] as string;
                            updateCondition(groupIndex, conditionIndex, 'property', prop);
                          }}>
                          {getPropertiesByType(group.itemType).map((prop: any) => (
                            <DropdownItem
                              className='min-w-0 text-c4 cursor-pointer rounded-lg py-2 px-3 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3'
                              key={prop.key}>
                              {prop.label}
                            </DropdownItem>
                          ))}
                        </DropdownMenu>
                      </Dropdown>

                      <Dropdown
                        className='min-w-0 w-fit'
                        classNames={{
                          content:
                            'shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] cursor-pointer bg-c2 rounded-xl border-2 border-c3',
                        }}>
                        <DropdownTrigger>
                          <Button className='h-auto text-sm text-extralight text-c6 px-2 py-1.5 flex justify-between gap-2.5 bg-transparent border-1.5 border-c4 rounded-lg min-w-[110px]'>
                            {(() => {
                              const label = OPERATORS.find((op) => op.key === condition.operator)?.label || 'Opérateur';
                              return label.length > 10 ? `${label.slice(0, 8)}...` : label;
                            })()}
                            <ArrowIcon size={12} />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                          className='p-2'
                          classNames={{ base: 'bg-transparent shadow-none border-0', list: 'bg-transparent' }}
                          selectionMode='single'
                          selectedKeys={[condition.operator]}
                          onSelectionChange={(keys) => {
                            const op = Array.from(keys)[0] as string;
                            updateCondition(groupIndex, conditionIndex, 'operator', op);
                          }}>
                          {OPERATORS.map((op) => (
                            <DropdownItem
                              className='min-w-0 text-c4 cursor-pointer rounded-lg py-2 px-3 data-[hover=true]:!bg-c3 data-[selectable=true]:focus:!bg-c3'
                              key={op.key}>
                              {op.label}
                            </DropdownItem>
                          ))}
                        </DropdownMenu>
                      </Dropdown>

                      <Input
                        value={condition.value}
                        onChange={(e) => updateCondition(groupIndex, conditionIndex, 'value', e.target.value)}
                        placeholder='Valeur...'
                        classNames={{
                          mainWrapper: 'h-full',
                          input: 'text-c5 ',
                          inputWrapper:
                            'text-sm shadow-none border-1.5 border-c2 px-2 py-1.5 group-data-[focus=true]:bg-c2 hover:bg-c2 rounded-lg font-normal text-c6 bg-c2 h-full',
                        }}
                      />

                      <Button
                        className='text-c6 bg-transparent h-auto w-12'
                        isIconOnly
                        onClick={() => removeCondition(groupIndex, conditionIndex)}>
                        <CrossIcon size={14} className='text-c6' />
                      </Button>
                    </div>
                  ))}
                </div>

                {group.itemType && (
                  <>
                    {group.conditions.length > 0 && (
                      <Link
                        onClick={() => addCondition(groupIndex)}
                        underline='none'
                        size={'sm'}
                        className='text-sm flex justify-start w-full gap-2 rounded-none text-c6 bg-transparent cursor-pointer'>
                        <AddIcon size={12} />
                        Ajouter une condition
                      </Link>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>Renommer le groupe</ModalHeader>
          <ModalBody className='gap-4'>
            <Input
              classNames={{
                mainWrapper: 'h-full',
                input: 'text-c5 ',
                inputWrapper:
                  'shadow-none bg-c2 border-1 border-100 group-data-[focus=true]:bg-c2 rounded-lg font-normal text-c6 bg-c2 dark:bg-c2 h-full',
              }}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder='Nouveau nom...'
              autoFocus
            />
            <div className='flex justify-end gap-2'>
              <Button className='px-2.5 py-1.5 rounded-lg bg-transparent' variant='flat' onClick={onClose}>
                Annuler
              </Button>
              <Button
                className='px-2.5 py-1.5 rounded-lg bg-action text-selected'
                color='primary'
                onClick={() => {
                  if (activeGroupIndex !== null && newGroupName.trim()) {
                    setFilterGroups((prev) =>
                      prev.map((group, i) =>
                        i === activeGroupIndex ? { ...group, name: newGroupName.trim() } : group,
                      ),
                    );
                    onClose();
                  }
                }}>
                Renommer
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      <div className='flex justify-end gap-2 mt-4'>
        <Button
          className='text-base h-auto px-2.5 py-1.5 rounded-lg text-c6 hover:text-c6 gap-2 bg-c2 hover:bg-c3 transition-all ease-in-out duration-200'
          variant='flat'
          onClick={resetFilters}>
          Réinitialiser
        </Button>
        <Button
          className='text-base h-auto px-2.5 py-1.5 rounded-lg text-selected gap-2 bg-action transition-all ease-in-out duration-200'
          color='primary'
          onClick={applyFilters}>
          Rechercher
        </Button>
      </div>
    </div>
  );
}
