import { ViewOption, SmartRecommendationsStrategy } from './config';
import { ItemsList, SimpleTextBlock, ToolItemData } from './components';
import { Bibliographies } from '@/components/features/conference/BibliographyCards';
import { Mediagraphies } from '@/components/features/conference/MediagraphyCards';
import { ReferenceAddButtons } from '@/components/features/forms/AddResourceCard';
import { FormTextInput, FormAutoResizeTextareaInput, formFieldLabelClass } from '@/components/features/forms/FormFields';
import { getResourceConfigByTemplateId, getRessourceLabel } from '@/config/resourceConfig';
import { getResourceLinkHref } from '@/lib/resourceUtils';
import { getLinkedResourceId } from '@/pages/generic/resourceHelpers';

/**
 * Helpers pour créer des viewOptions communes facilement
 *
 * Au lieu de copier-coller le même code, utilisez ces fonctions!
 */

// ========================================
// createItemsListView - Vue avec une liste d'items
// ========================================

interface CreateItemsListViewOptions {
  key: string;
  title: string;
  getItems: (itemDetails: any) => ToolItemData[];
  mapUrl?: (item: ToolItemData) => string;
  resourceLabel?: string; // Label pour le bouton "Ajouter [label]"
  resourceTemplateId?: number; // Template ID pour créer une nouvelle ressource
  editable?: boolean; // Si cette vue est éditable (default: true)
}

export const createItemsListView = (options: CreateItemsListViewOptions): ViewOption => {
  return {
    key: options.key,
    title: options.title,
    resourceLabel: options.resourceLabel,
    resourceTemplateId: options.resourceTemplateId,
    editable: options.editable !== false,
    renderContent: ({ itemDetails, isEditing, onLinkExisting, onRemoveItem, onNavigate }) => {
      let items = options.getItems(itemDetails);
      // Normaliser pour s'assurer que c'est toujours un tableau
      if (!items) {
        items = [];
      } else if (!Array.isArray(items)) {
        items = [items];
      }

      // En mode édition, formData (clé = options.key) fait autorité sur la liste affichée
      if (isEditing && itemDetails[options.key] !== undefined && Array.isArray(itemDetails[options.key])) {
        const formDataItems = itemDetails[options.key];
        const formIds = new Set(formDataItems.map((item: any) => String(getLinkedResourceId(item))));
        items = items.filter((item: ToolItemData) => formIds.has(String(getLinkedResourceId(item) ?? item.id)));
        const existingIds = new Set(items.map((r: ToolItemData) => String(getLinkedResourceId(r) ?? r.id)));
        const newItems = formDataItems.filter((item: any) => {
          const itemId = getLinkedResourceId(item);
          return itemId && !existingIds.has(String(itemId));
        });
        if (newItems.length > 0) {
          items = [...items, ...newItems];
        }
      }

      return (
        <ItemsList
          items={items}
          mapUrl={options.mapUrl}
          isEditing={isEditing && options.editable !== false}
          resourceLabel={options.resourceLabel || options.title}
          onAdd={onLinkExisting ? () => onLinkExisting(options.key) : undefined}
          onRemoveItem={onRemoveItem ? (id) => onRemoveItem(options.key, id) : undefined}
          onNavigate={onNavigate}
        />
      );
    },
  };
};

// ========================================
// createTextView - Vue avec du texte simple
// ========================================

interface CreateTextViewOptions {
  key: string;
  title: string;
  getText: (itemDetails: any) => string | undefined;
  emptyMessage?: string;
  editable?: boolean;
  dataPath?: string; // Chemin Omeka S pour la modification
  placeholder?: string;
}

