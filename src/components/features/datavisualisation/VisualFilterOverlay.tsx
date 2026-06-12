import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input, Divider, Breadcrumbs, BreadcrumbItem, Alert } from '@heroui/react';
import { FilterGroup, FilterCondition, ITEM_TYPES, ITEM_PROPERTIES, storeSearchHistory } from './FilterPopup';
import { CrossIcon, AddIcon, SearchIcon } from '@/components/ui/icons';
import { ChevronLeft } from 'lucide-react';

// Types disponibles avec leurs images et labels
export const VISUAL_TYPES = [
  { key: 'actant', label: 'Actants', image: '/bulle-actant.png' },
  { key: 'colloque', label: 'Colloques', image: '/bulle-conference.png' },
  { key: 'seminaire', label: 'Séminaires', image: '/bulle-conference.png' },
  { key: 'journee_etudes', label: 'Journées d\'étude', image: '/bulle-conference.png' },
  { key: 'citation', label: 'Citations', image: '/bulle-citation.png' },
  { key: 'keyword', label: 'Mots-clés', image: '/bulle-keyword.png' },
  { key: 'bibliography', label: 'Bibliographies', image: '/bulle-bibliography.png' },
  { key: 'mediagraphie', label: 'Médiagraphies', image: '/bulle-mediagraphie.png' },
  { key: 'university', label: 'Universités', image: '/bulle-university.png' },
  { key: 'collection', label: 'Collections', image: '/bulle-collection.png' },
  { key: 'laboratory', label: 'Laboratoires', image: '/bulle-university.png' },
  { key: 'doctoralschool', label: 'Écoles doctorales', image: '/bulle-university.png' },
];

// Suggestions prédéfinies
const QUICK_SUGGESTIONS = [
  {
    label: 'Actants liés à "trucage"',
    groups: [
      {
        name: 'Mots clés liés à "trucage"',
        isExpanded: true,
        itemType: 'keyword',
        conditions: [{ property: 'title', operator: 'contains', value: 'trucage' }],
        visibleTypes: Object.values(ITEM_TYPES),
      },
    ],
  },
  {
    label: 'Colloques sur "art trompeur"',
    groups: [
      {
        name: 'Colloques liés à "art trompeur"',
        isExpanded: false,
        itemType: 'colloque',
        conditions: [{ property: 'mot-clé', operator: 'contains', value: 'art trompeur' }],
        visibleTypes: Object.values(ITEM_TYPES),
      },
    ],
  },
  {
    label: 'Mots-clés de "Renée Bourassa"',
    groups: [
      {
        name: 'Mots-clés liés à "Renée Bourassa"',
        isExpanded: false,
        itemType: 'keyword',
        conditions: [{ property: 'lié à', operator: 'contains', value: 'Renée Bourassa' }],
        visibleTypes: Object.values(ITEM_TYPES),
      },
    ],
  },
];

