import { ReactNode } from 'react';

/**
 * Résultat du data fetcher
 */
export interface FetchResult {
  itemDetails: any;
  keywords?: any[];
  recommendations?: any[];
  viewData?: Record<string, any>;
}

/**
 * Function pour récupérer les données d'une ressource
 */
export type DataFetcher = (id: string) => Promise<FetchResult>;

/**
 * Callback pour le chargement progressif
 */
export type ProgressCallback = (partial: Partial<FetchResult>) => void;

/**
 * Function pour récupérer les données avec chargement progressif
 * Le callback onProgress est appelé au fur et à mesure que les données sont disponibles
 */
export type ProgressiveDataFetcher = (id: string, onProgress: ProgressCallback) => Promise<FetchResult>;

/**
 * Function pour récupérer les recommandations
 */
export type RecommendationsFetcher = (ids: string[], fetchedData?: any) => Promise<any[]>;

/**
 * Strategy de génération de recommandations intelligentes
 */
export interface SmartRecommendationsStrategy {
  // Récupère toutes les ressources du même type pour trouver des similaires
  getAllResourcesOfType?: () => Promise<any[]>;

  // Récupère les éléments liés (ex: autres analyses critiques d'un objet techno)
  // Peut être synchrone (si données déjà dans itemDetails) ou asynchrone
  getRelatedItems?: (itemDetails: any) => any[] | Promise<any[]>;

  // Récupère le contexte parent (ex: l'objet techno quand on est sur une analyse critique)
  getParentContext?: (itemDetails: any) => Promise<any>;

  // Calcule la similarité entre deux ressources (0-1)
  calculateSimilarity?: (item1: any, item2: any) => number;

  // Nombre max de recommandations à afficher
  maxRecommendations?: number;
}

/**
 * Context passé aux renderContent functions
 */
export interface RenderContentContext {
  itemDetails: any;
  viewData: Record<string, any>;
  loading: boolean;
  loadingViews?: boolean; // Loading spécifique pour les ressources liées dans les vues
  onTimeChange: (newTime: number) => void;
  // Mode édition
  isEditing?: boolean;
  onLinkExisting?: (viewKey: string) => void;
  onCreateNew?: (viewKey: string) => void;
  onEditResource?: (viewKey: string, resourceId: string | number) => void;
  onRemoveItem?: (viewKey: string, itemId: string | number) => void;
  onItemsChange?: (viewKey: string, items: any) => void;
  formData?: Record<string, any>; // Données du formulaire en mode édition
  onNavigate?: (path: string) => void; // Pour déclencher la navigation avec animation
  updatedResources?: Record<string, { title?: string; thumbnail?: string }>; // Titres/thumbnails mis à jour
}

/**
 * Option de vue (tab/dropdown)
 */
export interface ViewOption {
  key: string;
  title: string;
  renderContent: (context: RenderContentContext) => ReactNode;
  // Pour le mode édition
  resourceLabel?: string; // Label pour la carte "Ajouter [label]"
  resourceTemplateId?: number; // Template ID pour créer une nouvelle ressource de ce type
  resourceTemplateIds?: number[]; // Template IDs multiples (pour references avec bibliographies et mediagraphies)
  editable?: boolean; // Si false, cette vue n'est pas éditable (default: true)
  getItemCount?: (itemDetails: any, formData: any) => number; // Compte les items liés pour le résumé
  viewKind?: 'resources' | 'text'; // 'resources' = liste liée avec count, 'text' = champs texte (default: 'resources')
}

/**
 * Configuration complète d'une page générique
 */
export interface GenericDetailPageConfig {
  // Data fetching
  dataFetcher: DataFetcher;
  progressiveDataFetcher?: ProgressiveDataFetcher; // Si fourni, utilisé à la place de dataFetcher
  fetchRecommendations?: RecommendationsFetcher;

  // Smart recommendations (nouvelle approche)
  smartRecommendations?: SmartRecommendationsStrategy;

  // Composants Overview/Details
  overviewComponent: React.ComponentType<any>;
  detailsComponent: React.ComponentType<any>;
  overviewSkeleton?: React.ComponentType<any>;
  detailsSkeleton?: React.ComponentType<any>;

  // Mappers de props
  mapOverviewProps: (itemDetails: any, currentVideoTime: number) => any;
  mapDetailsProps: (itemDetails: any) => any;

  // Mapper pour les recommandations (pour SmConfCard)
  mapRecommendationProps?: (item: any) => any;

  // Options de vue (tabs)
  viewOptions: ViewOption[];
  defaultView?: string; // Clé de l'onglet par défaut (sinon utilise le premier élément de viewOptions)

  // Sections optionnelles
  showKeywords?: boolean;
  showRecommendations?: boolean;
  showComments?: boolean;
  recommendationsTitle?: string;

  // Type à afficher à droite du titre
  type?: string;

  // Form support (optional - enables edit mode)
  formEnabled?: boolean;
  resourceTemplateId?: number; // Omeka S resource template ID for creation
  formFields?: FormFieldConfig[];

  // Mapping viewKey → propriété Omeka S (généré automatiquement depuis les vues)
  viewKeyToProperty?: Record<string, string>;
}

// ============================================
// FORM TYPES - Pour le mode édition/création
// ============================================

/**
 * Mode d'affichage de la page
 */
export type PageMode = 'view' | 'edit' | 'create';

/**
 * Configuration d'un champ de formulaire
 */
export interface FormFieldConfig {
  key: string; // Identifiant unique
  label: string; // Label affiché
  dataPath: string; // Chemin Omeka S (ex: 'dcterms:title.0.@value')
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  min?: number; // Pour les sliders/numbers
  max?: number; // Pour les sliders/numbers
  step?: number; // Pour les sliders/numbers
  selectionConfig?: {
    resourceType: string; // Type de ressource pour ResourcePicker
    templateId?: number; // Template ID Omeka S
    multiple?: boolean;
  };
}

/**
 * Types de champs supportés
 */
export type FormFieldType =
  | 'text' // Input texte simple
  | 'textarea' // Zone de texte multiligne
  | 'selection' // Sélection simple (dropdown)
  | 'multiselection' // Sélection multiple (ResourcePicker)
  | 'date' // Sélection de date
  | 'time' // Sélection d'heure
  | 'media' // Upload de médias
  | 'url' // Input URL
  | 'number' // Input numérique
  | 'slider'; // Slider (0-100)

/**
 * Section de formulaire (overview ou details)
 */
export interface FormSectionConfig {
  key: 'overview' | 'details' | 'keywords' | 'views';
  fields: FormFieldConfig[];
}

/**
 * Configuration d'un onglet dans le FormTabManager
 */
export interface FormTabConfig {
  id: string;
  title: string;
  resourceType: string;
  config: GenericDetailPageConfig;
  mode: PageMode;
  itemId?: string; // Pour mode edit, l'ID de la ressource
  isDirty?: boolean; // Si des modifications non sauvegardées
  parentTabId?: string; // Pour lier à l'onglet parent après création
  linkedField?: string; // Champ à mettre à jour dans le parent
}