export const createTextView = (options: CreateTextViewOptions): ViewOption => {
  return {
    key: options.key,
    title: options.title,
    editable: options.editable !== false,
    renderContent: ({ itemDetails, isEditing, onItemsChange, formData }) => {
      // En mode édition, utiliser formData si disponible, sinon itemDetails
      const textFromData = options.getText(itemDetails);
      const text = formData?.[options.key] !== undefined ? formData[options.key] : textFromData;

      // Mode édition
      if (isEditing && options.editable !== false) {
        return (
          <div className='w-full'>
            <textarea
              className='w-full min-h-[150px] p-5 bg-c1 border-2 border-c3 rounded-xl text-c6 text-base resize-y focus:outline-none focus:border-action'
              value={text || ''}
              onChange={(e) => onItemsChange?.(options.key, [{ value: e.target.value, dataPath: options.dataPath }])}
              placeholder={options.placeholder || options.emptyMessage || 'Saisissez du contenu...'}
            />
          </div>
        );
      }

      // Mode affichage
      if (!text || text.trim() === '') {
        return (
          <div className='p-5 bg-c2 rounded-xl border-2 border-c3 text-center'>
            <p className='text-c4 text-sm'>{options.emptyMessage || 'Aucun contenu disponible'}</p>
          </div>
        );
      }

      return <SimpleTextBlock content={text} />;
    },
  };
};

// ========================================
// createFormFieldsView - Vue avec champs de formulaire automatiques
// ========================================

import { FormFieldConfig } from './config';

interface CreateFormFieldsViewOptions {
  key: string;
  title: string;
  fields: FormFieldConfig[]; // Champs à afficher dans cette vue
  emptyMessage?: string; // Message si aucune donnée en mode lecture
}

/**
 * Crée une vue qui génère automatiquement les inputs en mode édition
 * basée sur la config des formFields.
 *
 * En mode lecture, affiche les valeurs des champs.
 * En mode édition, affiche les inputs correspondants.
 */