interface NavigationState {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

export interface OverlayState {
  step: Step;
  selectedType: string | null;
  searchValue: string;
  importedGroups?: FilterGroup[];
}

interface VisualFilterOverlayProps {
  onSelect: (groups: FilterGroup[]) => void;
  renderBreadcrumb?: (breadcrumb: React.ReactNode) => void;
  onNavigationChange?: (nav: NavigationState) => void;
  initialState?: OverlayState;
  onStateChange?: (state: OverlayState) => void;
}

type Step = 'type' | 'search' | 'advanced';

export default function VisualFilterOverlay({ onSelect, renderBreadcrumb, onNavigationChange, initialState, onStateChange }: VisualFilterOverlayProps) {
  const [currentStep, setCurrentStep] = useState<Step>(initialState?.step || 'type');
  const [selectedType, setSelectedType] = useState<string | null>(initialState?.selectedType || null);
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [searchValue, setSearchValue] = useState(initialState?.searchValue || '');

  // Notifier le parent des changements d'état
  useEffect(() => {
    if (onStateChange) {
      onStateChange({ step: currentStep, selectedType, searchValue });
    }
  }, [currentStep, selectedType, searchValue, onStateChange]);

  // État pour les groupes importés (filtrage avancé multi-groupes)
  const [importedGroups, setImportedGroups] = useState<FilterGroup[]>([]);

  // Synchroniser avec initialState quand il change (pour restaurer l'état)
  useEffect(() => {
    if (initialState) {
      console.log('VisualFilterOverlay initialState:', initialState);
      setCurrentStep(initialState.step);
      setSelectedType(initialState.selectedType);
      setSearchValue(initialState.searchValue);

      // Si on a des groupes importés (mode filtrage avancé)
      if (initialState.importedGroups && initialState.importedGroups.length > 0) {
        console.log('Imported groups:', initialState.importedGroups);
        setImportedGroups(initialState.importedGroups);
        // Extraire les conditions du premier groupe pour l'affichage
        const firstGroup = initialState.importedGroups[0];
        console.log('First group conditions:', firstGroup.conditions);
        if (firstGroup.conditions && firstGroup.conditions.length > 0) {
          // Copier les conditions pour éviter les mutations
          setConditions([...firstGroup.conditions]);
        }
        if (firstGroup.itemType) {
          setSelectedType(firstGroup.itemType);
        }
      } else if (initialState.selectedType) {
        const props = ITEM_PROPERTIES[initialState.selectedType] || [];
        if (props.length > 0) {
          setConditions([{ property: props[0].key, operator: 'contains', value: initialState.searchValue }]);
        }
      }
    }
  }, [initialState]);

  // Fonctions de navigation
  const canGoBack = currentStep !== 'type';
  const canGoForward = currentStep === 'search';

  const handleGoBack = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev === 'advanced') {
        return 'search';
      } else if (prev === 'search') {
        setSelectedType(null);
        setSearchValue('');
        return 'type';
      }
      return prev;
    });
  }, []);

  const handleGoForward = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev === 'search') {
        return 'advanced';
      }
      return prev;
    });
  }, []);

  // Notifier le parent des changements de navigation
  useEffect(() => {
    if (onNavigationChange) {
      onNavigationChange({
        canGoBack,
        canGoForward,
        onBack: handleGoBack,
        onForward: handleGoForward,
      });
    }
  }, [canGoBack, canGoForward, handleGoBack, handleGoForward, onNavigationChange]);

  // Mettre à jour le breadcrumb dans le header parent
  useEffect(() => {
    if (renderBreadcrumb) {
      renderBreadcrumb(
        <Breadcrumbs underline='hover' size='sm'>
          <BreadcrumbItem>
            <button onClick={() => goToStep('type')} className='text-c4 hover:text-c6 transition-colors'>
              Recherche
            </button>
          </BreadcrumbItem>
          {selectedType && (
            <BreadcrumbItem isCurrent={currentStep === 'search' && !searchValue.trim()}>
              {currentStep === 'search' || currentStep === 'advanced' ? (
                <button onClick={() => goToStep('search')} className='text-c4 hover:text-c6 transition-colors'>
                  {VISUAL_TYPES.find((t) => t.key === selectedType)?.label}
                </button>
              ) : (
                <span className='text-c6'>{VISUAL_TYPES.find((t) => t.key === selectedType)?.label}</span>
              )}
            </BreadcrumbItem>
          )}
          {searchValue.trim() && currentStep === 'search' && (
            <BreadcrumbItem isCurrent>
              <span className='text-c6'>"{searchValue}"</span>
            </BreadcrumbItem>
          )}
          {currentStep === 'advanced' && (
            <BreadcrumbItem isCurrent>
              <span className='text-c6'>Filtrage avancé</span>
            </BreadcrumbItem>
          )}
        </Breadcrumbs>,
      );
    }
  }, [currentStep, selectedType, searchValue, renderBreadcrumb]);

  const getPropertiesForType = (type: string) => {
    return ITEM_PROPERTIES[type] || [];
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    const props = getPropertiesForType(type);
    if (props.length > 0) {
      setConditions([{ property: props[0].key, operator: 'contains', value: '' }]);
    }
    setCurrentStep('search');
  };

  const addCondition = () => {
    if (!selectedType) return;
    const props = getPropertiesForType(selectedType);
    setConditions((prev) => [...prev, { property: props[0]?.key || '', operator: 'contains', value: '' }]);
  };

  const updateCondition = (index: number, field: keyof FilterCondition, value: string) => {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const removeCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSearch = () => {
    // Si on a des groupes importés, les utiliser avec les conditions mises à jour
    if (importedGroups.length > 0) {
      // Mettre à jour les conditions du premier groupe avec les conditions éditées
      const updatedGroups = importedGroups.map((group, index) => {
        if (index === 0) {
          return {
            ...group,
            conditions: conditions.filter((c) => c.value.trim() !== ''),
          };
        }
        return group;
      });
      storeSearchHistory(updatedGroups);
      onSelect(updatedGroups);
      return;
    }

    if (!selectedType) return;
    const filterGroups: FilterGroup[] = [
      {
        name: `Recherche ${VISUAL_TYPES.find((t) => t.key === selectedType)?.label}`,
        isExpanded: true,
        itemType: selectedType,
        conditions: conditions.filter((c) => c.value.trim() !== ''),
        visibleTypes: Object.values(ITEM_TYPES), // Tous les types visibles par défaut
      },
    ];
    storeSearchHistory(filterGroups);
    onSelect(filterGroups);
  };

  const handleQuickSearch = () => {
    if (!selectedType || !searchValue.trim()) return;
    const props = getPropertiesForType(selectedType);
    const mainProperty = props[0]?.key || 'title';
    const filterGroups: FilterGroup[] = [
      {
        name: `${VISUAL_TYPES.find((t) => t.key === selectedType)?.label}: "${searchValue}"`,
        isExpanded: true,
        itemType: selectedType,
        conditions: [{ property: mainProperty, operator: 'contains', value: searchValue }],
        visibleTypes: Object.values(ITEM_TYPES),
      },
    ];
    storeSearchHistory(filterGroups);
    onSelect(filterGroups);
  };

  // Recherche sans condition (tous les éléments du type)
  const handleSearchAll = () => {
    if (!selectedType) return;
    const filterGroups: FilterGroup[] = [
      {
        name: `Tous les ${VISUAL_TYPES.find((t) => t.key === selectedType)?.label.toLowerCase()}`,
        isExpanded: true,
        itemType: selectedType,
        conditions: [],
        visibleTypes: Object.values(ITEM_TYPES),
      },
    ];
    storeSearchHistory(filterGroups);
    onSelect(filterGroups);
  };

  const goToStep = (step: Step) => {
    if (step === 'type') {
      setSelectedType(null);
      setConditions([]);
      setSearchValue('');
    }
    setCurrentStep(step);
  };

  const handleReset = () => {
    goToStep('type');
  };

  return (
    <div className='absolute z-[9] inset-0 bg-c1 flex flex-col items-center justify-center p-5 overflow-y-auto'>

      <div className='w-full max-w-3xl flex flex-col gap-5'>
        <Alert
          color="warning"
          description="Cette section fait actuellement l’objet d’une restructuration technique. Des ralentissements ou dysfonctionnements temporaires peuvent survenir."
          variant="faded"
        />
        <AnimatePresence mode='wait'>
          {/* Step 1: Type Selection */}
          {currentStep === 'type' && (
            <motion.div
              key='type-step'
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className='flex flex-col gap-5'>
              {/* Titre */}
              <div className='text-center'>
                <h1 className='text-2xl text-c6 font-medium mb-1.5'>Que recherchez-vous ?</h1>
                <p className='text-sm text-c4'>Sélectionnez un type d'élément pour commencer</p>
              </div>

              {/* Grille de types - carrés */}
              <div className='grid grid-cols-5 gap-2.5'>
                {VISUAL_TYPES.map((type) => (
                  <motion.button
                    key={type.key}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleTypeSelect(type.key)}
                    className='aspect-square flex flex-col items-center justify-center gap-8 p-2.5 rounded-xl border-2 border-c3 bg-c2 hover:bg-c3 hover:border-c4 transition-all duration-200 cursor-pointer group'>
                    <div className='w-10 h-10 flex items-center justify-center'>
                      <img src={type.image} alt={type.label} className='w-full h-full object-contain group-hover:scale-110 transition-transform duration-200' />
                    </div>
                    <span className='text-xs text-c6 font-medium text-center leading-tight'>{type.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* Suggestions */}
              <div className='flex flex-col gap-2.5'>
                <Divider className='bg-c3' />
                <p className='text-sm text-c4 text-center'>Ou essayez une recherche suggérée</p>
                <div className='flex flex-wrap justify-center gap-6'>
                  {QUICK_SUGGESTIONS.map((suggestion, index) => (
                    <Button key={index} size='sm' variant='bordered' className='border-c3 text-c6 hover:bg-c3 text-xs' onPress={() => onSelect(suggestion.groups)}>
                      {suggestion.label}
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Search */}
          {currentStep === 'search' && (
            <motion.div
              key='search-step'
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className='flex flex-col gap-5'>
              {/* Titre avec type sélectionné */}
              <div className='text-center'>
                <div className='flex items-center justify-center gap-2.5 mb-1.5'>
                  <img src={VISUAL_TYPES.find((t) => t.key === selectedType)?.image} alt='' className='w-32 h-32 object-contain' />
                  <h1 className='text-2xl text-c6 font-medium'>{VISUAL_TYPES.find((t) => t.key === selectedType)?.label}</h1>
                </div>
                <p className='text-sm text-c4'>Recherchez ou explorez tous les éléments</p>
              </div>

              {/* Recherche rapide */}
              <div className='bg-c2 border-2 border-c3 rounded-lg p-4'>
                <p className='text-sm text-c6 font-medium mb-2.5'>Recherche</p>
                <div className='flex gap-8'>
                  <Input
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder={`Rechercher dans ${VISUAL_TYPES.find((t) => t.key === selectedType)?.label.toLowerCase()}...`}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuickSearch()}
                    size='sm'
                    classNames={{
                      inputWrapper: 'bg-c1 border-2 border-c3 hover:bg-c1 group-data-[focus=true]:bg-c1 h-[36px]',
                      input: 'text-c6 text-sm',
                    }}
                  />
                  <Button size='sm' color='primary' className='bg-action text-selected h-[36px] px-4' onPress={handleQuickSearch} isDisabled={!searchValue.trim()}>
                    <SearchIcon size={14} />
                    Rechercher
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className='flex justify-center gap-2.5'>
                <Button size='sm' variant='light' className='text-c4 hover:text-c6' onPress={handleReset} startContent={<ChevronLeft size={14} />}>
                  Changer de type
                </Button>
                <Button size='sm' variant='bordered' className='border-c3 text-c6 hover:bg-c3' onPress={handleSearchAll}>
                  Afficher tout
                </Button>
                <Button size='sm' variant='bordered' className='border-c3 text-c6 hover:bg-c3' onPress={() => setCurrentStep('advanced')}>
                  <AddIcon size={12} />
                  Filtrage avancé
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Advanced Conditions */}
          {currentStep === 'advanced' && (
            <motion.div
              key='advanced-step'
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className='flex flex-col gap-4'>
              {/* Titre */}
              <div className='text-center'>
                <h1 className='text-2xl text-c6 font-medium mb-1.5'>Filtrage avancé</h1>
                <p className='text-sm text-c4'>Ajoutez des conditions pour affiner votre recherche</p>
              </div>

              {/* Conditions */}
              <div className='bg-c2 border-2 border-c3 rounded-lg p-4'>
                <div className='flex items-center justify-between mb-2.5'>
                  <p className='text-sm text-c6 font-medium'>Conditions</p>
                  <Button size='sm' variant='light' className='text-c6 h-[28px]' onPress={addCondition}>
                    <AddIcon size={12} />
                    Ajouter
                  </Button>
                </div>

                <div className='flex flex-col gap-8'>
                  {conditions.map((condition, index) => (
                    <div key={index} className='flex items-center gap-6 p-8 bg-c3 rounded-md'>
                      <select
                        value={condition.property}
                        onChange={(e) => updateCondition(index, 'property', e.target.value)}
                        className='flex-1 h-[32px] px-8 rounded-md bg-c2 border-2 border-c3 text-xs text-c6 outline-none focus:border-c4'>
                        {getPropertiesForType(selectedType || '').map((prop: any) => (
                          <option key={prop.key} value={prop.key}>
                            {prop.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                        className='h-[32px] px-8 rounded-md bg-c2 border-2 border-c3 text-xs text-c6 outline-none focus:border-c4'>
                        <option value='contains'>Contient</option>
                        <option value='notEquals'>Différent de</option>
                      </select>

                      <Input
                        value={condition.value}
                        onChange={(e) => updateCondition(index, 'value', e.target.value)}
                        placeholder='Valeur...'
                        size='sm'
                        classNames={{
                          mainWrapper: 'flex-1',
                          inputWrapper: 'bg-c2 border-2 border-c3 h-[32px]',
                          input: 'text-c6 text-xs',
                        }}
                      />

                      <Button size='sm' isIconOnly variant='light' className='text-c4 hover:text-c6 min-w-[32px] w-[32px] h-[32px]' onPress={() => removeCondition(index)}>
                        <CrossIcon size={12} />
                      </Button>
                    </div>
                  ))}

                  {conditions.length === 0 && <p className='text-xs text-c4 text-center py-2.5'>Aucune condition. Cliquez sur "Ajouter" pour filtrer les résultats.</p>}
                </div>
              </div>

              {/* Actions */}
              <div className='flex justify-center gap-8'>
                <Button size='sm' variant='bordered' className='border-c3 text-c6 hover:bg-c3' onPress={() => setCurrentStep('search')}>
                  Retour
                </Button>
                <Button size='sm' color='primary' className='bg-action text-selected' onPress={handleSearch}>
                  <SearchIcon size={14} />
                  Lancer la recherche
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