export const createFormFieldsView = (options: CreateFormFieldsViewOptions): ViewOption => {
  return {
    key: options.key,
    title: options.title,
    editable: true,
    renderContent: ({ itemDetails, isEditing, onItemsChange, formData }) => {
      // Mode édition : afficher les inputs
      if (isEditing) {
        return (
          <div className='flex flex-col gap-12 items-start w-full'>
            {options.fields.map((field) => {
              const value = formData?.[field.key] ?? itemDetails?.[field.key] ?? '';

              if (field.type === 'slider') {
                return (
                  <div key={field.key} className='w-full'>
                    <div className='flex justify-between items-center'>
                      <span className={formFieldLabelClass}>
                        {field.label}
                        {field.required && <span className='text-danger ml-px'>*</span>}
                      </span>
                      <span className='text-c6 font-semibold'>{value || 0}%</span>
                    </div>
                    <input
                      type='range'
                      className='w-full mt-2.5 accent-action'
                      value={value || field.min || 0}
                      onChange={(e) => onItemsChange?.(field.key, Number(e.target.value))}
                      min={field.min || 0}
                      max={field.max || 100}
                      step={field.step || 1}
                    />
                  </div>
                );
              }

              return (
                <div key={field.key} className='w-full'>
                  {renderFormField(field, value, (newValue) => onItemsChange?.(field.key, newValue))}
                </div>
              );
            })}
          </div>
        );
      }

      // Mode lecture : afficher les valeurs
      const fieldsWithValues = options.fields
        .map((field) => ({
          label: field.label,
          value: itemDetails?.[field.key] ?? '',
        }))
        .filter((item) => item.value);

      if (fieldsWithValues.length === 0) {
        return <div className='p-5 bg-c2 rounded-xl border-2 border-c3 text-c4 text-center'>{options.emptyMessage || 'Aucune donnée disponible'}</div>;
      }

      return (
        <div className='flex flex-col gap-2.5'>
          {fieldsWithValues.map((item) => (
            <div key={item.label} className='flex flex-col gap-2.5'>
              <div className='text-c6 font-medium text-sm'>{item.label}</div>
              <div className='bg-c1 rounded-lg p-4 border-2 border-c3'>
                <p className='text-c5 text-sm leading-[125%]'>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      );
    },
  };
};

/**
 * Render un champ de formulaire selon son type
 */
const renderFormField = (field: FormFieldConfig, value: any, onChange: (value: any) => void): JSX.Element => {
  const stringValue = value ?? '';

  switch (field.type) {
    case 'textarea':
      return (
        <FormAutoResizeTextareaInput
          label={field.label}
          value={stringValue}
          onChange={onChange}
          placeholder={field.placeholder}
          isRequired={field.required}
        />
      );

    case 'url':
      return (
        <FormTextInput
          label={field.label}
          type='url'
          value={stringValue}
          onChange={onChange}
          placeholder={field.placeholder}
          isRequired={field.required}
        />
      );

    case 'number':
      return (
        <FormTextInput
          label={field.label}
          type='number'
          value={String(stringValue)}
          onChange={onChange}
          placeholder={field.placeholder}
          isRequired={field.required}
        />
      );

    case 'date':
      return (
        <FormTextInput
          label={field.label}
          type='date'
          value={stringValue}
          onChange={onChange}
          isRequired={field.required}
        />
      );

    case 'text':
    default:
      return (
        <FormTextInput
          label={field.label}
          value={stringValue}
          onChange={onChange}
          placeholder={field.placeholder}
          isRequired={field.required}
        />
      );
  }
};

// ========================================
// Helpers prédéfinis pour cas courants
// ========================================

/**
 * Vue pour les références scientifiques
 * @param options Options de configuration (resourceTemplateIds pour les bibliographies/médiagraphies)
 */
export const createScientificReferencesView = (options?: { resourceTemplateIds?: number[]; editable?: boolean }): ViewOption => {
  // Template IDs par défaut pour bibliographies/médiagraphies : 81, 99, 98, 83
  const defaultTemplateIds = [81, 99, 98, 83];

  return {
    key: 'ContentScient',
    title: 'Contenus scientifiques',
    editable: options?.editable !== false,
    resourceTemplateIds: options?.resourceTemplateIds || defaultTemplateIds,
    renderContent: ({ itemDetails, loading, isEditing, onLinkExisting }) => {
      let references = itemDetails?.referencesScient || itemDetails?.references || [];

      // En mode édition, vérifier aussi les ressources ajoutées via formData
      if (isEditing && itemDetails['ContentScient'] && Array.isArray(itemDetails['ContentScient'])) {
        const formDataItems = itemDetails['ContentScient'];
        const existingIds = references.map((r: any) => r.id || r['o:id']);
        const newRefs = formDataItems.filter((item: any) => {
          const itemId = item.id || item['o:id'];
          return itemId && !existingIds.includes(itemId);
        });
        if (newRefs.length > 0) {
          references = [...references, ...newRefs];
        }
      }

      // Filtrage mutuellement exclusif : d'abord les médiagraphies, puis le reste en bibliographies
      const mediagraphies = references.filter((ref: any) => ref?.type === 'mediagraphie' || ref?.mediagraphyType);
      const bibliographies = references
        .filter((ref: any) => {
          // Exclure les médiagraphies déjà filtrées
          const isMediagraphie = ref?.type === 'mediagraphie' || ref?.mediagraphyType;
          const isBibliographie = ref?.type === 'bibliographie' || ref?.template || ref?.resource_template_id;
          return !isMediagraphie && isBibliographie;
        })
        .map((ref: any) => ({
          ...ref,
          id: parseInt(ref.id) || ref.id, // Convertir id en number si c'est une string
          creator: Array.isArray(ref.creator) && ref.creator.length > 0 && typeof ref.creator[0] === 'object' ? ref.creator : [], // Garder le creator tel quel s'il est déjà au bon format, sinon tableau vide
        }));

      const hasContent = mediagraphies.length > 0 || bibliographies.length > 0;
      const canEdit = isEditing && options?.editable !== false;

      // Si aucune référence et pas en mode édition, ne rien afficher du tout
      if (!hasContent && !canEdit) {
        return null;
      }

      return (
        <div className='space-y-6'>
          {mediagraphies.length > 0 && (
            <div>
              <h3 className='text-lg text-c5 font-medium mb-4'>Médias</h3>
              <Mediagraphies items={mediagraphies} notitle />
            </div>
          )}
          {bibliographies.length > 0 && (
            <div>
              <h3 className='text-lg text-c5 font-medium mb-4'>Bibliographies</h3>
              <Bibliographies sections={[{ title: 'Bibliographies', bibliographies }]} loading={loading} notitle />
            </div>
          )}

          {canEdit && (
            <ReferenceAddButtons
              viewKey='ContentScient'
              templateIds={options?.resourceTemplateIds || defaultTemplateIds}
              onLinkExisting={onLinkExisting}
            />
          )}
        </div>
      );
    },
  };
};

/**
 * Vue pour les références culturelles
 * @param options Options de configuration (resourceTemplateIds pour les bibliographies/médiagraphies)
 */
export const createCulturalReferencesView = (options?: { resourceTemplateIds?: number[]; editable?: boolean }): ViewOption => {
  // Template IDs par défaut pour bibliographies/médiagraphies : 81, 99, 98, 83
  const defaultTemplateIds = [81, 99, 98, 83];

  return {
    key: 'ContentCultu',
    title: 'Contenus culturels',
    editable: options?.editable !== false,
    resourceTemplateIds: options?.resourceTemplateIds || defaultTemplateIds,
    renderContent: ({ itemDetails, loading, isEditing, onLinkExisting }) => {
      let references = itemDetails?.referencesCultu || itemDetails?.bibliographicCitations || [];

      // En mode édition, vérifier aussi les ressources ajoutées via formData
      if (isEditing && itemDetails['ContentCultu'] && Array.isArray(itemDetails['ContentCultu'])) {
        const formDataItems = itemDetails['ContentCultu'];
        const existingIds = references.map((r: any) => r.id || r['o:id']);
        const newRefs = formDataItems.filter((item: any) => {
          const itemId = item.id || item['o:id'];
          return itemId && !existingIds.includes(itemId);
        });
        if (newRefs.length > 0) {
          references = [...references, ...newRefs];
        }
      }

      // Filtrage mutuellement exclusif : d'abord les médiagraphies, puis le reste en bibliographies
      const mediagraphies = references.filter((ref: any) => ref?.type === 'mediagraphie' || ref?.mediagraphyType);
      const bibliographies = references
        .filter((ref: any) => {
          // Exclure les médiagraphies déjà filtrées
          const isMediagraphie = ref?.type === 'mediagraphie' || ref?.mediagraphyType;
          const isBibliographie = ref?.type === 'bibliographie' || ref?.template || ref?.resource_template_id;
          return !isMediagraphie && isBibliographie;
        })
        .map((ref: any) => ({
          ...ref,
          id: parseInt(ref.id) || ref.id, // Convertir id en number si c'est une string
          creator: Array.isArray(ref.creator) && ref.creator.length > 0 && typeof ref.creator[0] === 'object' ? ref.creator : [], // Garder le creator tel quel s'il est déjà au bon format, sinon tableau vide
        }));

      const hasContent = mediagraphies.length > 0 || bibliographies.length > 0;
      const canEdit = isEditing && options?.editable !== false;

      // Si aucune référence et pas en mode édition, ne rien afficher du tout
      if (!hasContent && !canEdit) {
        return null;
      }

      return (
        <div className='space-y-6'>
          {mediagraphies.length > 0 && (
            <div>
              <h3 className='text-lg text-c5 font-medium mb-4'>Médias</h3>
              <Mediagraphies items={mediagraphies} notitle />
            </div>
          )}
          {bibliographies.length > 0 && (
            <div>
              <h3 className='text-lg text-c5 font-medium mb-4'>Bibliographies</h3>
              <Bibliographies sections={[{ title: 'Bibliographies', bibliographies }]} loading={loading} notitle />
            </div>
          )}

          {canEdit && (
            <ReferenceAddButtons
              viewKey='ContentCultu'
              templateIds={options?.resourceTemplateIds || defaultTemplateIds}
              onLinkExisting={onLinkExisting}
            />
          )}
        </div>
      );
    },
  };
};

/**
 * Vue pour les outils
 */
export const createToolsView = (
  getTools?: (itemDetails: any, viewData?: any) => ToolItemData[],
  mapUrl?: (item: ToolItemData) => string,
  options?: { resourceLabel?: string; resourceTemplateId?: number; editable?: boolean },
): ViewOption => {
  const defaultTemplateId = 114; // Template Omeka S pour les outils
  return {
    key: 'Outils',
    title: 'Outils',
    resourceLabel: options?.resourceLabel || 'un outil',
    resourceTemplateId: options?.resourceTemplateId || defaultTemplateId,
    editable: options?.editable !== false,
    renderContent: ({ itemDetails, viewData, isEditing, onLinkExisting, onRemoveItem, onNavigate }) => {
      let items = getTools ? getTools(itemDetails, viewData) : itemDetails?.tools || [];
      // Normaliser pour s'assurer que c'est toujours un tableau
      if (!items) {
        items = [];
      } else if (!Array.isArray(items)) {
        items = [items];
      }

      // En mode édition, formData['Outils'] fait autorité sur la liste affichée
      if (isEditing && itemDetails['Outils'] !== undefined && Array.isArray(itemDetails['Outils'])) {
        const formDataItems = itemDetails['Outils'];
        const formIds = new Set(formDataItems.map((item: any) => String(getLinkedResourceId(item))));
        items = items.filter((item: ToolItemData) => formIds.has(String(getLinkedResourceId(item) ?? item.id)));
        const existingIds = new Set(items.map((r: ToolItemData) => String(getLinkedResourceId(r) ?? r.id)));
        const newItems = formDataItems.filter((item: any) => {
          const itemId = getLinkedResourceId(item);
          return itemId && !existingIds.has(String(itemId));
        });
        if (newItems.length > 0) {
          items = [...items, ...newItems];
        }
      }

      return (
        <ItemsList
          items={items}
          mapUrl={mapUrl}
          isEditing={isEditing && options?.editable !== false}
          resourceLabel={options?.resourceLabel || 'un outil'}
          onAdd={onLinkExisting ? () => onLinkExisting('Outils') : undefined}
          onRemoveItem={onRemoveItem ? (id) => onRemoveItem('Outils', id) : undefined}
          onNavigate={onNavigate}
        />
      );
    },
  };
};

/**
 * Vue pour les archives
 */
export const createArchivesView = (): ViewOption => {
  return createItemsListView({
    key: 'Archives',
    title: 'Archives',
    getItems: (itemDetails) => itemDetails?.archives || [],
  });
};

/**
 * Vue pour les éléments narratifs
 */
export const createNarrativeElementsView = (): ViewOption => {
  return createItemsListView({
    key: 'ElementsNarratifs',
    title: 'Éléments narratifs',
    getItems: (itemDetails) => itemDetails?.elementsNarratifs || [],
    mapUrl: (item) => `/corpus/element-narratif/${item.id}`,
  });
};

/**
 * Vue pour les éléments esthétiques
 */
export const createAestheticElementsView = (): ViewOption => {
  return createItemsListView({
    key: 'ElementsEsthetique',
    title: 'Éléments esthétiques',
    getItems: (itemDetails) => itemDetails?.elementsEsthetique || [],
    mapUrl: (item) => `/corpus/element-esthetique/${item.id}`,
  });
};

/**
 * Vue pour les analyses critiques
 */
export const createCriticalAnalysisView = (): ViewOption => {
  return createItemsListView({
    key: 'AnalyseCritique',
    title: 'Analyses critiques',
    getItems: (itemDetails) => {
      const items = itemDetails?.annotations || itemDetails?.descriptions || itemDetails?.abstract || [];
      return Array.isArray(items) ? items.map((item: any) => ({ ...item, thumbnail: null })) : items;
    },
    mapUrl: (item) => `/corpus/analyse-critique/${item.id}`,
  });
};

/**
 * Vue pour les feedbacks
 */
export const createFeedbacksView = (options?: { resourceTemplateId?: number }): ViewOption => {
  const defaultTemplateId = 110; // Template Omeka S pour les feedbacks
  return createItemsListView({
    key: 'Feedback',
    title: "Retours d'expérience",
    getItems: (itemDetails) => itemDetails?.feedbacks || [],
    mapUrl: (item) => `/corpus/retour-experience/${item.id}`,
    resourceLabel: "un retour d'expérience",
    resourceTemplateId: options?.resourceTemplateId || defaultTemplateId,
    editable: true,
  });
};

/**
 * Vue pour une hypothèse/abstract
 */
export const createHypothesisView = (options?: { editable?: boolean; dataPath?: string }): ViewOption => {
  return createTextView({
    key: 'Hypothese',
    title: 'Hypothèse à expérimenter',
    getText: (itemDetails) => itemDetails?.abstract,
    editable: options?.editable !== false,
    dataPath: options?.dataPath || 'dcterms:abstract.0.@value',
    placeholder: "Décrivez l'hypothèse à expérimenter...",
  });
};

/**
 * Vue pour une description/analyse
 */
export const createAnalysisView = (): ViewOption => {
  return createTextView({
    key: 'Analyse',
    title: 'Analyse',
    getText: (itemDetails) => itemDetails?.description || itemDetails?.abstract,
  });
};

/**
 * Ensemble complet pour une page Oeuvre
 */
export const createOeuvreViews = (): ViewOption[] => {
  return [createCriticalAnalysisView(), createScientificReferencesView(), createCulturalReferencesView(), createNarrativeElementsView(), createAestheticElementsView()];
};

/**
 * Ensemble complet pour une page Experimentation
 */
export const createExperimentationViews = (toolsGetter?: (itemDetails: any, viewData?: any) => ToolItemData[], toolsMapUrl?: (item: ToolItemData) => string): ViewOption[] => {
  return [createHypothesisView(), createFeedbacksView(), createScientificReferencesView(), createCulturalReferencesView(), createToolsView(toolsGetter, toolsMapUrl)];
};

// ========================================
// Smart Recommendations System
// ========================================

/**
 * Calcule la similarité entre deux items basée sur leurs keywords
 */
const calculateKeywordSimilarity = (item1: any, item2: any): number => {
  const keywords1 = new Set((item1.keywords || []).map((k: any) => (typeof k === 'string' ? k : k.id || k.title)).filter(Boolean));
  const keywords2 = new Set((item2.keywords || []).map((k: any) => (typeof k === 'string' ? k : k.id || k.title)).filter(Boolean));

  if (keywords1.size === 0 && keywords2.size === 0) return 0;

  // Intersection des keywords
  const intersection = new Set([...keywords1].filter((x) => keywords2.has(x)));
  const union = new Set([...keywords1, ...keywords2]);

  return intersection.size / union.size; // Jaccard similarity
};

/**
 * Calcule la similarité par défaut entre deux items
 * Combine plusieurs critères: keywords, type, date, etc.
 */
export const defaultSimilarityCalculator = (item1: any, item2: any): number => {
  let score = 0;
  let factors = 0;

  // 1. Similarité des keywords (poids: 0.5)
  const keywordSimilarity = calculateKeywordSimilarity(item1, item2);
  score += keywordSimilarity * 0.5;
  factors += 0.5;

  // 2. Même type/catégorie (poids: 0.2)
  if (item1.type && item2.type && item1.type === item2.type) {
    score += 0.2;
  }
  factors += 0.2;

  // 3. Même actant/auteur (poids: 0.15)
  const actant1 = item1.primaryActant?.id || item1.actant?.id;
  const actant2 = item2.primaryActant?.id || item2.actant?.id;
  if (actant1 && actant2 && String(actant1) === String(actant2)) {
    score += 0.15;
  }
  factors += 0.15;

  // 4. Date proche (poids: 0.15)
  if (item1.date && item2.date) {
    try {
      const date1 = new Date(item1.date).getTime();
      const date2 = new Date(item2.date).getTime();
      const daysDiff = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);

      // Plus les dates sont proches, plus le score est élevé
      // Score maximal si < 30 jours, décroissance jusqu'à 365 jours
      const dateScore = Math.max(0, 1 - daysDiff / 365);
      score += dateScore * 0.15;
    } catch (e) {
      // Ignore les erreurs de parsing de date
    }
  }
  factors += 0.15;

  return factors > 0 ? score / factors : 0;
};

/**
 * Génère des recommandations intelligentes basées sur:
 * 1. Les éléments liés (même contexte parent)
 * 2. Les éléments similaires (même type avec keywords similaires)
 */
export const generateSmartRecommendations = async (itemDetails: any, strategy: SmartRecommendationsStrategy): Promise<any[]> => {
  const maxRecommendations = strategy.maxRecommendations || 5;
  const recommendations: any[] = [];

  // 1. Récupérer les éléments liés (priorité haute)
  if (strategy.getRelatedItems) {
    const relatedItemsResult = strategy.getRelatedItems(itemDetails);

    // Support pour retour synchrone ou asynchrone
    const relatedItems = relatedItemsResult instanceof Promise ? await relatedItemsResult : relatedItemsResult;

    // Filtrer l'item actuel
    const filteredRelated = relatedItems.filter((item: any) => String(item.id) !== String(itemDetails.id));

    recommendations.push(...filteredRelated);
  }

  // 2. Si pas assez de recommandations, chercher des items similaires
  if (recommendations.length < maxRecommendations && strategy.getAllResourcesOfType) {
    const allResources = await strategy.getAllResourcesOfType();

    // Filtrer l'item actuel et ceux déjà dans les recommandations
    const existingIds = new Set([String(itemDetails.id), ...recommendations.map((r) => String(r.id))]);

    const candidates = allResources.filter((item: any) => !existingIds.has(String(item.id)));

    // Calculer la similarité avec chaque candidat
    const similarityCalculator = strategy.calculateSimilarity || defaultSimilarityCalculator;

    const scored = candidates.map((item: any) => ({
      item,
      score: similarityCalculator(itemDetails, item),
    }));

    // Trier par score décroissant et prendre les meilleurs
    scored.sort((a, b) => b.score - a.score);

    const needed = maxRecommendations - recommendations.length;
    const similarItems = scored.slice(0, needed).map((s) => s.item);

    recommendations.push(...similarItems);
  }

  return recommendations.slice(0, maxRecommendations);
};

// helpers.ts - Section Target Mapper (à ajouter à votre fichier existant)

// ========================================
// Target Mapper Configuration
// ========================================
// NOTE: Cette configuration est maintenant centralisée dans @/config/resourceTypes.ts

// ========================================
// Helper pour créer une vue Target
// ========================================

/**
 * Crée une vue pour afficher le target d'une annotation de manière dynamique
 * Utilise le composant ItemsList existant pour l'affichage
 */
export const createTargetView = (options?: { key?: string; title?: string; getTargets?: (itemDetails: any) => any }): ViewOption => {
  return {
    key: options?.key || 'target',
    title: options?.title || 'Contenus annotés',

    renderContent: ({ itemDetails }) => {
      const targets = options?.getTargets ? options.getTargets(itemDetails) : itemDetails?.target;

      // Support pour les tableaux (nouveau format) et objets simples (ancien format)
      const targetArray = Array.isArray(targets) ? targets : targets ? [targets] : [];
      const firstTarget = targetArray[0];

      if (!firstTarget) {
        return null;
      }

      // Utiliser le renderer spécial si disponible, sinon le rendu par défaut
      const renderer = TARGET_COMPONENT_MAP[firstTarget.type] || renderDefaultTarget;

      return (
        <div className='space-y-4'>
          <div>
            <span className='inline-block py-px text-xs font-medium text-c5 rounded-full'>{getRessourceLabel(firstTarget.type)}</span>
          </div>

          {renderer(firstTarget)}
        </div>
      );
    },
  };
};

// Mapping type -> rendu du composant métier correct
// Note: Certains types (bibliographie, mediagraphie) ont des composants spéciaux
const TARGET_COMPONENT_MAP: Record<string, (target: any) => JSX.Element> = {
  bibliographie: (t) => <Bibliographies bibliographies={[t]} loading={false} notitle />,
  mediagraphie: (t) => <Mediagraphies items={[t]} notitle />,
};

/**
 * Rendu par défaut pour un target utilisant ItemsList
 */
const renderDefaultTarget = (target: any) => {
  const url = getResourceLinkHref(target) ?? '#';
  return <ItemsList items={[target]} mapUrl={() => url} />;
};

/**
 * Crée une vue pour afficher plusieurs targets (si l'annotation en a plusieurs)
 */
export const createTargetsListView = (options?: { key?: string; title?: string; emptyMessage?: string; getTargets?: (itemDetails: any) => any }): ViewOption => {
  return {
    key: options?.key || 'targets',
    title: options?.title || 'Ressources liées',
    renderContent: ({ itemDetails }) => {
      let targets = options?.getTargets ? options.getTargets(itemDetails) : itemDetails?.targets || [itemDetails?.target].filter(Boolean);

      // Normaliser pour s'assurer que c'est toujours un tableau
      if (!targets) {
        targets = [];
      } else if (!Array.isArray(targets)) {
        // Si c'est un objet unique, le mettre dans un tableau
        targets = [targets];
      }

      // Aplatir les tableaux imbriqués (cas où un target est lui-même un tableau)
      const flattenTargets = (items: any[]): any[] => {
        return items.reduce((acc, item) => {
          if (Array.isArray(item)) {
            return [...acc, ...flattenTargets(item)];
          }
          return [...acc, item];
        }, []);
      };

      // Filtrer les valeurs null, undefined et autres valeurs falsy
      targets = flattenTargets(targets);
      targets = targets.filter((target: any) => target !== null && target !== undefined && target !== '');

      if (!targets || targets.length === 0) {
        return null;
      }

      // Grouper les targets par type pour un affichage organisé
      const targetsByType: Record<string, { typeInfo: any; items: any[] }> = targets.reduce((acc: Record<string, { typeInfo: any; items: any[] }>, target: any) => {
        // Si c'est une URL externe (juste uri + title, sans id), créer un type spécial
        if (target.uri && !target.id && !target.template_id && !target.resource_template_id) {
          const externalLinkType = 'Liens externes';
          if (!acc[externalLinkType]) {
            acc[externalLinkType] = {
              typeInfo: {
                type: externalLinkType,
                getUrl: (item: any) => item.uri,
              },
              items: [],
            };
          }
          acc[externalLinkType].items.push(target);
          return acc;
        }

        // Si l'objet a un type défini mais pas de template_id (ex: objets déjà enrichis)
        if (target.type && target.id && !target.template_id && !target.resource_template_id) {
          const label = getRessourceLabel(target.type);

          if (!acc[label]) {
            acc[label] = {
              typeInfo: {
                type: label,
                getUrl: (item: any) => getResourceLinkHref(item) ?? '#',
              },
              items: [],
            };
          }
          acc[label].items.push(target);
          return acc;
        }

        // Ignorer les targets sans template_id et sans type
        if (!target || (!target.template_id && !target.resource_template_id)) return acc;

        const templateId = target.template_id || target.resource_template_id;
        const resourceConfig = getResourceConfigByTemplateId(templateId);

        if (!resourceConfig) {
          // Pour le debug, créons une config temporaire pour les template_id inconnus
          const unknownType = `Type inconnu (${templateId})`;
          if (!acc[unknownType]) {
            acc[unknownType] = {
              typeInfo: {
                type: unknownType,
                getUrl: (item: any) => item.url || item.uri || '#',
              },
              items: [],
            };
          }
          acc[unknownType].items.push(target);
          return acc;
        }

        const label = resourceConfig.label;
        if (!acc[label]) {
          acc[label] = {
            typeInfo: {
              type: label,
              getUrl: (item: any) => getResourceLinkHref(item) ?? item.url ?? item.uri ?? '#',
            },
            items: [],
          };
        }
        acc[label].items.push(target);
        return acc;
      }, {});


      return (
        <div className='space-y-8'>
          {Object.entries(targetsByType).map(([typeName, { typeInfo, items }]) => {
            return (
              <div key={typeName} className='space-y-3'>
                <h3 className='text-lg font-medium text-c5 flex items-center gap-2'>
                  <span className='inline-block  py-px text-xs font-medium bg-blue-100 text-blue-800 rounded-full'>{typeName}</span>
                </h3>
                <ItemsList items={items} mapUrl={(item) => (typeInfo.getUrl ? typeInfo.getUrl(item) : item.url || item.uri || '#')} />
              </div>
            );
          })}
        </div>
      );
    },
  };
};
